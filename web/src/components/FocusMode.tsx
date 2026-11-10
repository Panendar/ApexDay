import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ring } from './Ring';
import { Icon } from './Icon';
import { Seg } from './Bits';
import { useStore } from '../store/useStore';
import { useUI, type Focus } from '../store/useUI';
import { completeWithFx } from '../store/actions';
import { clock } from '../lib/time';
import { line, tipFor } from '../lib/tips';
import { chime } from '../lib/fx';
import type { TimerMode } from '../lib/types';

const PRESETS: [number, number][] = [[5, 2], [10, 2], [25, 5], [50, 10]];

export function FocusMode() {
  const focus = useUI((s) => s.focus);
  return <AnimatePresence>{focus && <Body key={focus.taskId} />}</AnimatePresence>;
}

function Body() {
  const live = useUI((s) => s.focus);
  const last = useRef(live);
  if (live) last.current = live; // keep the last value so the exit animation can render
  const f = last.current!;
  const setFocus = useUI((s) => s.setFocus);
  const task = useStore((s) => s.tasks.find((t) => t.id === f.taskId));
  const settings = useStore((s) => s.settings);
  const cat = useStore((s) => s.categories.find((c) => c.id === task?.categoryId));
  const [thought, setThought] = useState('');
  const [tip] = useState(() => tipFor('big'));
  const fRef = useRef(f); fRef.current = f;
  const calm = settings.motion === 'reduced';

  const patch = (p: Partial<Focus>) => setFocus((x) => (x ? { ...x, ...p } : x));
  const commit = () => { // bank whole minutes of real work into the task
    const cur = useUI.getState().focus; if (!cur) return;
    const mins = Math.floor(cur.banked / 60);
    if (mins >= 1 || cur.banked >= 45) { useStore.getState().addSpent(cur.taskId, Math.max(1, mins)); useUI.setState((s) => ({ focus: s.focus ? { ...s.focus, banked: s.focus.banked - Math.max(1, mins) * 60 } : s.focus })); }
  };

  // ticking
  useEffect(() => {
    const i = setInterval(() => {
      const cur = useUI.getState().focus; if (!cur || !cur.running || cur.phase === 'idle' || cur.phase === 'finished') return;
      const elapsed = cur.elapsed + 1;
      const work = cur.phase === 'work';
      let next: Partial<Focus> = { elapsed, banked: cur.banked + (work ? 1 : 0), totalWork: cur.totalWork + (work ? 1 : 0) };
      const limit = (work ? cur.workMin : cur.breakMin) * 60;
      const timed = cur.mode === 'sprint' || cur.mode === 'tiny_start';
      if (timed && elapsed >= limit) {
        chime(work ? 520 : 780, useStore.getState().settings.sound);
        if (work) { next = { ...next, phase: 'break', elapsed: 0 }; useStore.getState().commitSprint(); }
        else if (cur.mode === 'sprint') next = { ...next, phase: 'work', elapsed: 0, round: cur.round + 1 };
        else next = { ...next, phase: 'finished', running: false, elapsed: 0 };
      }
      if (cur.mode === 'countdown') {
        const t = useStore.getState().tasks.find((x) => x.id === cur.taskId);
        if (t && elapsed >= Math.max(1, t.dur - t.spentMin) * 60) { chime(660, useStore.getState().settings.sound); next = { ...next, phase: 'finished', running: false }; }
      }
      useUI.setState((s) => ({ focus: s.focus ? { ...s.focus, ...next } : s.focus }));
      if (((cur.banked + 1) % 60 === 0 && work) || (timed && work && elapsed >= limit)) commit();
    }, 1000);
    return () => clearInterval(i);
  }, []); // eslint-disable-line

  const leave = () => { commit(); setFocus(null); };
  const finishTask = () => { commit(); const id = f.taskId; setFocus(null); if (task) completeWithFx(id); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === 'Escape') { e.preventDefault(); leave(); }
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); patch({ running: !fRef.current.running }); }
      if (e.key.toLowerCase() === 'd') finishTask();
    };
    addEventListener('keydown', k, true);
    return () => removeEventListener('keydown', k, true);
  }); // eslint-disable-line
  useEffect(() => () => commit(), []); // eslint-disable-line

  if (!task) return null;
  const work = f.phase === 'work';
  const timed = f.mode === 'sprint' || f.mode === 'tiny_start';
  const limit = (work ? f.workMin : f.breakMin) * 60;
  let shown = f.elapsed, ringVal = 0, sub = 'elapsed';
  if (timed) { shown = Math.max(0, limit - f.elapsed); ringVal = f.elapsed / limit; sub = work ? `round ${f.round} · work` : 'break'; }
  else if (f.mode === 'countdown') { const total = Math.max(1, task.dur - task.spentMin) * 60; shown = Math.max(0, total - f.elapsed); ringVal = f.elapsed / total; sub = 'to planned end'; }
  else { ringVal = Math.min(1, (task.spentMin * 60 + f.elapsed) / (task.dur * 60)); sub = `of ${task.dur}m planned`; }
  const warm = (timed || f.mode === 'countdown') && shown <= 300 && work && shown > 0;
  const pctDone = Math.min(100, Math.round(((task.spentMin * 60 + f.banked) / (task.dur * 60)) * 100));
  const setMode = (mode: TimerMode) => patch({ mode, phase: 'work', elapsed: 0, running: true, ...(mode === 'tiny_start' ? { workMin: 5, breakMin: 2 } : mode === 'sprint' ? { workMin: settings.focusWork, breakMin: settings.focusBreak } : {}) });

  return (
    <motion.div className={`focus${f.phase === 'break' ? ' break' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Focus Mode">
      <div className="row between" style={{ width: 'min(760px,100%)' }}>
        <span className="chip accent"><Icon name="bolt" size={13} />Focus Mode</span>
        <div className="row gap-2"><span className="small muted hide-sm">Space pause · D done · Esc leave</span><button className="btn btn-ghost btn-icon" onClick={leave} aria-label="Leave Focus Mode (time is kept)"><Icon name="x" /></button></div>
      </div>
      <div className="col" style={{ width: 'min(760px,100%)', flex: 1, alignItems: 'center', justifyContent: 'center', gap: '1.4rem', textAlign: 'center', paddingBlock: '1rem' }}>
        <div className="col gap-1" style={{ alignItems: 'center' }}>
          <span className="row gap-2 small muted"><i className="dot" style={{ ['--c' as string]: cat?.color }} />{cat?.name}{task.top3 && <span className="top3-mark"><Icon name="star" size={13} fill /></span>}</span>
          <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.6rem)', maxWidth: 680 }} className="clamp-2">{task.title}</h1>
        </div>
        <Ring value={f.phase === 'finished' ? 1 : ringVal} size={Math.min(320, innerWidth - 80)} stroke={14} warm={warm} color={f.phase === 'break' ? 'var(--info)' : undefined} label={`Timer ${clock(shown)}`}>
          <div>
            {f.phase === 'finished' ? (<><Icon name="check" size={48} stroke={3} /><div className="small muted mt-1">Round complete</div></>) : (<>
              <div className="focus-timer" style={{ fontSize: 'clamp(2.6rem,9vw,4.4rem)' }} aria-live="off">{clock(shown)}</div>
              <div className="small muted">{f.phase === 'break' ? 'Break · stand up, water, breathe' : sub}</div></>)}
          </div>
        </Ring>
        {f.phase === 'finished' ? (
          <div className="col gap-2" style={{ alignItems: 'center' }}>
            <p className="muted">{line('done', settings.tone)} {task.spentMin + Math.floor(f.banked / 60)} minutes on this so far ({pctDone}%).</p>
            <div className="row wrap gap-2 center">
              <button className="btn btn-primary" onClick={() => patch({ phase: 'work', elapsed: 0, running: true, round: f.round + 1, workMin: f.mode === 'tiny_start' ? Math.min(25, f.workMin === 2 ? 5 : f.workMin * 2) : f.workMin })}>{f.mode === 'tiny_start' ? 'Another round (step up)' : 'Another round'}</button>
              <button className="btn" onClick={() => patch({ mode: 'free', phase: 'work', elapsed: 0, running: true })}>Keep going</button>
              <button className="btn" onClick={leave}>Stop here</button>
            </div></div>
        ) : (
          <div className="row gap-3 wrap center">
            <button className="btn btn-lg" onClick={() => { commit(); patch({ running: !f.running }); }} aria-label={f.running ? 'Pause' : 'Resume'}><Icon name={f.running ? 'pause' : 'play'} />{f.running ? 'Pause' : 'Resume'}</button>
            <button className="btn btn-primary btn-lg" onClick={finishTask}><Icon name="check" />Done</button>
            <button className="btn btn-ghost" onClick={() => patch({ interruptions: f.interruptions + 1 })} title="Interruptions are counted, never judged">Interruptions: {f.interruptions}</button>
          </div>)}
        <div className="col gap-2" style={{ alignItems: 'center' }}>
          <Seg<TimerMode> value={f.mode} onChange={setMode} label="Timer mode" options={[{ v: 'free', l: 'Free' }, { v: 'countdown', l: 'Countdown' }, { v: 'sprint', l: 'Sprint' }, { v: 'tiny_start', l: 'Tiny Start' }]} />
          {f.mode === 'sprint' && <div className="row wrap gap-1 center">{PRESETS.map(([w, b]) => <button key={w} className={`btn btn-sm ${f.workMin === w ? 'btn-soft' : ''}`} onClick={() => patch({ workMin: w, breakMin: b, elapsed: 0, phase: 'work' })}>{w} + {b}</button>)}</div>}
          {f.mode === 'tiny_start' && <div className="row wrap gap-1 center">{[2, 5, 10].map((w) => <button key={w} className={`btn btn-sm ${f.workMin === w ? 'btn-soft' : ''}`} onClick={() => patch({ workMin: w, breakMin: 2, elapsed: 0, phase: 'work' })}>{w === 2 ? 'Just 2 minutes' : `${w} + 2`}</button>)}</div>}
        </div>
        <p className="small muted" style={{ maxWidth: 440 }}>{f.phase === 'work' && f.elapsed < 20 && settings.tips ? tip : line('focus', settings.tone)}</p>
      </div>
      <div className="grid-2" style={{ width: 'min(760px,100%)', alignItems: 'start' }}>
        <div className="card flat">
          <div className="row between"><b className="small">Subtasks</b><span className="small muted">{pctDone}% · {task.spentMin}m tracked</span></div>
          <div className="col gap-1 mt-2">
            {task.subtasks.length === 0 && <span className="small muted">No subtasks. Keep it simple.</span>}
            {task.subtasks.map((s) => (
              <label key={s.id} className="row gap-2 small" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={s.done} onChange={() => useStore.getState().toggleSubtask(task.id, s.id)} style={{ accentColor: 'var(--accent)' }} /><span style={{ textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--muted)' : undefined }}>{s.title}</span></label>))}
          </div>
        </div>
        <div className="card flat">
          <b className="small">Park a thought</b>
          <p className="small muted">It goes to your Inbox. Back to work.</p>
          <form className="row gap-2 mt-2" onSubmit={(e) => { e.preventDefault(); if (thought.trim()) { useStore.getState().addInbox(thought.trim()); setThought(''); useUI.getState().toast('Parked in Inbox', { ttl: 1500 }); } }}>
            <input className="input" value={thought} onChange={(e) => setThought(e.target.value)} placeholder="Stray idea…" aria-label="Park a thought" /><button className="btn btn-icon" aria-label="Park"><Icon name="plus" /></button></form>
        </div>
      </div>
      {calm ? null : <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(40% 30% at 50% 60%, var(--accent-soft), transparent)', animation: 'breathe 6s ease-in-out infinite', zIndex: -1 }} />}
    </motion.div>
  );
}
