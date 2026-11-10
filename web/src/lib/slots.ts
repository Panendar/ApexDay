import type { Task } from './types';
import { fromMin, nowMin, toMin } from './time';

/** Next free start time for a task of `dur` minutes. For today it never suggests a time that has already passed. */
export function nextFreeStart(tasks: Task[], date: string, dur: number, today: string, ignoreId?: string): string {
  const from = date === today ? Math.ceil((nowMin() + 5) / 15) * 15 : 9 * 60;
  const busy = tasks
    .filter((t) => t.id !== ignoreId && t.date === date && !t.deletedAt && t.status !== 'moved' && t.status !== 'skipped')
    .map((t) => [toMin(t.start), toMin(t.start) + t.dur]);
  for (let m = from; m < 22 * 60; m += 15) if (!busy.some(([a, b]) => m < b && m + dur > a)) return fromMin(m);
  return fromMin(Math.min(from, 23 * 60));
}

/** True when a task's whole window on today's date is already behind us. */
export const isPast = (date: string, start: string, dur: number, today: string) => date === today && toMin(start) + dur <= nowMin();
