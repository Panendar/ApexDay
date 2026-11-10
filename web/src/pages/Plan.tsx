import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Icon } from '../components/Icon';
import { Empty, PageHead, Seg } from '../components/Bits';
import { Modal } from '../components/Modal';
import { TaskCard } from '../components/TaskCard';
import { QuickAddBar } from '../components/QuickAdd';
import { ClassList } from '../components/ClassList';
import { useStore, tasksOn, dayTypeOf, orderFor } from '../store/useStore';
import { useUI } from '../store/useUI';
import { useNowMin, useToday } from '../lib/hooks';
import { isActive, countable } from '../lib/progress';
import { addDays, clamp, dow, fmtDate, fmtDur, fmtLong, fmtTime, fromMin, snapTo, toMin, weekStartOf, DOW } from '../lib/time';
import type { Task } from '../lib/types';

type View = 'day' | 'week' | 'agenda';
const H0 = 5 * 60, H1 = 24 * 60;

function columns(items: { id: string; s: number; e: number }[]) {
  const out = new Map<string, { col: number; cols: number }>();
  const sorted = [...items].sort((a, b) => a.s - b.s || b.e - a.e);
  let group: typeof sorted = [], gEnd = -1;
  const flush = () => {
    const colEnds: number[] = [];
    group.forEach((it) => { let c = colEnds.findIndex((e) => e <= it.s); if (c < 0) { c = colEnds.length; colEnds.push(it.e); } else colEnds[c] = it.e; out.set(it.id, { col: c, cols: 0 }); });
    group.forEach((it) => { out.get(it.id)!.cols = colEnds.length; });
    group = [];
  };
  for (const it of sorted) { if (group.length && it.s >= gEnd) { flush(); gEnd = -1; } group.push(it); gEnd = Math.max(gEnd, it.e); }
  if (group.length) flush();
  return out;
}

