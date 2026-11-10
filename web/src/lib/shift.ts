import type { Change, DayType, Task } from './types';
import { addDays, dow, fmtDate, fromMin, toMin, uid } from './time';

export type Anchor = { date: string; order: number };
export interface ShiftCtx {
  tasks: Task[];
  dayTypeOf: (d: string) => DayType;
  orderFor: (d: string, anchor?: Anchor) => number | undefined;
  anchor: Anchor;
  today: string;
  now: number; // minutes since midnight
  dayEnd: string;
}

export type OverflowChoice = 'extend' | 'skip' | 'keep';
export type ShiftOp =
  | { kind: 'push'; from: string; end: string; overflow: OverflowChoice }
  | { kind: 'pull'; from: string; end: string }
  | { kind: 'swap'; a: string; b: string }
  | { kind: 'dayOrder'; date: string; order: number }
  | { kind: 'holiday'; date: string; then: 'push' | 'skip' | 'move'; moveTo?: string; end: string; overflow: OverflowChoice }
  | { kind: 'times'; date: string; minutes: number; fromNow: boolean }
  | { kind: 'compress'; date: string }
  | { kind: 'reset'; date: string };

export interface ShiftPlan {
  kind: string;
  label: string;
  changes: Change[];
  dayTypes: { date: string; from: DayType; to: DayType }[];
  anchor?: { from: Anchor; to: Anchor };
  orderPreview?: { date: string; before?: number; after?: number }[];
  counts: { moved: number; skipped: number; overflow: number; fixed: number };
  overflowIds: string[];
  daysSkipped: { date: string; type: DayType }[];
  warnings: string[];
  empty: boolean;
}

const PR = { high: 0, med: 1, low: 2 } as const;
const r5 = (n: number) => Math.round(n / 5) * 5;
type Busy = [number, number];

export const OP_LABELS: Record<ShiftOp['kind'], string> = {
  push: 'Push day forward', pull: 'Pull back', swap: 'Swap days', dayOrder: 'Set day order',
  holiday: 'Mark holiday', times: 'Shift times', compress: 'Compress the rest', reset: 'Reset my day',
};

