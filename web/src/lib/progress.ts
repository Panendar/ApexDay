import type { DaySummary, Settings, Task } from './types';
import { addDays, dow } from './time';

export const isActive = (t: Task) => !t.deletedAt && t.status !== 'moved';
export const countable = (t: Task) => isActive(t) && t.status !== 'skipped';

/** Progress of one task 0..1 (focus time vs planned, or subtasks, whichever is higher). */
export function taskProgress(t: Task) {
  if (t.status === 'done') return 1;
  const time = t.dur ? Math.min(1, t.spentMin / t.dur) : 0;
  const subs = t.subtasks.length ? t.subtasks.filter((s) => s.done).length / t.subtasks.length : 0;
  return Math.min(0.99, Math.max(time, subs));
}
export type Tier = { label: string; credit: number } | null;
export function taskTier(t: Task, s: Pick<Settings, 'w25' | 'w50'>): Tier {
  if (t.status === 'done') return { label: 'Done', credit: 1 };
  if (t.spentMin < 1) return null;
  const p = t.dur ? t.spentMin / t.dur : 0;
  if (p >= 0.5) return { label: 'Halfway+', credit: s.w50 };
  if (p >= 0.2) return { label: 'Good start', credit: s.w25 };
  return { label: 'Started', credit: 0 };
}
/** Completion rate = weighted credit / (planned - skipped). Single definition used everywhere. */
export function dayStats(tasks: Task[], s: Pick<Settings, 'w25' | 'w50'>) {
  const list = tasks.filter(countable);
  const credit = list.reduce((a, t) => a + (taskTier(t, s)?.credit ?? 0), 0);
  const done = list.filter((t) => t.status === 'done').length;
  const min = tasks.filter(isActive).reduce((a, t) => a + (t.status === 'done' ? t.spentMin || t.dur : t.spentMin), 0);
  return { planned: list.length, done, credit, pct: list.length ? Math.round((credit / list.length) * 100) : 0, min: Math.round(min) };
}

export const levelOf = (xp: number) => Math.floor(Math.sqrt(xp / 120)) + 1;
export const levelFloor = (lvl: number) => Math.round((lvl - 1) ** 2 * 120);
export function xpFor(t: Task) {
  const base = Math.round(t.dur / 6) + 6;
  const mult = t.priority === 'high' ? 1.5 : t.priority === 'low' ? 0.8 : 1;
  return Math.round(base * mult) + (t.top3 ? 15 : 0);
}

export const STAGES = [0, 3, 7, 14, 30, 60, 100, 200, 365];
export const STAGE_NAMES = ['Base camp', 'Foothills', 'Climbing', 'Ridge', 'Summit push', 'Above the clouds', 'Apex', 'Legend', 'Eternal'];
export const stageOf = (streak: number) => STAGES.reduce((acc, v, i) => (streak >= v ? i : acc), 0);

export interface StreakInfo { current: number; best: number; todayCounts: boolean }
/** Walk back from today. A day counts at >= threshold; holiday/rest/frozen days are neutral; today never breaks a streak. */
export function computeStreak(get: (d: string) => DaySummary | undefined, today: string, threshold: number): StreakInfo {
  const counts = (s?: DaySummary) => !!s && s.pct >= threshold && !s.kind;
  const neutral = (s?: DaySummary) => !!s && !!s.kind;
  const todayCounts = counts(get(today));
  let cur = todayCounts ? 1 : 0;
  let d = addDays(today, -1);
  for (let i = 0; i < 800; i++) {
    const s = get(d);
    if (counts(s)) cur++;
    else if (neutral(s) || (dow(d) === 0 && !s)) { /* neutral */ }
    else break;
    d = addDays(d, -1);
  }
  let best = 0, run = 0;
  d = addDays(today, -800);
  for (let i = 0; i <= 800; i++) {
    const s = get(d);
    if (counts(s)) { run++; best = Math.max(best, run); } else if (!neutral(s)) run = 0;
    d = addDays(d, 1);
  }
  return { current: cur, best: Math.max(best, cur), todayCounts };
}