export default function Plan() {
  const st = useStore();
  const today = useToday();
  const now = useNowMin();
  const ui = useUI.getState();
  const viewDate = useUI((s) => s.viewDate) ?? today;
  const [view, setView] = useState<View>('day');
  const [zoom, setZoom] = useState(1.2);
  const [routineOpen, setRoutineOpen] = useState(false);
  const date = viewDate;
  const setDate = (d: string) => ui.setViewDate(d === today ? null : d);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement; if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      if (useUI.getState().editor || useUI.getState().shift.open || useUI.getState().palette) return;
      if (e.key === 'ArrowLeft' && !e.altKey) { e.preventDefault(); setDate(addDays(date, view === 'week' ? -7 : -1)); }
      if (e.key === 'ArrowRight' && !e.altKey) { e.preventDefault(); setDate(addDays(date, view === 'week' ? 7 : 1)); }
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }); // eslint-disable-line

  const tasks = useMemo(() => tasksOn(st, date).filter(isActive), [st.tasks, date]);
  const type = dayTypeOf(st, date);
  const locked = !!st.locked[date];
  const order = orderFor(st, date);
  const classes = order ? st.slots.filter((s) => s.order === order && st.attendance.find((a) => a.slotId === s.id && a.date === date)?.status !== 'cancelled') : [];
  const plannedMin = tasks.filter(countable).reduce((a, t) => a + t.dur, 0);
  const classMin = classes.reduce((a, c) => a + toMin(c.end) - toMin(c.start), 0);
  const busyMin = plannedMin + classMin;
  const limit = st.settings.overloadHours * 60;
  const overloaded = busyMin > limit;
  const wake = 17 * 60;

  const copyFrom = (src: string) => {
    const list = tasksOn(st, src).filter((t) => isActive(t) && t.status !== 'skipped');
    if (!list.length) { ui.toast('Nothing to copy from that day.', { kind: 'warn' }); return; }
    const ids = list.map((t) => st.addTask({ ...t, id: undefined as never, date, status: 'planned' as never, top3: false, source: 'manual' }));
    ui.toast(`Copied ${list.length} tasks from ${fmtDate(src, today)}`, { kind: 'good', action: { label: 'Undo', run: () => ids.forEach((i) => useStore.getState().purgeTask(i)) } });
  };

  const weekStart = weekStartOf(date, st.settings.weekStart);
  const days7 = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="page">
      <PageHead eyebrow="Plan" title={view === 'week' ? `Week of ${fmtDate(weekStart)}` : fmtLong(date)}>
        <Seg<View> value={view} onChange={setView} options={[{ v: 'day', l: 'Day' }, { v: 'week', l: 'Week' }, { v: 'agenda', l: 'Agenda' }]} label="View" />
        <div className="row gap-1">
          <button className="btn btn-icon" onClick={() => setDate(addDays(date, view === 'week' ? -7 : -1))} aria-label="Previous"><Icon name="chevL" /></button>
          <button className="btn" onClick={() => setDate(today)}>Today</button>
          <button className="btn btn-icon" onClick={() => setDate(addDays(date, view === 'week' ? 7 : 1))} aria-label="Next"><Icon name="chevR" /></button>
        </div>
      </PageHead>

      <div className="card reveal" style={{ marginBottom: '1rem' }}><QuickAddBar date={date} /></div>

      {view === 'day' && (
        <div className="layout-3">
          <div className="col gap-3">
            <div className="row wrap gap-2 between">
              <div className="row wrap gap-2">
                {type !== 'normal' && <span className="chip info">{type.replace('_', ' ')}</span>}
                {order && <span className="chip">Day Order {order}</span>}
                {locked && <span className="chip accent"><Icon name="lock" size={12} />Locked</span>}
                <span className={`chip ${overloaded ? 'warn' : 'good'}`}>{fmtDur(busyMin)} busy · {fmtDur(Math.max(0, wake - busyMin))} free</span>
              </div>
              <div className="row wrap gap-1">
                <button className="btn btn-sm" onClick={() => copyFrom(addDays(date, -1))}><Icon name="copy" size={14} />Copy yesterday</button>
                <button className="btn btn-sm" onClick={() => copyFrom(addDays(date, -7))}><Icon name="copy" size={14} />Copy last week</button>
                <button className="btn btn-sm" onClick={() => setRoutineOpen(true)}><Icon name="repeat" size={14} />Apply routine</button>
                <button className={`btn btn-sm ${locked ? 'btn-soft' : 'btn-primary'}`} onClick={() => { st.lockDay(date, !locked); ui.toast(locked ? 'Day unlocked' : 'Day locked. Edits will ask first. Go get it.', { kind: 'good', ttl: 2400 }); }}><Icon name={locked ? 'unlock' : 'lock'} size={14} />{locked ? 'Unlock' : 'Lock the day'}</button>
              </div>
            </div>
            <div className="pbar lg" aria-label="Load meter" role="img" style={{ ['--c' as string]: overloaded ? 'var(--warn)' : 'var(--accent)' }}><i style={{ width: `${Math.min(100, (busyMin / limit) * 100)}%` }} /></div>
            {overloaded && <div className="banner warn small" role="status"><Icon name="alert" /><div className="grow">Heavy day: {fmtDur(busyMin)} against a {fmtDur(limit)} limit. Move your lowest-priority tasks, or ignore this.</div><button className="btn btn-sm" onClick={() => ui.openShift('compress', date)}>Compress</button></div>}
            {(type === 'holiday' || type === 'exam') && <div className="banner info small"><Icon name="flag" /><div>This is a {type} day. Streak is neutral.</div></div>}
            {tasks.length === 0 && type === 'normal' && (
              <div className="card"><Empty icon="plan" title="This day is unplanned, not failed" text="Start from a routine, copy another day, or drag something from your Inbox onto the timeline." action={<div className="row wrap gap-2 center"><button className="btn btn-primary" onClick={() => setRoutineOpen(true)}>Apply a routine</button><button className="btn" onClick={() => copyFrom(addDays(date, -1))}>Copy yesterday</button></div>} /></div>)}
            <Timeline date={date} tasks={tasks} classes={classes} zoom={zoom} now={now} isToday={date === today} locked={locked} />
            <div className="row gap-3 small muted"><Icon name="search" size={14} />Zoom<input type="range" min={0.7} max={2.2} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ maxWidth: 160 }} aria-label="Timeline zoom" /><span>Drag to move · drag the bottom edge to resize · arrow keys on a focused block</span></div>
          </div>
          <aside className="side-col"><InboxPanel date={date} /><ClassList date={date} /></aside>
        </div>
      )}

      {view === 'week' && <WeekBoard days={days7} today={today} onOpen={(d) => { setDate(d); setView('day'); }} />}

      {view === 'agenda' && (
        <div className="col gap-4">
          {Array.from({ length: 14 }, (_, i) => addDays(date, i)).map((d) => {
            const list = tasksOn(st, d).filter(isActive);
            const ty = dayTypeOf(st, d);
            if (!list.length && ty === 'normal') return null;
            return (
              <section key={d} className="col gap-2">
                <div className="row gap-2"><h3>{fmtDate(d, today)}</h3>{ty !== 'normal' && <span className="chip info">{ty.replace('_', ' ')}</span>}<span className="small muted">{list.length} tasks · {fmtDur(list.reduce((a, t) => a + t.dur, 0))}</span><button className="btn btn-ghost btn-sm end" onClick={() => { setDate(d); setView('day'); }}>Open</button></div>
                {list.map((t) => <TaskCard key={t.id} task={t} isToday={d === today} now={now} compact />)}
              </section>);
          })}
        </div>)}

      <AnimatePresence>{routineOpen && <ApplyRoutine date={date} onClose={() => setRoutineOpen(false)} />}</AnimatePresence>
    </div>
  );
}

