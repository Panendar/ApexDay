import type { Attendance, Category, ClassSlot, DaySummary, Goal, Habit, HabitLog, InboxItem, Routine, Settings, Subject, Task } from './types';
import { addDays, dow, nowMin, toMin, uid } from './time';

export const DEFAULT_SETTINGS: Settings = {
  name: 'Friend', theme: 'apex', apexVisual: 'mountain', density: 'comfortable', dayStartHour: 4, weekStart: 1, hour12: false, snap: 15,
  streakThreshold: 70, freezesPerMonth: 2, overloadHours: 14, motion: 'full', sound: false, tone: 'energetic',
  nudges: true, nudgeDelay: 5, nudgeCap: 5, quietFrom: '22:30', quietTo: '06:30', notifications: false,
  w25: 0.25, w50: 0.5, planTime: '21:00', planDay: 0, dayEnd: '22:30', focusWork: 25, focusBreak: 5, tips: true,
};

export const CATEGORIES: Category[] = [
  { id: 'study', name: 'Study', color: '#c6f432', icon: 'book', weeklyGoalMin: 1200 },
  { id: 'class', name: 'Class', color: '#6ea8ff', icon: 'cap', weeklyGoalMin: 1500 },
  { id: 'health', name: 'Health', color: '#ff8a65', icon: 'heart', weeklyGoalMin: 300 },
  { id: 'personal', name: 'Personal', color: '#c792ff', icon: 'user', weeklyGoalMin: 240 },
  { id: 'project', name: 'Projects', color: '#ffd166', icon: 'code', weeklyGoalMin: 420 },
];

export const SLOT_TIMES: [string, string][] = [['09:00', '09:50'], ['10:00', '10:50'], ['11:10', '12:00'], ['12:10', '13:00']];
const SUBJ = [
  ['Data Structures', 'DS', '#c6f432'], ['Database Systems', 'DBMS', '#6ea8ff'], ['Operating Systems', 'OS', '#ff8a65'],
  ['Engineering Maths', 'Maths', '#c792ff'], ['Physics Lab', 'Physics', '#ffd166'], ['Computer Networks', 'CN', '#5eead4'],
] as const;
export const SUBJECTS: Subject[] = SUBJ.map(([name, , color], i) => ({ name, color, attended: [31, 27, 24, 29, 18, 26][i], total: [36, 34, 33, 34, 20, 30][i], limit: 75 }));
export function buildTimetable(): ClassSlot[] {
  const out: ClassSlot[] = [];
  for (let order = 1; order <= 6; order++) {
    SLOT_TIMES.forEach(([s, e], k) => {
      const subj = SUBJ[(order + k * 2 - 1) % SUBJ.length];
      out.push({ id: `o${order}s${k}`, order, subject: subj[0], start: s, end: e, room: ['B-204', 'A-101', 'Lab 3', 'C-310', 'B-112', 'A-305'][(order + k) % 6], teacher: ['Dr. Rao', 'Prof. Iyer', 'Dr. Mehta', 'Prof. Khan', 'Dr. Nair'][(order * 2 + k) % 5] });
    });
  }
  return out;
}

function mk(date: string, title: string, start: string, dur: number, categoryId: string, o: Partial<Task> = {}): Task {
  return { id: uid(), title, categoryId, tags: [], priority: 'med', energy: 'med', date, start, dur, fixed: false, top3: false, source: 'routine', status: 'planned', subtasks: [], spentMin: 0, ...o };
}

/** The default routine-generated tasks for one date. */
export function dayTemplate(d: string, withSubtasks = false): Task[] {
  const out: Task[] = [];
  const w = dow(d);
  if (w === 0) return [mk(d, 'Weekly review', '19:00', 30, 'personal', { priority: 'low' }), mk(d, 'Meal prep & laundry', '11:00', 60, 'personal', { priority: 'low', energy: 'low' })];
  if (w === 6) {
    return [mk(d, 'Morning run', '07:00', 40, 'health', { energy: 'high' }), mk(d, 'Side project: build the UI', '10:00', 120, 'project', { priority: 'high', top3: true, energy: 'high' }), mk(d, "Revise the week's notes", '15:00', 60, 'study', { top3: true }), mk(d, 'Call home', '18:30', 20, 'personal', { priority: 'low' })];
  }
  const subtasks = withSubtasks ? [{ id: uid(), title: 'BFS & DFS recap', done: true }, { id: uid(), title: 'Dijkstra from scratch', done: false }, { id: uid(), title: 'Solve 3 graph problems', done: false }] : [];
  out.push(
    mk(d, 'Morning run', '06:30', 30, 'health', { energy: 'high', priority: 'low' }),
    mk(d, 'Revise DSA: graphs', '07:30', 60, 'study', { priority: 'high', top3: true, energy: 'high', subtasks }),
    mk(d, 'Lunch & short walk', '13:30', 30, 'health', { priority: 'low', energy: 'low' }),
    mk(d, 'Physics assignment', '14:30', 90, 'study', { top3: true, tags: ['assignment'] }),
    mk(d, 'DBMS lab record', '16:30', 60, 'study'),
    mk(d, 'Gym: push day', '18:00', 60, 'health', { energy: 'high', priority: 'low' }),
    mk(d, 'DSA practice: 3 problems', '19:30', 90, 'study', { priority: 'high', top3: true, energy: 'high' }),
    mk(d, 'Read: Atomic Habits', '21:00', 30, 'personal', { priority: 'low', energy: 'low' }),
  );
  if (w === 3) out.push(mk(d, 'Mentor meeting', '15:00', 30, 'project', { fixed: true, priority: 'high', source: 'manual' }));
  return out;
}

