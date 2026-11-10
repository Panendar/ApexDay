import { useStore, summaryFor, streakOf } from './useStore';
import { useUI } from './useUI';
import { burst, centerOf, chime, xpChip } from '../lib/fx';
import { line } from '../lib/tips';
import { ACHIEVEMENTS } from '../lib/achievements';
import { todayISO } from '../lib/time';
import { STAGES } from '../lib/progress';

/** Complete a task with the full feedback stack: micro burst, XP chip, day celebration, undo toast. */
export function completeWithFx(id: string, origin?: Element | null) {
  const st = useStore.getState();
  const ui = useUI.getState();
  const task = st.tasks.find((t) => t.id === id);
  if (!task || task.status === 'done') return;
  const cat = st.categories.find((c) => c.id === task.categoryId);
  const res = st.completeTask(id);
  const { x, y } = centerOf(origin);
  burst({ x, y, color: cat?.color });
  xpChip({ x, y: y - 10, text: `+${res.xp} XP` });
  chime(740, st.settings.sound);
  ui.toast(`${line('done', st.settings.tone)} “${task.title}” done`, {
    kind: 'good', ttl: 5000,
    action: { label: 'Undo', run: () => { useStore.getState().uncompleteTask(id); } },
  });
  const calm = st.settings.motion === 'reduced';
  const quiet = Date.now() - ui.lastCelebration < 60_000; // max one major celebration per minute
  const now = useStore.getState();
  const today = todayISO(now.settings.dayStartHour);
  if (res.dayPct === 100 && task.date === today && !quiet) {
    ui.setCelebrate({ kind: 'day', title: 'Perfect day', sub: line('perfect', now.settings.tone) });
    if (!calm) setTimeout(() => burst({ x: window.innerWidth / 2, y: window.innerHeight / 2.4, big: true }), 150);
  } else if (res.levelUp && !quiet) {
    ui.setCelebrate({ kind: 'level', title: `Level ${res.levelUp}`, sub: 'You levelled up. Keep climbing.' });
  } else if (res.unlocked.length && !quiet) {
    const a = ACHIEVEMENTS.find((x) => x.code === res.unlocked[0]);
    if (a) ui.setCelebrate({ kind: 'badge', title: a.name, sub: a.desc });
  }
  const sNow = streakOf(now, today);
  if (STAGES.includes(sNow.current) && sNow.todayCounts && res.dayPct >= now.settings.streakThreshold && !quiet) {
    ui.setCelebrate({ kind: 'badge', title: `${sNow.current}-day streak`, sub: 'The Apex advanced a stage.' });
  }
  return summaryFor(now, today);
}