function Timeline({ date, tasks, classes, zoom, now, isToday, locked }: { date: string; tasks: Task[]; classes: { id: string; subject: string; start: string; end: string; room: string }[]; zoom: number; now: number; isToday: boolean; locked: boolean }) {
  const st = useStore();
  const ui = useUI.getState();
  const cats = st.categories;
  const ppm = zoom;
  const snap = st.settings.snap;
  const [drag, setDrag] = useState<{ id: string; mode: 'move' | 'resize'; start: number; dur: number } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const lay = useMemo(() => columns([...tasks.map((t) => ({ id: t.id, s: toMin(t.start), e: toMin(t.start) + t.dur })), ...classes.map((c) => ({ id: c.id, s: toMin(c.start), e: toMin(c.end) }))]), [tasks, classes]);
  const conflicts = useMemo(() => { const set = new Set<string>(); tasks.filter(countable).forEach((a, i, arr) => arr.forEach((b, j) => { if (i < j && toMin(a.start) < toMin(b.start) + b.dur && toMin(b.start) < toMin(a.start) + a.dur) { set.add(a.id); set.add(b.id); } })); return set; }, [tasks]);
  const y = (m: number) => (m - H0) * ppm;

  useEffect(() => { if (isToday && scroller.current) scroller.current.scrollTop = Math.max(0, y(now) - 160); }, [isToday]); // eslint-disable-line

  const begin = (e: React.PointerEvent, t: Task, mode: 'move' | 'resize') => {
    if (t.fixed || t.status === 'done') return;
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const y0 = e.clientY, s0 = toMin(t.start), d0 = t.dur;
    let cur = { start: s0, dur: d0 };
    const mv = (ev: PointerEvent) => {
      const dm = (ev.clientY - y0) / ppm;
      cur = mode === 'move' ? { start: clamp(snapTo(s0 + dm, snap), 0, 1439 - 5), dur: d0 } : { start: s0, dur: clamp(snapTo(d0 + dm, snap), 5, 720) };
      setDrag({ id: t.id, mode, ...cur });
    };
    const up = () => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up);
      setDrag(null);
      if (cur.start === s0 && cur.dur === d0) { ui.select(t.id); return; }
      if (locked && !confirm('This day is locked. Edit anyway?')) return;
      useStore.getState().updateTask(t.id, { start: fromMin(cur.start), dur: cur.dur });
      ui.toast(`${t.title}: ${fmtTime(fromMin(cur.start), st.settings.hour12)} · ${fmtDur(cur.dur)}`, { ttl: 2200, action: { label: 'Undo', run: () => useStore.getState().updateTask(t.id, { start: t.start, dur: t.dur }) } });
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  };
  const key = (e: React.KeyboardEvent, t: Task) => {
    if (t.fixed) return;
    const d = e.key === 'ArrowUp' ? -snap : e.key === 'ArrowDown' ? snap : 0;
    if (!d) { if (e.key === 'Enter') ui.openEditor({ id: t.id }); return; }
    e.preventDefault(); e.stopPropagation();
    if (e.shiftKey) st.updateTask(t.id, { dur: clamp(t.dur + d, 5, 720) }); else st.updateTask(t.id, { start: fromMin(clamp(toMin(t.start) + d, 0, 1435)) });
  };
  const onDrop = (e: React.DragEvent) => {
    const id = e.dataTransfer.getData('text/inbox'); if (!id) return;
    e.preventDefault();
    const r = grid.current!.getBoundingClientRect();
    const m = clamp(snapTo((e.clientY - r.top) / ppm + H0, snap), H0, 1400);
    st.promoteInbox(id, { date, start: fromMin(m), dur: 30 });
    ui.toast(`Scheduled at ${fmtTime(fromMin(m), st.settings.hour12)}`, { kind: 'good', ttl: 2200 });
  };
  const hours = Array.from({ length: (H1 - H0) / 60 }, (_, i) => H0 + i * 60);
  const gaps = useMemo(() => { // free gaps >= 45 min, between busy blocks
    const busy = [...tasks.filter(countable).map((t) => [toMin(t.start), toMin(t.start) + t.dur]), ...classes.map((c) => [toMin(c.start), toMin(c.end)])].sort((a, b) => a[0] - b[0]);
    const out: [number, number][] = []; let cur = 6 * 60;
    for (const [s, e] of busy) { if (s - cur >= 45) out.push([cur, s]); cur = Math.max(cur, e); }
    if (22 * 60 - cur >= 45) out.push([cur, 22 * 60]);
    return out;
  }, [tasks, classes]);

  return (
    <div className="tl">
      <div className="tl-scroll" ref={scroller}>
        <div className="tl-grid" ref={grid} style={{ height: (H1 - H0) * ppm + 20, marginTop: 14 }} onDragOver={(e) => { if (e.dataTransfer.types.includes('text/inbox')) e.preventDefault(); }} onDrop={onDrop}>
          {hours.map((h) => <div key={h} className="tl-hour" style={{ top: y(h) }}><span>{fmtTime(fromMin(h % 1440), st.settings.hour12)}</span></div>)}
          {gaps.map(([s, e]) => <button key={s} className="tl-gap" style={{ top: y(s) + 3, height: (e - s) * ppm - 6 }} onClick={() => ui.openEditor({ defaults: { date, start: fromMin(snapTo(s + 5, snap)), dur: Math.min(60, e - s - 5) } })} aria-label={`Free ${fmtDur(e - s)} at ${fromMin(s)}. Add a task.`}>+ {fmtDur(e - s)} free</button>)}
          {classes.map((c) => { const l = lay.get(c.id)!; return (
            <div key={c.id} className="tl-block class" style={{ top: y(toMin(c.start)), height: (toMin(c.end) - toMin(c.start)) * ppm - 2, left: `${(l.col / l.cols) * 100}%`, width: `calc(${100 / l.cols}% - 4px)` }} title="Class (from your timetable)">
              <div className="t"><Icon name="cap" size={12} /> {c.subject}</div><div className="s">{c.room} · {c.start}–{c.end}</div></div>); })}
          {tasks.map((t) => {
            const cat = cats.find((c) => c.id === t.categoryId);
            const l = lay.get(t.id)!;
            const dg = drag?.id === t.id ? drag : null;
            const s = dg ? dg.start : toMin(t.start), d = dg ? dg.dur : t.dur;
            return (
              <div key={t.id} role="button" tabIndex={0} aria-label={`${t.title} ${t.start}, ${t.dur} minutes. Arrow keys move, shift plus arrows resize.`}
                className={`tl-block${dg ? ' drag' : ''}${t.status === 'done' ? ' done' : ''}${t.fixed ? ' fixed' : ''}${conflicts.has(t.id) ? ' conflict' : ''}`}
                style={{ ['--cat' as string]: cat?.color, top: y(s), height: Math.max(26, d * ppm - 2), left: `${(l.col / l.cols) * 100}%`, width: `calc(${100 / l.cols}% - 4px)`, zIndex: dg ? 6 : 2 }}
                onPointerDown={(e) => begin(e, t, 'move')} onDoubleClick={() => ui.openEditor({ id: t.id })} onKeyDown={(e) => key(e, t)}>
                <div className="t row gap-1">{t.top3 && <Icon name="star" size={12} fill />}{t.fixed && <Icon name="pin" size={12} />}<span className="ellipsis">{t.title}</span></div>
                {d * ppm > 40 && <div className="s tnum">{fmtTime(fromMin(s), st.settings.hour12)}–{fmtTime(fromMin(s + d), st.settings.hour12)} · {fmtDur(d)}</div>}
                {conflicts.has(t.id) && d * ppm > 56 && <div className="s" style={{ color: 'var(--warn)' }}>Overlap</div>}
                {!t.fixed && t.status !== 'done' && <div className="tl-resize" onPointerDown={(e) => begin(e, t, 'resize')} />}
              </div>);
          })}
          {isToday && <div className="tl-now" data-t={fromMin(now)} style={{ top: y(now) }} />}
        </div>
      </div>
      {conflicts.size > 0 && <div className="banner warn small" style={{ margin: 12 }}><Icon name="alert" /><div className="grow">{conflicts.size} tasks overlap. Overlaps never block saving.</div><button className="btn btn-sm" onClick={() => ui.openShift('compress', date)}>Fix with Compress</button></div>}
    </div>
  );
}

