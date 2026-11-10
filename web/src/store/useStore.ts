import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Attendance, ClassSlot, DaySummary, DayType, Goal, Habit, HabitLog, HistoryEvent, InboxItem, Reflection, Routine, Settings, ShiftBatch, Subject, Task } from '../lib/types';
import { addDays, dow, toMin, todayISO, uid } from '../lib/time';
import { CATEGORIES, DEFAULT_SETTINGS, SEED_GOALS, SEED_HABITS, SEED_INBOX, SEED_ROUTINES, SUBJECTS, buildTimetable, dayTemplate, seedHabitLogs, seedHistory, seedTasks } from '../lib/seed';
import { ACHIEVEMENTS, type Stats } from '../lib/achievements';
import { computeStreak, dayStats, isActive, levelOf, xpFor } from '../lib/progress';
import { planShift, undoPlan, type Anchor, type ShiftPlan } from '../lib/shift';
import { questByCode, questOfDay, type QuestEntry } from '../lib/quests';

export interface Counters { shifts: number; sprints: number; rescued: number; comeback: number; planned: number; perfect: number; top3: number; focusMin: number; earlyDone: number; classes: number }

export interface Data {
  v: number;
  onboarded: boolean;
  guest: boolean;
  settings: Settings;
  categories: typeof CATEGORIES;
  tasks: Task[];
  inbox: InboxItem[];
  habits: Habit[];
  habitLogs: HabitLog[];
  goals: Goal[];
  routines: Routine[];
  slots: ClassSlot[];
  subjects: Subject[];
  attendance: Attendance[];
  dayTypes: Record<string, DayType>;
  dayLabels: Record<string, string>;
  anchor: Anchor;
  cycle: number;
  history: Record<string, DaySummary>;
  batches: ShiftBatch[];
  log: HistoryEvent[];
  xp: number;
  unlocked: Record<string, number>;
  frozen: string[];
  intentions: Record<string, string>;
  locked: Record<string, boolean>;
  checkin: Record<string, { energy?: 'low' | 'okay' | 'high'; mood?: number }>;
  reflections: Reflection[];
  sealed: string[];
  counters: Counters;
  seededThrough: string;
  holidayPrompt: { date: string; title: string; dismissed?: boolean } | null;
  muted: string[];
  auth: { token: string; userId: string; username: string } | null;
  deviceId: string;
  lastPull: string;
  demo: boolean;
  onboardedAt?: number;
  quests: Record<string, QuestEntry>;
}

export interface Actions {
  set: (patch: Partial<Settings>) => void;
  finishOnboarding: (p: { name: string; theme: string; goal: string; tasks: string[]; guest: boolean; sample?: boolean }) => void;
  generateRoutine: (id: string, days?: number) => number;
  acceptQuest: (date: string, code?: string) => void;
  dropQuest: (date: string) => void;
  completeQuest: (date: string) => number;
  addTask: (t: Partial<Task> & { title: string }) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  restoreTask: (id: string) => void;
  purgeTask: (id: string) => void;
  completeTask: (id: string) => { xp: number; levelUp: number | null; unlocked: string[]; dayPct: number; first: boolean };
  uncompleteTask: (id: string) => void;
  skipTask: (id: string, reason: string) => void;
  moveToTomorrow: (id: string) => void;
  addSpent: (id: string, min: number, sprint?: boolean) => void;
  toggleSubtask: (id: string, sid: string) => void;
  addSubtasks: (id: string, titles: string[]) => void;
  toggleTop3: (id: string) => boolean;
  addInbox: (text: string) => void;
  removeInbox: (id: string) => void;
  promoteInbox: (id: string, p: { date: string; start: string; dur: number }) => void;
  applyShift: (plan: ShiftPlan) => ShiftBatch;
  undoShift: (id: string) => { reverted: number; edited: string[] };
  logHabit: (habitId: string, date: string, delta: number) => void;
  addHabit: (h: Omit<Habit, 'id'>) => void;
  addGoal: (g: Omit<Goal, 'id' | 'progress'>) => void;
  toggleRoutine: (id: string) => void;
  applyRoutine: (id: string, date: string) => number;
  markAttendance: (slotId: string, date: string, status: Attendance['status']) => void;
  setDayLabel: (date: string, label: string) => void;
  setIntention: (date: string, text: string) => void;
  lockDay: (date: string, on: boolean) => void;
  setCheckin: (date: string, p: { energy?: 'low' | 'okay' | 'high'; mood?: number }) => void;
  addReflection: (r: Omit<Reflection, 'id'>) => void;
  sealDay: (date: string) => void;
  useFreeze: (date: string) => boolean;
  dismissHolidayPrompt: () => void;
  mute: (key: string) => void;
  ensureHorizon: () => void;
  checkAchievements: () => string[];
  note: (kind: HistoryEvent['kind'], text: string) => void;
  commitSprint: () => void;
  resetDemo: () => void;
  wipe: () => void;
}