export function seedTasks(today: string): Task[] {
  const out: Task[] = [];
  for (let i = 0; i < 14; i++) out.push(...dayTemplate(addDays(today, i), i === 0));
  // Make "today" realistic relative to the real clock.
  const now = nowMin();
  const todays = out.filter((t) => t.date === today).sort((a, b) => toMin(a.start) - toMin(b.start));
  let past = 0;
  todays.forEach((t) => {
    if (toMin(t.start) + t.dur < now - 5) {
      past++;
      if (past % 3 === 2) { t.spentMin = Math.round(t.dur * 0.4); t.late = true; }
      else if (past % 3 === 0) { t.late = true; }
      else { t.status = 'done'; t.spentMin = t.dur; t.doneAt = Date.now() - 3600_000; }
    }
  });
  return out;
}

function rng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

export function seedHistory(today: string): Record<string, DaySummary> {
  const r = rng(7);
  const h: Record<string, DaySummary> = {};
  for (let i = 400; i >= 1; i--) {
    const d = addDays(today, -i), w = dow(d);
    if (i > 372) continue;
    if (w === 0 && r() < 0.8) { h[d] = { pct: 0, done: 0, planned: 0, min: 0, kind: 'rest' }; continue; }
    if (i > 12 && r() < 0.035) { h[d] = { pct: 0, done: 0, planned: 0, min: 0, kind: 'holiday' }; continue; }
    const ramp = Math.min(1, (400 - i) / 250);
    let pct = i <= 11 ? 74 + Math.round(r() * 26) : Math.round((0.35 + r() * 0.65) * (55 + ramp * 45));
    if (i > 11 && r() < 0.06) pct = Math.round(r() * 20);
    pct = Math.min(100, pct);
    const planned = 5 + Math.round(r() * 4);
    const done = Math.round((planned * pct) / 100);
    h[d] = { pct, planned, done, min: Math.round(done * (45 + r() * 30)) };
  }
  return h;
}

export const SEED_HABITS: Habit[] = [
  { id: 'h1', name: 'Drink water', icon: 'drop', color: '#6ea8ff', cadence: 'daily', target: 8, unit: 'glasses' },
  { id: 'h2', name: 'Read', icon: 'book', color: '#c792ff', cadence: 'daily', target: 20, unit: 'pages' },
  { id: 'h3', name: 'Gym', icon: 'dumbbell', color: '#ff8a65', cadence: 'weekdays', target: 1, unit: 'session' },
  { id: 'h4', name: 'Sleep before 11', icon: 'moon', color: '#ffd166', cadence: 'daily', target: 1, unit: 'night' },
];
export function seedHabitLogs(today: string): HabitLog[] {
  const r = rng(11), logs: HabitLog[] = [];
  for (let i = 1; i <= 120; i++) SEED_HABITS.forEach((h) => { if (r() < 0.78 && !(h.cadence === 'weekdays' && [0, 6].includes(dow(addDays(today, -i))))) logs.push({ habitId: h.id, date: addDays(today, -i), count: h.target }); });
  logs.push({ habitId: 'h1', date: today, count: 4 }, { habitId: 'h2', date: today, count: 10 });
  return logs;
}
export const SEED_GOALS: Goal[] = [
  { id: 'g1', title: 'Master graph algorithms', categoryId: 'study', targetType: 'hours', targetValue: 40, progress: 27, due: '' },
  { id: 'g2', title: 'Ship the side project MVP', categoryId: 'project', targetType: 'tasks', targetValue: 30, progress: 12, due: '' },
  { id: 'g3', title: 'Run 100 km this semester', categoryId: 'health', targetType: 'hours', targetValue: 20, progress: 13, due: '' },
];
export const SEED_ROUTINES: Routine[] = [
  { id: 'r1', name: 'College day', color: '#6ea8ff', icon: 'cap', recurrence: 'Mon–Fri · by day order', categoryId: 'class', active: true, tasks: [{ title: 'Pack bag & commute', start: '08:15', dur: 30 }, { title: 'Review class notes', start: '17:15', dur: 30 }] },
  { id: 'r2', name: 'Morning reset', color: '#c6f432', icon: 'sun', recurrence: 'Daily', categoryId: 'health', active: true, tasks: [{ title: 'Morning run', start: '06:30', dur: 30 }, { title: 'Plan the day', start: '07:05', dur: 10 }] },
  { id: 'r3', name: 'Exam week', color: '#ffd166', icon: 'flag', recurrence: 'Custom range', categoryId: 'study', active: false, tasks: [{ title: 'Revision block 1', start: '08:00', dur: 120 }, { title: 'Revision block 2', start: '14:00', dur: 120 }, { title: 'Past paper', start: '17:00', dur: 90 }] },
  { id: 'r4', name: 'Evening wind-down', color: '#c792ff', icon: 'moon', recurrence: 'Daily', categoryId: 'personal', active: true, tasks: [{ title: 'Read', start: '21:00', dur: 30 }, { title: 'Plan tomorrow', start: '21:40', dur: 10 }] },
  { id: 'r5', name: 'Weekend reset', color: '#ff8a65', icon: 'home', recurrence: 'Sat, Sun', categoryId: 'personal', active: true, tasks: [{ title: 'Laundry & tidy', start: '11:00', dur: 60 }, { title: 'Weekly review', start: '19:00', dur: 30 }] },
];
export const SEED_INBOX: InboxItem[] = [
  { id: 'i1', text: 'Email professor about the lab extension', createdAt: Date.now() - 86400000 },
  { id: 'i2', text: 'Look up internship deadlines', createdAt: Date.now() - 3 * 86400000 },
  { id: 'i3', text: 'Buy a new notebook', createdAt: Date.now() - 20 * 86400000 },
];
export const SEED_ATTENDANCE: Attendance[] = [];
