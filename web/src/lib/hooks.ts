import { useEffect, useMemo, useState } from 'react';
import { useStore, summaryFor, streakOf, tasksOn, dayTypeOf, orderFor } from '../store/useStore';
import { dayStats, isActive, levelOf, levelFloor, stageOf } from './progress';
import { nowMin, todayISO } from './time';

/** Minutes since midnight, refreshed every 20s (drives the now-line, Now card, nudges). */
export function useNowMin(ms = 20000) {
  const [n, setN] = useState(nowMin());
  useEffect(() => { const i = setInterval(() => setN(nowMin()), ms); return () => clearInterval(i); }, [ms]);
  return n;
}

export function useToday() {
  const h = useStore((s) => s.settings.dayStartHour);
  const [t, setT] = useState(todayISO(h));
  useEffect(() => { const i = setInterval(() => setT(todayISO(h)), 30000); return () => clearInterval(i); }, [h]);
  useEffect(() => setT(todayISO(h)), [h]);
  return t;
}

export function useDay(date: string) {
  const data = useStore();
  const tasks = useMemo(() => tasksOn(data, date).filter(isActive), [data.tasks, date]);
  const stats = useMemo(() => dayStats(tasks, data.settings), [tasks, data.settings.w25, data.settings.w50]);
  return { tasks, stats, type: dayTypeOf(data, date), order: orderFor(data, date) };
}

export function useProgressMeta() {
  const s = useStore();
  const today = useToday();
  const streak = useMemo(() => streakOf(s, today), [s.tasks, s.history, s.frozen, s.dayTypes, s.settings.streakThreshold, today]);
  const lvl = levelOf(s.xp);
  const lo = levelFloor(lvl), hi = levelFloor(lvl + 1);
  return { streak, level: lvl, xp: s.xp, levelPct: (s.xp - lo) / (hi - lo), toNext: hi - s.xp, stage: stageOf(Math.max(streak.current, 0)), today, todaySummary: summaryFor(s, today) };
}

export function useKey(handler: (e: KeyboardEvent) => void, deps: unknown[] = []) {
  useEffect(() => { addEventListener('keydown', handler); return () => removeEventListener('keydown', handler); }, deps); // eslint-disable-line
}