export type Store = Data & Actions;
const KEY = 'apexday-v1';

function fresh(): Data {
  const today = todayISO();
  return {
    v: 1, onboarded: false, guest: true, settings: { ...DEFAULT_SETTINGS }, categories: CATEGORIES,
    tasks: seedTasks(today), inbox: SEED_INBOX, habits: SEED_HABITS, habitLogs: seedHabitLogs(today), goals: SEED_GOALS, routines: SEED_ROUTINES,
    slots: buildTimetable(), subjects: SUBJECTS, attendance: [], dayTypes: {}, dayLabels: {}, anchor: { date: today, order: 3 }, cycle: 6,
    history: seedHistory(today), batches: [], log: [], xp: 4180, unlocked: {}, frozen: [], intentions: { [today]: 'Finish the DSA graph set' }, locked: {},
    checkin: {}, reflections: [], sealed: [], counters: { shifts: 0, sprints: 3, rescued: 4, comeback: 1, planned: 6, perfect: 8, top3: 5, focusMin: 2700, earlyDone: 12, classes: 41 },
    seededThrough: addDays(today, 13), holidayPrompt: { date: addDays(today, 2), title: 'College Foundation Day' }, muted: [], auth: null, deviceId: uid(), lastPull: '', demo: true, quests: {},
  };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const patchTask = (id: string, p: Partial<Task>) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) }));
      const find = (id: string) => get().tasks.find((t) => t.id === id);
      const log = (kind: HistoryEvent['kind'], text: string) => set((s) => ({ log: [{ id: uid(), at: Date.now(), kind, text }, ...s.log].slice(0, 300) }));

      const evalAchievements = (): string[] => {
        const s = get();
        const today = todayISO(s.settings.dayStartHour);
        const st = streakOf(s, today);
        const done = s.tasks.filter((t) => t.status === 'done' && !t.deletedAt).length + 340; // + seeded lifetime history
        const stats: Stats = {
          tasks: done, streak: st.current, best: st.best, hours: Math.floor(s.counters.focusMin / 60), level: levelOf(s.xp), shifts: s.counters.shifts,
          sprints: s.counters.sprints, rescued: s.counters.rescued, habitDays: new Set(s.habitLogs.map((l) => l.date)).size, goals: s.goals.filter((g) => g.progress >= g.targetValue).length,
          perfect: s.counters.perfect, started: s.counters.earlyDone, comeback: s.counters.comeback, classes: s.counters.classes, top3: s.counters.top3, planned: s.counters.planned,
        };
        const fresh = ACHIEVEMENTS.filter((a) => !s.unlocked[a.code] && stats[a.metric] >= a.at).map((a) => a.code);
        if (fresh.length) set((x) => ({ unlocked: { ...x.unlocked, ...Object.fromEntries(fresh.map((c) => [c, Date.now()])) } }));
        return fresh;
      };

      return {
        ...fresh(),
        set: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        finishOnboarding: ({ name, theme, goal, tasks, guest, sample = true }) => {
          const today = todayISO(get().settings.dayStartHour);
          const extra: Task[] = tasks.filter(Boolean).slice(0, 3).map((title, i) => ({
            id: uid(), title, categoryId: 'study', tags: [], priority: 'med', energy: 'med', date: addDays(today, 1), start: ['08:00', '10:30', '16:00'][i], dur: 45, fixed: false, top3: i === 0, source: 'manual', status: 'planned', subtasks: [], spentMin: 0,
          }));
          if (!sample) set((s) => ({ demo: false, tasks: [], inbox: [], habits: [], habitLogs: [], goals: [], routines: [], slots: [], subjects: [], attendance: [], history: {}, intentions: {}, batches: [], log: [], xp: 0, unlocked: {}, holidayPrompt: null, counters: { shifts: 0, sprints: 0, rescued: 0, comeback: 0, planned: 0, perfect: 0, top3: 0, focusMin: 0, earlyDone: 0, classes: 0 }, seededThrough: addDays(today, 30) }));
          set((s) => ({ onboarded: true, onboardedAt: Date.now(), guest, settings: { ...s.settings, name: name || 'Friend', theme }, tasks: [...s.tasks, ...extra], goals: goal ? [{ id: uid(), title: goal, categoryId: 'study', targetType: 'hours', targetValue: 30, progress: 0, due: '' }, ...s.goals] : s.goals }));
        },
        addTask: (t) => {
          const s = get();
          const id = uid();
          const task: Task = { id, title: t.title, notes: t.notes, categoryId: t.categoryId ?? 'study', tags: t.tags ?? [], priority: t.priority ?? 'med', energy: t.energy ?? 'med', date: t.date ?? todayISO(s.settings.dayStartHour), start: t.start ?? '09:00', dur: t.dur ?? 30, fixed: !!t.fixed, top3: !!t.top3, goalId: t.goalId, source: t.source ?? 'manual', status: 'planned', subtasks: t.subtasks ?? [], spentMin: 0 };
          set((x) => ({ tasks: [...x.tasks, task] }));
          return id;
        },
        updateTask: (id, p) => patchTask(id, p),
        deleteTask: (id) => { const t = find(id); if (!t) return; patchTask(id, { deletedAt: Date.now() }); log('delete', `Moved "${t.title}" to Trash`); },
        restoreTask: (id) => { const t = find(id); patchTask(id, { deletedAt: undefined }); if (t) log('restore', `Restored "${t.title}"`); },
        purgeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
        completeTask: (id) => {
          const s = get();
          const t = find(id);
          if (!t || t.status === 'done') return { xp: 0, levelUp: null, unlocked: [], dayPct: 0, first: false };
          const before = levelOf(s.xp);
          const wasPerfect = false;
          const gain = xpFor(t);
          const late = toMin(t.start) + t.dur < nowMinSafe() && t.date === todayISO(s.settings.dayStartHour);
          const wasPartial = t.spentMin > 0 && t.spentMin < t.dur;
          patchTask(id, { status: 'done', doneAt: Date.now(), late, spentMin: Math.max(t.spentMin, 0), subtasks: t.subtasks.map((x) => ({ ...x, done: true })) });
          const date = t.date;
          const dayTasks = get().tasks.filter((x) => x.date === date && isActive(x) && x.status !== 'skipped');
          const stats = dayStats(dayTasks, s.settings);
          const top3 = dayTasks.filter((x) => x.top3);
          set((x) => ({
            xp: x.xp + gain,
            counters: {
              ...x.counters,
              perfect: x.counters.perfect + (stats.pct === 100 && !wasPerfect && stats.planned >= 3 ? 1 : 0),
              top3: x.counters.top3 + (t.top3 && top3.length && top3.every((y) => y.status === 'done') ? 1 : 0),
              earlyDone: x.counters.earlyDone + (toMin(t.start) < 540 ? 1 : 0),
              rescued: x.counters.rescued + (wasPartial ? 1 : 0),
            },
          }));
          const unlocked = evalAchievements();
          return { xp: gain, levelUp: levelOf(get().xp) > before ? levelOf(get().xp) : null, unlocked, dayPct: stats.pct, first: stats.done === 1 };
        },
        uncompleteTask: (id) => {
          const t = find(id);
          if (!t || t.status !== 'done') return;
          patchTask(id, { status: 'planned', doneAt: undefined, late: undefined });
          set((x) => ({ xp: Math.max(0, x.xp - xpFor(t)) }));
        },
        skipTask: (id, reason) => { patchTask(id, { status: 'skipped', skipReason: reason }); },
        moveToTomorrow: (id) => {
          const s = get();
          const t = find(id);
          if (!t) return;
          const target = addDays(t.date, 1) > todayISO(s.settings.dayStartHour) ? addDays(t.date, 1) : addDays(todayISO(s.settings.dayStartHour), 1);
          const copy: Task = { ...t, routineKey: undefined, id: uid(), date: target, status: 'planned', spentMin: 0, source: 'shifted', movedFrom: t.date, doneAt: undefined, late: undefined, top3: false };
          set((x) => ({ tasks: [...x.tasks.map((y) => (y.id === id ? { ...y, status: 'moved' as const } : y)), copy] }));
          log('edit', `Moved "${t.title}" to tomorrow`);
        },
        addSpent: (id, min, sprint) => {
          const t = find(id);
          if (!t || min <= 0) return;
          patchTask(id, { spentMin: t.spentMin + min, status: t.status === 'planned' ? 'in_progress' : t.status });
          set((x) => ({ counters: { ...x.counters, focusMin: x.counters.focusMin + min, sprints: x.counters.sprints + (sprint ? 1 : 0) } }));
          evalAchievements();
        },
        commitSprint: () => { set((x) => ({ counters: { ...x.counters, sprints: x.counters.sprints + 1 } })); evalAchievements(); },
        toggleSubtask: (id, sid) => { const t = find(id); if (t) patchTask(id, { subtasks: t.subtasks.map((x) => (x.id === sid ? { ...x, done: !x.done } : x)) }); },
        addSubtasks: (id, titles) => { const t = find(id); if (t) patchTask(id, { subtasks: [...t.subtasks, ...titles.map((title) => ({ id: uid(), title, done: false }))] }); },
        toggleTop3: (id) => {
          const t = find(id);
          if (!t) return false;
          if (!t.top3 && get().tasks.filter((x) => x.date === t.date && x.top3 && isActive(x)).length >= 3) return false;
          patchTask(id, { top3: !t.top3 });
          return true;
        },
        addInbox: (text) => set((s) => ({ inbox: [{ id: uid(), text, createdAt: Date.now() }, ...s.inbox] })),
        removeInbox: (id) => set((s) => ({ inbox: s.inbox.filter((i) => i.id !== id) })),
        promoteInbox: (id, p) => {
          const it = get().inbox.find((i) => i.id === id);
          if (!it) return;
          get().addTask({ title: it.text, ...p, source: 'inbox' });
          set((s) => ({ inbox: s.inbox.filter((i) => i.id !== id) }));
        },
        applyShift: (plan) => {
          const batch: ShiftBatch = { id: uid(), label: plan.label, kind: plan.kind, createdAt: Date.now(), changes: plan.changes, dayTypes: plan.dayTypes, anchor: plan.anchor, counts: plan.counts };
          set((s) => {
            const dayTypes = { ...s.dayTypes };
            plan.dayTypes.forEach((d) => { if (d.to === 'normal') delete dayTypes[d.date]; else dayTypes[d.date] = d.to; });
            const map = new Map(plan.changes.map((c) => [c.id, c.after]));
            return {
              tasks: s.tasks.map((t) => (map.has(t.id) ? { ...t, ...map.get(t.id)! } : t)),
              dayTypes, anchor: plan.anchor ? plan.anchor.to : s.anchor,
              batches: [batch, ...s.batches],
              counters: { ...s.counters, shifts: s.counters.shifts + 1 },
              holidayPrompt: s.holidayPrompt && plan.dayTypes.some((d) => d.date === s.holidayPrompt!.date) ? null : s.holidayPrompt,
            };
          });
          log('shift', `${plan.label}: ${plan.counts.moved} moved, ${plan.counts.skipped} skipped`);
          evalAchievements();
          return batch;
        },
        undoShift: (id) => {
          const s = get();
          const b = s.batches.find((x) => x.id === id);
          if (!b || b.undoneAt) return { reverted: 0, edited: [] };
          const { revert, edited } = undoPlan(b.changes, s.tasks);
          const map = new Map(revert.map((c) => [c.id, c.before]));
          set((x) => {
            const dayTypes = { ...x.dayTypes };
            b.dayTypes.forEach((d) => { if (d.from === 'normal') delete dayTypes[d.date]; else dayTypes[d.date] = d.from; });
            return {
              tasks: x.tasks.map((t) => (map.has(t.id) ? { ...t, ...map.get(t.id)! } : t)),
              dayTypes, anchor: b.anchor ? b.anchor.from : x.anchor,
              batches: x.batches.map((y) => (y.id === id ? { ...y, undoneAt: Date.now() } : y)),
            };
          });
          log('undo', `Undid "${b.label}"${edited.length ? ` (kept ${edited.length} edited)` : ''}`);
          return { reverted: revert.length, edited };
        },
        logHabit: (habitId, date, delta) => set((s) => {
          const ex = s.habitLogs.find((l) => l.habitId === habitId && l.date === date);
          const next = Math.max(0, (ex?.count ?? 0) + delta);
          const rest = s.habitLogs.filter((l) => !(l.habitId === habitId && l.date === date));
          return { habitLogs: next ? [...rest, { habitId, date, count: next }] : rest };
        }),
        addHabit: (h) => set((s) => ({ habits: [...s.habits, { ...h, id: uid() }] })),
        addGoal: (g) => set((s) => ({ goals: [...s.goals, { ...g, id: uid(), progress: 0 }] })),
        toggleRoutine: (id) => { set((s) => ({ routines: s.routines.map((r) => (r.id === id ? { ...r, active: !r.active } : r)) })); get().generateRoutine(id, 14); },
        applyRoutine: (id, date) => {
          const r = get().routines.find((x) => x.id === id);
          if (!r) return 0;
          r.tasks.forEach((t) => get().addTask({ title: t.title, start: t.start, dur: t.dur, date, categoryId: r.categoryId, source: 'routine' }));
          return r.tasks.length;
        },
        markAttendance: (slotId, date, status) => set((s) => {
          const prev = s.attendance.find((a) => a.slotId === slotId && a.date === date)?.status;
          const slot = s.slots.find((x) => x.id === slotId);
          const subjects = s.subjects.map((sub) => {
            if (!slot || sub.name !== slot.subject) return sub;
            let { attended, total } = sub;
            if (prev === 'attended') { attended--; total--; } else if (prev === 'absent') total--;
            if (status === 'attended') { attended++; total++; } else if (status === 'absent') total++;
            return { ...sub, attended, total };
          });
          return {
            attendance: [...s.attendance.filter((a) => !(a.slotId === slotId && a.date === date)), { slotId, date, status }], subjects,
            counters: { ...s.counters, classes: s.counters.classes + (status === 'attended' && prev !== 'attended' ? 1 : 0) },
          };
        }),
        setDayLabel: (date, label) => set((s) => ({ dayLabels: { ...s.dayLabels, [date]: label } })),
        setIntention: (date, text) => set((s) => ({ intentions: { ...s.intentions, [date]: text } })),
        lockDay: (date, on) => set((s) => ({ locked: { ...s.locked, [date]: on } })),
        setCheckin: (date, p) => set((s) => ({ checkin: { ...s.checkin, [date]: { ...s.checkin[date], ...p } } })),
        addReflection: (r) => set((s) => ({ reflections: [{ ...r, id: uid() }, ...s.reflections] })),
        sealDay: (date) => {
          const s = get();
          const st = dayStats(s.tasks.filter((t) => t.date === date && isActive(t)), s.settings);
          set((x) => ({ sealed: [...new Set([...x.sealed, date])], history: { ...x.history, [date]: { pct: st.pct, done: st.done, planned: st.planned, min: st.min } } }));
          log('seal', `Sealed ${date} at ${st.pct}%`);
        },
        useFreeze: (date) => {
          const s = get();
          const month = date.slice(0, 7);
          if (s.frozen.filter((d) => d.startsWith(month)).length >= s.settings.freezesPerMonth) return false;
          set((x) => ({ frozen: [...x.frozen, date], history: { ...x.history, [date]: { pct: 0, done: 0, planned: 0, min: 0, kind: 'frozen' } } }));
          return true;
        },
        dismissHolidayPrompt: () => set((s) => ({ holidayPrompt: s.holidayPrompt ? { ...s.holidayPrompt, dismissed: true } : null })),
        mute: (key) => set((s) => ({ muted: [...new Set([...s.muted, key])] })),
        ensureHorizon: () => {
          const s = get();
          const today = todayISO(s.settings.dayStartHour);
          const target = addDays(today, 10);
          if (s.seededThrough >= target) return;
          if (s.demo) {
            const add: Task[] = [];
            for (let d = addDays(s.seededThrough, 1); d <= target; d = addDays(d, 1)) {
              const ty = s.dayTypes[d] ?? (dow(d) === 0 ? 'rest' : 'normal');
              if (ty === 'holiday' || ty === 'exam') continue;
              add.push(...dayTemplate(d));
            }
            set((x) => ({ tasks: [...x.tasks, ...add], seededThrough: target }));
          }
          s.routines.filter((r) => r.active).forEach((r) => get().generateRoutine(r.id, 14));
        },
        acceptQuest: (date, code) => set((s) => (s.quests?.[date]?.doneAt ? {} : { quests: { ...(s.quests ?? {}), [date]: { code: code ?? questOfDay(date).code, accepted: true, base: s.counters.sprints } } })),
        dropQuest: (date) => set((s) => ({ quests: { ...(s.quests ?? {}), [date]: { ...(s.quests?.[date] ?? { code: questOfDay(date).code, base: s.counters.sprints }), accepted: false, dropped: true } } })),
        completeQuest: (date) => {
          const e = get().quests?.[date];
          const def = e && questByCode(e.code);
          if (!e || !def || e.doneAt) return 0;
          set((s) => ({ xp: s.xp + def.xp, quests: { ...s.quests, [date]: { ...e, doneAt: Date.now() } } }));
          evalAchievements();
          return def.xp;
        },
        generateRoutine: (id, days = 14) => {
          const s = get();
          const r = s.routines.find((x) => x.id === id);
          if (!r || !r.active) return 0;
          const today = todayISO(s.settings.dayStartHour);
          const add: Task[] = [];
          for (let i = 0; i < days; i++) {
            const d = addDays(today, i);
            if (!routineRuns(r.recurrence, d, today)) continue;
            const ty = s.dayTypes[d] ?? (dow(d) === 0 ? 'rest' : 'normal');
            if (ty === 'holiday' || ty === 'exam') continue;
            r.tasks.forEach((rt, k) => {
              const rid = `${r.id}:${k}`;
              if (s.tasks.some((t) => t.date === d && t.routineKey === rid)) return; // already generated (even if moved or deleted)
              add.push({ id: uid(), title: rt.title, categoryId: r.categoryId, tags: [], priority: 'med', energy: 'med', date: d, start: rt.start, dur: rt.dur, fixed: false, top3: false, source: 'routine', status: 'planned', subtasks: [], spentMin: 0, routineKey: rid });
            });
          }
          if (add.length) set((x) => ({ tasks: [...x.tasks, ...add] }));
          return add.length;
        },
        note: (kind, text) => log(kind, text),
        checkAchievements: () => evalAchievements(),
        resetDemo: () => { set((s) => ({ ...fresh(), onboarded: true, auth: s.auth, deviceId: s.deviceId })); },
        wipe: () => { localStorage.removeItem(KEY); location.href = '/'; },
      };
    },
    {
      name: KEY,
      version: 1,
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'function')) as unknown as Store,
    },
  ),
);