function WeekBoard({ days, today, onOpen }: { days: string[]; today: string; onOpen: (d: string) => void }) {
  const st = useStore();
  const ui = useUI.getState();
  const [over, setOver] = useState<string | null>(null);
  return (
    <div className="board stagger" role="list">
      {days.map((d) => {
        const list = tasksOn(st, d).filter(isActive);
        const ty = dayTypeOf(st, d);
        const mins = list.filter(countable).reduce((a, t) => a + t.dur, 0);
        return (
          <div key={d} role="listitem" className={`board-col${d === today ? ' today' : ''}${over === d ? ' over' : ''}${ty === 'holiday' ? ' holiday' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setOver(d); }} onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/task'); if (id) { st.updateTask(id, { date: d }); ui.toast(`Moved to ${fmtDate(d, today)}`, { kind: 'good', ttl: 1800 }); } const inb = e.dataTransfer.getData('text/inbox'); if (inb) st.promoteInbox(inb, { date: d, start: '09:00', dur: 30 }); }}>
            <button className="row between" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => onOpen(d)} aria-label={`Open ${fmtDate(d, today)}`}>
              <div><div className="tiny muted" style={{ fontWeight: 700, letterSpacing: '0.08em' }}>{DOW[dow(d)].toUpperCase()}</div><div className="display" style={{ fontSize: '1.4rem', fontWeight: 700 }}>{Number(d.slice(8))}</div></div>
              <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>{ty !== 'normal' && <span className="chip info">{ty.replace('_', ' ')}</span>}<span className="tiny muted">{fmtDur(mins)}</span></div>
            </button>
            {list.map((t) => { const c = st.categories.find((x) => x.id === t.categoryId); return (
              <div key={t.id} className={`mini-task${t.status === 'done' ? ' done' : ''}`} style={{ ['--cat' as string]: c?.color }} draggable={!t.fixed} onDragStart={(e) => e.dataTransfer.setData('text/task', t.id)} onClick={() => ui.openEditor({ id: t.id })}>
                <b className="tnum">{t.start}</b> {t.top3 ? '★ ' : ''}{t.title}</div>); })}
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 'auto' }} onClick={() => ui.openEditor({ defaults: { date: d } })}><Icon name="plus" size={14} />Add</button>
          </div>);
      })}
    </div>
  );
}

function InboxPanel({ date }: { date: string }) {
  const st = useStore();
  const ui = useUI.getState();
  const [text, setText] = useState('');
  const old = st.inbox.filter((i) => Date.now() - i.createdAt > 14 * 86400000);
  const fresh = st.inbox.filter((i) => !old.includes(i));
  const promote = (id: string) => {
    const dayT = tasksOn(st, date).filter(isActive).map((t) => [toMin(t.start), toMin(t.start) + t.dur]);
    let m = 9 * 60; for (; m < 21 * 60; m += 15) if (!dayT.some(([a, b]) => m < b && m + 30 > a)) break;
    st.promoteInbox(id, { date, start: fromMin(m), dur: 30 });
    ui.toast(`Scheduled at ${fmtTime(fromMin(m), st.settings.hour12)}`, { kind: 'good', ttl: 2000 });
  };
  const row = (i: typeof st.inbox[number]) => (
    <div key={i.id} className="list-row" draggable onDragStart={(e) => e.dataTransfer.setData('text/inbox', i.id)} style={{ cursor: 'grab', padding: '0.55rem 0' }}>
      <Icon name="drag" size={16} style={{ color: 'var(--faint)' }} /><span className="grow small clamp-2">{i.text}</span>
      <button className="btn btn-soft btn-sm" onClick={() => promote(i.id)} title="Promote with smart defaults">Add</button>
      <button className="btn btn-ghost btn-icon btn-sm" aria-label="Remove" onClick={() => { st.removeInbox(i.id); ui.toast('Removed from Inbox'); }}><Icon name="x" size={14} /></button></div>);
  return (
    <section className="card" aria-label="Inbox">
      <div className="card-title"><h3>Inbox</h3><span className="chip">{st.inbox.length}</span></div>
      <form className="row gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { st.addInbox(text.trim()); setText(''); } }}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Brain dump…" aria-label="Add to Inbox" /><button className="btn btn-icon" aria-label="Add"><Icon name="plus" /></button></form>
      <div className="mt-2">
        {st.inbox.length === 0 && <p className="small muted" style={{ padding: '0.5rem 0' }}>Empty. Nice and clear. Press <span className="kbd">I</span> to capture.</p>}
        {fresh.map(row)}
        {old.length > 0 && <><div className="small mt-3" style={{ color: 'var(--accent-text)', fontWeight: 700 }}>Still want these?</div>{old.map(row)}</>}
      </div>
      {st.inbox.length > 0 && <p className="tiny faint mt-2">Drag an item onto the timeline or a week column.</p>}
    </section>
  );
}

function ApplyRoutine({ date, onClose }: { date: string; onClose: () => void }) {
  const st = useStore();
  const [id, setId] = useState(st.routines[0]?.id);
  const r = st.routines.find((x) => x.id === id);
  return (
    <Modal title="Apply a routine" subtitle={`Preview first. Adds tasks to ${fmtDate(date)}.`} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!r} onClick={() => { const n = st.applyRoutine(id!, date); useUI.getState().toast(`Added ${n} tasks from “${r!.name}”`, { kind: 'good' }); onClose(); }}>Add {r?.tasks.length ?? 0} tasks</button></>}>
      <div className="grid-2">
        <div className="col gap-1">{st.routines.map((x) => <button key={x.id} className={`op-tile${x.id === id ? ' on' : ''}`} onClick={() => setId(x.id)}><b>{x.name}</b><span>{x.recurrence}</span></button>)}</div>
        <div className="card flat" style={{ background: 'var(--bg-2)' }}><b className="small">Preview</b>
          <div className="col gap-1 mt-2">{r?.tasks.map((t, i) => <div key={i} className="diff-line" style={{ gridTemplateColumns: 'auto 1fr auto' }}><span className="tnum muted">{t.start}</span><span>{t.title}</span><span className="muted">{fmtDur(t.dur)}</span></div>)}</div></div>
      </div>
    </Modal>
  );
}
