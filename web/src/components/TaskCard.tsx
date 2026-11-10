import { memo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Icon } from './Icon';
import type { Task } from '../lib/types';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { completeWithFx } from '../store/actions';
import { endOf, fmtDur, fmtTime, fromMin, toMin } from '../lib/time';
import { taskProgress, taskTier } from '../lib/progress';

export type CardState = 'upcoming' | 'now' | 'done' | 'late' | 'skipped';
export function cardState(t: Task, isToday: boolean, now: number): CardState {
  if (t.status === 'done') return 'done';
  if (t.status === 'skipped') return 'skipped';
  if (!isToday) return 'upcoming';
  const s = toMin(t.start), e = s + t.dur;
  if (t.status === 'in_progress' || (now >= s && now < e)) return 'now';
  if (now >= e) return 'late';
  return 'upcoming';
}

const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export const TaskCard = memo(function TaskCard({ task, isToday, now, compact }: { task: Task; isToday: boolean; now: number; compact?: boolean }) {
  const cat = useStore((s) => s.categories.find((c) => c.id === task.categoryId));
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateTask);
  const moveTomorrow = useStore((s) => s.moveToTomorrow);
  const selected = useUI((s) => s.selected === task.id);
  const { select, openEditor, setFocus, toast } = useUI.getState();
  const ref = useRef<HTMLDivElement>(null);
  const state = cardState(task, isToday, now);
  const tier = taskTier(task, settings);
  const prog = taskProgress(task);
  const done = task.status === 'done';

  const toggle = () => {
    if (done) { useStore.getState().uncompleteTask(task.id); toast('Marked as not done. XP removed.'); }
    else completeWithFx(task.id, ref.current?.querySelector('.check'));
  };
  const startFocus = () => {
    setFocus({ taskId: task.id, mode: 'free', workMin: settings.focusWork, breakMin: settings.focusBreak, phase: 'work', running: true, elapsed: 0, round: 1, interruptions: 0, banked: 0, totalWork: 0 });
    useStore.getState().updateTask(task.id, { status: task.status === 'planned' ? 'in_progress' : task.status });
  };

  return (
    <motion.div
      ref={ref} layout="position" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }}
      drag={coarse ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.35}
      onDragEnd={(_, i) => { if (i.offset.x > 90) toggle(); else if (i.offset.x < -90) openEditor({ id: task.id }); }}
      className={`tcard is-${state}${task.fixed ? ' is-fixed' : ''}${task.top3 ? ' is-top3' : ''}${selected ? ' selected' : ''}`}
      style={{ ['--cat' as string]: cat?.color ?? 'var(--accent)' }}
      tabIndex={0} role="button" aria-label={`${task.title}, ${fmtTime(task.start, settings.hour12)}, ${state}. Press Enter to open.`}
      onClick={() => { select(task.id); }} onDoubleClick={() => openEditor({ id: task.id })}
      onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) openEditor({ id: task.id }); }}
    >
      <button type="button" className={`check${done ? ' on' : tier && tier.credit > 0 ? ' half' : ''}`} style={{ ['--p' as string]: `${Math.round(prog * 100)}%` }}
        aria-label={done ? 'Mark as not done' : 'Complete task'} aria-pressed={done} onClick={(e) => { e.stopPropagation(); toggle(); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </button>
      <div className="tc-time">{fmtTime(task.start, settings.hour12)}<small>{fmtDur(task.dur)}</small></div>
      <div style={{ minWidth: 0 }}>
        <div className="row gap-2">
          {task.top3 && <span className="top3-mark" title="Top 3"><Icon name="star" size={15} fill /></span>}
          {task.fixed && <span className="faint" title="Fixed"><Icon name="pin" size={14} /></span>}
          <span className="tc-title clamp-2">{task.title}</span>
        </div>
        {!compact && (
          <div className="tc-meta">
            <span className="row gap-1"><i className="dot" style={{ ['--c' as string]: cat?.color }} />{cat?.name}</span>
            {state === 'late' && <span className="chip warn">Needs attention</span>}
            {state === 'now' && <span className="chip accent">Now · until {fmtTime(endOf(task.start, task.dur), settings.hour12)}</span>}
            {tier && !done && <span className={`chip ${tier.credit >= 0.5 ? 'good' : 'info'}`}>{tier.label} · {Math.round(prog * 100)}%</span>}
            {task.subtasks.length > 0 && <span>{task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} subtasks</span>}
            {task.late && done && <span className="chip warn">Late</span>}
            {task.movedFrom && <span className="faint">moved</span>}
            {task.skipReason && <span className="faint">{task.skipReason}</span>}
          </div>
        )}
      </div>
      <div className="tc-actions" onClick={(e) => e.stopPropagation()}>
        {!done && <button className="btn btn-ghost btn-icon btn-sm" aria-label="Start focus" title="Start (F)" onClick={startFocus}><Icon name="play" size={16} /></button>}
        {!done && <button className="btn btn-ghost btn-sm" aria-label="Add 10 minutes" title="+10 min" onClick={() => update(task.id, { dur: task.dur + 10 })}>+10</button>}
        {!done && <button className="btn btn-ghost btn-icon btn-sm" aria-label="Snooze 15 minutes" title="Snooze 15m" onClick={() => update(task.id, { start: fromMin(toMin(task.start) + 15) })}><Icon name="clock" size={16} /></button>}
        {!done && <button className="btn btn-ghost btn-icon btn-sm" aria-label="Move to tomorrow" title="Move to tomorrow" onClick={() => { moveTomorrow(task.id); toast(`“${task.title}” moved to tomorrow`, { kind: 'good' }); }}><Icon name="arrowR" size={16} /></button>}
        <button className="btn btn-ghost btn-icon btn-sm" aria-label="Edit task" title="Edit" onClick={() => openEditor({ id: task.id })}><Icon name="edit" size={16} /></button>
      </div>
      {!done && prog > 0 && <div className="tc-progress"><i style={{ width: `${prog * 100}%` }} /></div>}
    </motion.div>
  );
});
