import type { Data } from '../store/useStore';
import { addDays } from './time';

export interface QuestDef { code: string; title: string; text: string; how: string[]; xp: number; target: number; unit: string; icon: string }
export interface QuestEntry { code: string; accepted: boolean; base: number; doneAt?: number; dropped?: boolean }

/** Light, optional daily challenges. They reward XP only, never gate features, and are never shown as failed. */
export const QUESTS: QuestDef[] = [
  { code: 'first_before_10', title: 'Early start', text: 'Finish your first task before 10 a.m.', icon: 'sun', xp: 40, target: 1, unit: 'task before 10:00',
    how: ['Make sure you have a task planned for this morning.', 'Complete it (tick it, or press Space) before 10:00.'] },
  { code: 'three_top3', title: 'Top three', text: 'Complete all of your Top 3', icon: 'star', xp: 60, target: 3, unit: 'Top 3 tasks done',
    how: ['On Today, press “Pin a task” and choose 3 tasks as your Top 3.', 'Complete all three before the day ends.'] },
  { code: 'tiny_start', title: 'Tiny Start', text: 'Do one Tiny Start round', icon: 'bolt', xp: 30, target: 1, unit: 'Tiny Start round',
    how: ['Open a task and press Start, or press “Tiny Start” on the Up next card.', 'Let the 5-minute round finish (stop early and it will not count).'] },
  { code: 'plan_tomorrow', title: 'Plan ahead', text: 'Plan tomorrow before 10 p.m.', icon: 'plan', xp: 30, target: 1, unit: 'task planned for tomorrow',
    how: ['Open Plan and go to tomorrow (arrow →).', 'Add at least one task before 22:00.'] },
  { code: 'two_sprints', title: 'Two sprints', text: 'Complete two focus sprints', icon: 'repeat', xp: 40, target: 2, unit: 'sprints',
    how: ['Press Start on a task, then choose “Sprint” (for example 25 + 5).', 'Finish two work rounds; the timer rolls into the next automatically.'] },
];

export const questOfDay = (date: string): QuestDef => QUESTS[Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000) % QUESTS.length];
export const questByCode = (code: string) => QUESTS.find((q) => q.code === code);

const localDate = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function questProgress(s: Data, def: QuestDef, date: string, entry?: QuestEntry) {
  let v = 0;
  const base = entry?.base ?? s.counters.sprints;
  const live = (t: Data['tasks'][number]) => !t.deletedAt && t.status !== 'moved';
  switch (def.code) {
    case 'first_before_10': v = s.tasks.some((t) => live(t) && t.status === 'done' && t.doneAt && localDate(t.doneAt) === date && new Date(t.doneAt).getHours() < 10) ? 1 : 0; break;
    case 'three_top3': v = s.tasks.filter((t) => live(t) && t.date === date && t.top3 && t.status === 'done').length; break;
    case 'tiny_start': case 'two_sprints': v = s.counters.sprints - base; break;
    case 'plan_tomorrow': v = s.tasks.filter((t) => live(t) && t.date === addDays(date, 1) && t.status !== 'skipped').length > 0 && new Date().getHours() < 22 ? 1 : 0; break;
  }
  v = Math.max(0, Math.min(def.target, v));
  return { value: v, target: def.target, done: v >= def.target, pct: Math.round((v / def.target) * 100) };
}

export const RANKS = [
  { at: 0, name: 'Rookie' }, { at: 3, name: 'Explorer' }, { at: 8, name: 'Climber' }, { at: 15, name: 'Pathfinder' }, { at: 30, name: 'Summit' }, { at: 60, name: 'Legend' },
];

/** Totals, streak and rank from the saved results. Misses never count against you. */
export function questStats(quests: Record<string, QuestEntry> | undefined, today: string) {
  const done = Object.entries(quests ?? {}).filter(([, e]) => e.doneAt).sort(([a], [b]) => b.localeCompare(a));
  const dates = new Set(done.map(([d]) => d));
  const xp = done.reduce((a, [, e]) => a + (questByCode(e.code)?.xp ?? 0), 0);
  let streak = 0, d = dates.has(today) ? today : addDays(today, -1);
  while (dates.has(d)) { streak++; d = addDays(d, -1); }
  const rankIdx = RANKS.reduce((acc, r, i) => (done.length >= r.at ? i : acc), 0);
  const next = RANKS[rankIdx + 1];
  return { completed: done.length, xp, streak, rank: RANKS[rankIdx], next, toNext: next ? next.at - done.length : 0, rankPct: next ? Math.round(((done.length - RANKS[rankIdx].at) / (next.at - RANKS[rankIdx].at)) * 100) : 100, dates };
}