export function planShift(op: ShiftOp, ctx: ShiftCtx): ShiftPlan {
  const over: Record<string, DayType> = {};
  const typeOf = (d: string) => over[d] ?? ctx.dayTypeOf(d);
  const working = (d: string) => { const t = typeOf(d); return (t === 'normal' || t === 'day_order') && dow(d) !== 0; };
  const live = (t: Task) => !t.deletedAt && t.status !== 'moved';
  const movable = (t: Task) => live(t) && !t.fixed && t.status === 'planned' && t.date >= ctx.today;
  const onDay = (d: string) => ctx.tasks.filter((t) => t.date === d && live(t)).sort((a, b) => toMin(a.start) - toMin(b.start));

  const plan: ShiftPlan = { kind: op.kind, label: OP_LABELS[op.kind], changes: [], dayTypes: [], counts: { moved: 0, skipped: 0, overflow: 0, fixed: 0 }, overflowIds: [], daysSkipped: [], warnings: [], empty: false };
  const touched = new Map<string, Change>();
  let collisionTotal = 0;
  const setDay = (date: string, to: DayType) => { const from = ctx.dayTypeOf(date); if (from === to) return; over[date] = to; plan.dayTypes.push({ date, from, to }); };
  const change = (t: Task, after: Partial<Task>) => {
    const prev = touched.get(t.id);
    const before: Partial<Task> = prev ? prev.before : {};
    if (!prev) (Object.keys(after) as (keyof Task)[]).forEach((k) => { (before as Record<string, unknown>)[k] = t[k]; });
    else (Object.keys(after) as (keyof Task)[]).forEach((k) => { if (!(k in before)) (before as Record<string, unknown>)[k] = t[k]; });
    touched.set(t.id, { id: t.id, before, after: { ...(prev?.after ?? {}), ...after } });
  };
  const cur = (t: Task): Task => { const c = touched.get(t.id); return c ? { ...t, ...c.after } : t; };

  /** Move a set of tasks onto a date, resolving overlaps with tasks that stay (fixed / untouched). */
  const land = (movers: Task[], to: string, from?: string) => {
    const staying: Busy[] = ctx.tasks
      .filter((t) => live(t) && t.status !== 'done' && t.status !== 'skipped')
      .map(cur)
      .filter((t) => t.date === to && !movers.some((m) => m.id === t.id))
      .map((t) => [toMin(t.start), toMin(t.start) + t.dur] as Busy);
    let collisions = 0;
    for (const m of [...movers].sort((a, b) => toMin(a.start) - toMin(b.start))) {
      let s = toMin(m.start);
      let guard = 0;
      for (;;) {
        const hit = staying.find(([a, b]) => s < b && s + m.dur > a);
        if (!hit || guard++ > 30) break;
        s = hit[1]; collisions++;
      }
      s = Math.min(s, 1439 - Math.min(m.dur, 60));
      staying.push([s, s + m.dur]);
      change(m, { date: to, start: fromMin(s), source: 'shifted', movedFrom: from ?? m.date });
    }
    collisionTotal += collisions;
  };

  const dayList = (from: string, end: string) => {
    const seq = [from];
    for (let d = addDays(from, 1); d <= end; d = addDays(d, 1)) {
      if (working(d)) seq.push(d);
      else { const t = typeOf(d); if (t !== 'normal' && !(t === 'rest' && dow(d) === 0)) plan.daysSkipped.push({ date: d, type: t }); }
    }
    return seq;
  };
  const nextWorking = (after: string) => { let d = addDays(after, 1); for (let i = 0; i < 30 && !working(d); i++) d = addDays(d, 1); return d; };

  const doPush = (from: string, end: string, overflow: OverflowChoice) => {
    const seq = dayList(from, end);
    // compute movers per day from the ORIGINAL state before any change
    const groups = seq.map((d) => onDay(d).filter(movable));
    plan.counts.fixed += seq.reduce((a, d) => a + onDay(d).filter((t) => t.fixed && t.status !== 'done').length, 0);
    for (let i = seq.length - 1; i >= 0; i--) {
      const movers = groups[i];
      if (!movers.length) continue;
      if (i + 1 < seq.length) land(movers, seq[i + 1], seq[i]);
      else if (overflow === 'extend') { land(movers, nextWorking(seq[i]), seq[i]); plan.overflowIds.push(...movers.map((m) => m.id)); }
      else if (overflow === 'skip') { movers.forEach((m) => change(m, { status: 'skipped', skipReason: 'Overflow after shift' })); plan.overflowIds.push(...movers.map((m) => m.id)); }
      else { plan.overflowIds.push(...movers.map((m) => m.id)); plan.warnings.push(`${movers.length} overflow task(s) stay where they are and may overlap.`); }
    }
    if (plan.overflowIds.length && overflow === 'extend') plan.warnings.push('Plan extended past your end point to keep every task.');
  };

  switch (op.kind) {
    case 'push': doPush(op.from, op.end, op.overflow); break;
    case 'holiday': {
      setDay(op.date, 'holiday');
      const movers = onDay(op.date).filter(movable);
      plan.counts.fixed += onDay(op.date).filter((t) => t.fixed && t.status !== 'done').length;
      if (op.then === 'push') doPush(op.date, op.end, op.overflow);
      else if (op.then === 'skip') movers.forEach((m) => change(m, { status: 'skipped', skipReason: 'Holiday' }));
      else if (op.moveTo) land(movers, op.moveTo, op.date);
      break;
    }
    case 'pull': {
      const seq = dayList(op.from, op.end);
      if (ctx.dayTypeOf(op.from) === 'holiday' || ctx.dayTypeOf(op.from) === 'rest') setDay(op.from, 'normal');
      const groups = seq.map((d) => onDay(d).filter(movable));
      for (let i = 1; i < seq.length; i++) if (groups[i].length) land(groups[i], seq[i - 1], seq[i]);
      break;
    }
    case 'swap': {
      const a = onDay(op.a).filter(movable), b = onDay(op.b).filter(movable);
      land(a, op.b, op.a); land(b, op.a, op.b);
      break;
    }
    case 'dayOrder': {
      const to: Anchor = { date: op.date, order: op.order };
      plan.anchor = { from: ctx.anchor, to };
      const days: string[] = [];
      for (let d = op.date, n = 0; n < 8 && days.length < 8; d = addDays(d, 1), n++) if (working(d)) days.push(d);
      plan.orderPreview = days.map((d) => ({ date: d, before: ctx.orderFor(d), after: ctx.orderFor(d, to) }));
      if (ctx.dayTypeOf(op.date) === 'normal') setDay(op.date, 'day_order');
      plan.warnings.push('Classes swap in place. Your personal tasks stay put; study blocks flagged "around classes" re-fit into free gaps.');
      break;
    }
    case 'times': {
      const from = op.fromNow ? ctx.now : 0;
      const movers = onDay(op.date).filter((t) => movable(t) && toMin(t.start) + t.dur > from);
      const fixedBusy: Busy[] = onDay(op.date).filter((t) => t.fixed).map((t) => [toMin(t.start), toMin(t.start) + t.dur]);
      let coll = 0;
      for (const m of movers) {
        let s = Math.max(0, Math.min(1439 - m.dur, toMin(m.start) + op.minutes));
        const hit = fixedBusy.find(([a, b]) => s < b && s + m.dur > a);
        if (hit) { s = op.minutes > 0 ? hit[1] : Math.max(0, hit[0] - m.dur); coll++; }
        change(m, { start: fromMin(s) });
      }
      plan.counts.fixed += fixedBusy.length;
      if (coll) plan.warnings.push(`${coll} task(s) bumped around fixed items.`);
      break;
    }
    case 'compress':
    case 'reset': {
      const d = op.date;
      const dayEnd = toMin(ctx.dayEnd);
      const from = d === ctx.today ? Math.ceil(ctx.now / 5) * 5 : 0;
      const rest = onDay(d).filter((t) => movable(t) && (toMin(t.start) + t.dur > ctx.now || d !== ctx.today));
      const fixed = onDay(d).filter((t) => t.fixed && t.status !== 'done' && toMin(t.start) + t.dur > from);
      plan.counts.fixed += fixed.length;
      if (!rest.length) { plan.warnings.push(fixed.length ? 'Every remaining item is fixed, so nothing can move. Unfix some items to continue.' : 'Nothing left to re-plan on this day.'); break; }
      const busy: Busy[] = fixed.map((t) => [toMin(t.start), toMin(t.start) + t.dur]);
      const freeMin = Math.max(0, dayEnd - from - busy.reduce((a, [s, e]) => a + Math.max(0, Math.min(e, dayEnd) - Math.max(s, from)), 0));
      const need = rest.reduce((a, t) => a + t.dur, 0);
      let keep = [...rest];
      let factor = Math.min(1, freeMin / need);
      const floor = op.kind === 'reset' ? 0.7 : 0.5;
      const dropped: Task[] = [];
      if (factor < floor) {
        const order = [...rest].sort((a, b) => Number(b.top3) - Number(a.top3) || PR[a.priority] - PR[b.priority] || toMin(a.start) - toMin(b.start));
        keep = []; let used = 0;
        for (const t of order) { if (used + t.dur * floor <= freeMin) { keep.push(t); used += t.dur; } else dropped.push(t); }
        factor = Math.min(1, freeMin / Math.max(1, used));
      }
      keep.sort((a, b) => toMin(a.start) - toMin(b.start));
      let cursor = from;
      for (const t of keep) {
        const nd = factor < 1 ? Math.max(10, r5(t.dur * factor)) : t.dur;
        for (let g = 0; g < 20; g++) { const hit = busy.find(([s, e]) => cursor < e && cursor + nd > s); if (!hit) break; cursor = hit[1]; }
        if (cursor + nd > dayEnd + 30) { dropped.push(t); continue; }
        if (cursor !== toMin(t.start) || nd !== t.dur) change(t, { start: fromMin(cursor), dur: nd });
        cursor += nd;
      }
      if (dropped.length) {
        plan.overflowIds.push(...dropped.map((t) => t.id));
        land(dropped, nextWorking(d), d);
        plan.warnings.push(`${dropped.length} lower-priority task(s) moved to ${fmtDate(nextWorking(d))} so the rest fits. Nothing is deleted.`);
      }
      if (factor < 1) plan.warnings.push(`Durations shortened to about ${Math.round(factor * 100)}% to fit the time left.`);
      break;
    }
  }

  if (collisionTotal) plan.warnings.unshift(`${collisionTotal} placement${collisionTotal > 1 ? 's' : ''} nudged after fixed or existing items to avoid overlap.`);
  plan.changes = [...touched.values()].filter((c) => (Object.keys(c.after) as (keyof Task)[]).some((k) => c.after[k] !== c.before[k]));
  const dateChanged = (c: Change) => c.after.date !== undefined && c.after.date !== c.before.date;
  plan.counts.skipped = plan.changes.filter((c) => c.after.status === 'skipped').length;
  plan.counts.moved = plan.changes.filter((c) => c.after.status !== 'skipped' && (dateChanged(c) || c.after.start !== c.before.start || c.after.dur !== c.before.dur)).length;
  plan.counts.overflow = plan.overflowIds.length;
  plan.empty = !plan.changes.length && !plan.dayTypes.length && !plan.anchor;
  return plan;
}

/** Undo: restore tasks whose current values still match the shift's result; return the ones edited since. */
export function undoPlan(changes: Change[], tasks: Task[]) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const revert: Change[] = [], edited: string[] = [];
  for (const c of changes) {
    const t = byId.get(c.id);
    if (!t) continue;
    const untouched = (Object.keys(c.after) as (keyof Task)[]).every((k) => t[k] === c.after[k]);
    if (untouched) revert.push(c); else edited.push(t.title);
  }
  return { revert, edited };
}

export const newBatchId = () => uid();