function nowMinSafe() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }

// ---------- selectors (pure helpers over Data) ----------
/** Does a routine's recurrence rule run on date d? */
export function routineRuns(rule: string, d: string, today: string) {
  const w = dow(d);
  if (rule === 'Daily') return true;
  if (rule.startsWith('Mon–Fri')) return w >= 1 && w <= 5;
  if (rule === 'Sat, Sun') return w === 0 || w === 6;
  if (rule === 'Every 2 days') return Math.round((Date.parse(d) - Date.parse(today)) / 86400000) % 2 === 0;
  return false;
}
export const dayTypeOf = (s: Data, d: string): DayType => s.dayTypes[d] ?? (dow(d) === 0 ? 'rest' : 'normal');
export const isWorking = (s: Data, d: string) => { const t = dayTypeOf(s, d); return (t === 'normal' || t === 'day_order') && dow(d) !== 0; };

export function orderFor(s: Data, d: string, anchor: Anchor = s.anchor): number | undefined {
  if (!s.slots.length) return undefined; // no timetable set up: day order does not apply
  const ok = (x: string) => { const t = dayTypeOf(s, x); return (t === 'normal' || t === 'day_order') && dow(x) >= 1 && dow(x) <= 5; };
  if (!ok(d)) return undefined;
  let n = 0;
  if (d >= anchor.date) for (let x = addDays(anchor.date, 1); x <= d; x = addDays(x, 1)) { if (ok(x)) n++; }
  else for (let x = d; x < anchor.date; x = addDays(x, 1)) { if (ok(x)) n--; }
  return ((((anchor.order - 1 + n) % s.cycle) + s.cycle) % s.cycle) + 1;
}

export const tasksOn = (s: Data, d: string, withDeleted = false) => s.tasks.filter((t) => t.date === d && (withDeleted || !t.deletedAt)).sort((a, b) => toMin(a.start) - toMin(b.start));

export function summaryFor(s: Data, d: string): DaySummary | undefined {
  const list = s.tasks.filter((t) => t.date === d && isActive(t));
  const ty = dayTypeOf(s, d);
  if (ty === 'holiday' || ty === 'exam') return { pct: 0, done: 0, planned: 0, min: 0, kind: ty === 'exam' ? 'exam' : 'holiday' };
  if (s.frozen.includes(d)) return { pct: 0, done: 0, planned: 0, min: 0, kind: 'frozen' };
  if (list.length) { const st = dayStats(list, s.settings); return { pct: st.pct, done: st.done, planned: st.planned, min: st.min }; }
  return s.history[d];
}

export function streakOf(s: Data, today: string) {
  return computeStreak((d) => summaryFor(s, d), today, s.settings.streakThreshold);
}

export function planFor(s: Data, op: Parameters<typeof planShift>[0]): ShiftPlan {
  const today = todayISO(s.settings.dayStartHour);
  return planShift(op, { tasks: s.tasks, dayTypeOf: (d) => dayTypeOf(s, d), orderFor: (d, a) => orderFor(s, d, a), anchor: s.anchor, today, now: nowMinSafe(), dayEnd: s.settings.dayEnd });
}
