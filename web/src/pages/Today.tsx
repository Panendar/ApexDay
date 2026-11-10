import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Ring, CountUp } from '../components/Ring';
import { Apex } from '../components/Apex';
import { TaskCard } from '../components/TaskCard';
import { Empty, PageHead, Stat } from '../components/Bits';
import { ClassList } from '../components/ClassList';
import { Workflow } from '../components/Workflow';
import { QuestButton } from '../components/QuestButton';
import { QuickAddBar } from '../components/QuickAdd';
import { useStore, tasksOn, dayTypeOf, orderFor } from '../store/useStore';
import { useUI } from '../store/useUI';
import { completeWithFx } from '../store/actions';
import { useNowMin, useProgressMeta, useToday } from '../lib/hooks';
import { dayStats, isActive, STAGES, STAGE_NAMES, taskTier } from '../lib/progress';
import { addDays, endOf, fmtDur, fmtLong, fmtTime, fromMin, toMin } from '../lib/time';
import { greeting, line, tipFor } from '../lib/tips';
import type { Task } from '../lib/types';

function useFocusStart() {
  const s = useStore.getState; const ui = useUI.getState;
  return (t: Task, mode: 'free' | 'tiny_start' = 'free', workMin?: number) => {
    const set = s().settings;
    ui().setFocus({ taskId: t.id, mode, workMin: workMin ?? (mode === 'tiny_start' ? 5 : set.focusWork), breakMin: mode === 'tiny_start' ? 2 : set.focusBreak, phase: 'work', running: true, elapsed: 0, round: 1, interruptions: 0, banked: 0, totalWork: 0 });
    if (t.status === 'planned') s().updateTask(t.id, { status: 'in_progress' });
  };
}

export default function Today() {
  const st = useStore();
  const today = useToday();
  const now = useNowMin();
  const meta = useProgressMeta();
  const nav = useNavigate();
  const startFocus = useFocusStart();
  const ui = useUI.getState();
  const [muted, setMuted] = useState<string[]>([]);
  const [nudgeTip] = useState(() => tipFor('missed'));
  const [showSuggest, setShowSuggest] = useState(false);

  const tasks = useMemo(() => tasksOn(st, today).filter(isActive), [st.tasks, today]);
  const stats = useMemo(() => dayStats(tasks, st.settings), [tasks, st.settings.w25, st.settings.w50]);
  const type = dayTypeOf(st, today);
  const order = orderFor(st, today);
  const open = tasks.filter((t) => t.status !== 'done' && t.status !== 'skipped');
  const nowTask = open.find((t) => t.status === 'in_progress') ?? open.find((t) => toMin(t.start) <= now && now < toMin(t.start) + t.dur);
  const upcoming = open.filter((t) => toMin(t.start) > now && t.id !== nowTask?.id);
  const next = upcoming[0];
  const late = open.filter((t) => toMin(t.start) + t.dur <= now && t.id !== nowTask?.id && t.status !== 'in_progress');
  const top3 = tasks.filter((t) => t.top3).slice(0, 3);
  const allDone = tasks.length > 0 && open.length === 0;
  const doneToday = tasks.filter((t) => t.status === 'done');
  const intention = st.intentions[today] ?? '';
  const [editInt, setEditInt] = useState(false);
  const [intDraft, setIntDraft] = useState(intention);
  const checkin = st.checkin[today] ?? {};
  const hour = Math.floor(now / 60);
  const hr = st.settings.hour12;

  // momentum: consecutive completions at the end of the day-so-far
  const momentum = useMemo(() => { const s = [...tasks].sort((a, b) => toMin(a.start) - toMin(b.start)); let last = -1; s.forEach((t, i) => { if (t.status === 'done') last = i; }); let n = 0; for (let i = last; i >= 0 && s[i].status === 'done'; i--) n++; return n; }, [tasks]);

  // start nudge (calm, one at a time, daily cap, never guilt)
  const nudge = useMemo(() => {
    if (!st.settings.nudges || st.muted.includes('nudge:all')) return undefined;
    return open.find((t) => t.status === 'planned' && t.spentMin === 0 && !t.fixed && now - toMin(t.start) >= st.settings.nudgeDelay && now < toMin(t.start) + t.dur && !muted.includes(t.id));
  }, [open, now, muted, st.settings.nudges, st.settings.nudgeDelay, st.muted]);

  const ringSegs = useMemo(() => {
    if (!stats.planned) return undefined;
    const by: Record<string, number> = {};
    tasks.filter((t) => t.status !== 'skipped').forEach((t) => { const c = taskTier(t, st.settings)?.credit ?? 0; by[t.categoryId] = (by[t.categoryId] ?? 0) + c / stats.planned; });
    return st.categories.filter((c) => by[c.id]).map((c) => ({ value: by[c.id], color: c.color }));
  }, [tasks, stats.planned, st.categories, st.settings]);

  const prompt = st.holidayPrompt && !st.holidayPrompt.dismissed ? st.holidayPrompt : null;
  const stageIdx = meta.stage;
  const nextMilestone = STAGES.find((x) => x > meta.streak.current);
  const unplannedTomorrow = tasksOn(st, addDays(today, 1)).filter(isActive).length === 0;
  const evening = now >= toMin(st.settings.planTime) - 60;

  useEffect(() => { setIntDraft(intention); }, [intention]);
  useEffect(() => { // gentle reminder on first open of a morning with no check-in
    if (hour >= 5 && hour < 11 && !checkin.energy && !muted.includes('ci')) return;
  }, [hour, checkin.energy, muted]);

  const candidates = open.filter((t) => !t.top3).sort((a, b) => ({ high: 0, med: 1, low: 2 }[a.priority] - { high: 0, med: 1, low: 2 }[b.priority]) || toMin(a.start) - toMin(b.start)).slice(0, 4);

  if (type === 'holiday' || type === 'exam') {
    return (
      <div className="page"><PageHead eyebrow={fmtLong(today)} title={type === 'holiday' ? 'Holiday. Rest well.' : 'Exam day'}><button className="btn" onClick={() => ui.openShift('pull', today)}><Icon name="chevL" size={16} />Cancel holiday</button></PageHead>
        <div className="card"><Empty icon="sun" title={type === 'holiday' ? 'Your streak is safe today' : 'Exam day: tasks hidden, streak safe'} text="Nothing is due. Your plan was reshuffled and you can undo it any time from Trash & History." action={<button className="btn btn-primary" onClick={() => nav('/app/plan')}>Look at tomorrow</button>} /></div></div>
    );
  }

  return (
    <div className="page">
      <PageHead eyebrow={`${fmtLong(today)}${order ? ` · Day Order ${order}` : ''}`} title={<>{greeting(hour)}, {st.settings.name}</>}>
        <span className={`streak${meta.streak.todayCounts ? '' : ' risk'}`} title={meta.streak.todayCounts ? 'Today counts toward your streak' : `Reach ${st.settings.streakThreshold}% today to extend it`}><Icon name="flame" size={16} fill />{meta.streak.current} day streak</span>
        <QuestButton />
        <button className="btn" onClick={() => ui.openShift('reset', today)} title="Re-plan the rest of today"><Icon name="refresh" size={16} />Reset my day</button>
        <button className="btn btn-primary" onClick={() => ui.openShift()} title="Shift (S)"><Icon name="shift" size={16} />Shift</button>
      </PageHead>

      <div className="layout-3">
        <div className="col gap-3">
          {/* header card: ring + top 3 + intention + momentum */}
          <section className="card reveal" aria-label="Day overview" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', alignItems: 'center' }}>
            <Ring value={stats.pct / 100} size={132} stroke={12} segments={ringSegs} label={`Day progress ${stats.pct} percent`}>
              <div><div className="display tnum" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}><CountUp to={stats.pct} suffix="%" /></div><div className="tiny muted">{stats.done}/{stats.planned} done</div></div>
            </Ring>
            <div className="col gap-2" style={{ minWidth: 0 }}>
              <div className="row between wrap gap-2">
                <b className="small row gap-1" style={{ color: 'var(--accent-text)' }}><Icon name="star" size={15} fill />Top 3</b>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowSuggest(!showSuggest)}>{top3.length < 3 ? 'Pin a task' : 'Edit'}</button>
              </div>
              <div className="col gap-1" role="list" aria-label="Top 3">
                {[0, 1, 2].map((i) => { const t = top3[i]; return t ? (
                  <div key={t.id} role="listitem" className="row gap-2" style={{ minWidth: 0 }}>
                    <button type="button" className={`check${t.status === 'done' ? ' on' : ''}`} style={{ width: 22, height: 22, ['--cat' as string]: 'var(--accent)' }} aria-label={t.status === 'done' ? `${t.title} done` : `Complete ${t.title}`} onClick={() => t.status !== 'done' ? completeWithFx(t.id) : undefined}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg></button>
                    <span className="ellipsis small" style={{ textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? 'var(--muted)' : undefined, fontWeight: 600 }}>{t.title}</span>
                    <span className="tiny faint tnum">{fmtTime(t.start, hr)}</span>
                  </div>) : (
                  <div key={i} role="listitem" className="row gap-2 faint small"><span className="check" style={{ width: 22, height: 22, borderStyle: 'dashed' }} /><span>Empty slot</span></div>); })}
              </div>
              <AnimatePresence>{showSuggest && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                  <div className="row wrap gap-1">{candidates.map((c) => <button key={c.id} className="chip accent" style={{ cursor: 'pointer' }} onClick={() => { if (!st.toggleTop3(c.id)) ui.toast('Top 3 is full. Unpin one first.', { kind: 'warn' }); }}>+ {c.title}</button>)}
                    {top3.map((c) => <button key={c.id} className="chip" style={{ cursor: 'pointer' }} onClick={() => st.toggleTop3(c.id)}>− {c.title}</button>)}</div>
                </motion.div>)}</AnimatePresence>
              <div className="momentum" role="progressbar" aria-label="Momentum" aria-valuenow={momentum} aria-valuemax={8}><i style={{ width: `${Math.min(100, momentum * 12.5)}%` }} /></div>
              <div className="row between gap-2 wrap"><span className="small muted">{momentum > 0 ? `${momentum} in a row` : 'Complete one to start momentum'}</span>
                {editInt ? (
                  <form className="row gap-1 grow" onSubmit={(e) => { e.preventDefault(); st.setIntention(today, intDraft); setEditInt(false); }}><input autoFocus className="input" style={{ minHeight: 34 }} value={intDraft} onChange={(e) => setIntDraft(e.target.value)} onBlur={() => { st.setIntention(today, intDraft); setEditInt(false); }} aria-label="Day intention" placeholder="One line for today" maxLength={90} /></form>
                ) : <button className="btn btn-ghost btn-sm ellipsis" style={{ maxWidth: '100%' }} onClick={() => setEditInt(true)}><Icon name="target" size={14} />{intention || 'Set today’s intention'}</button>}</div>
            </div>
          </section>

          {tasks.length > 0 && <section className="card reveal" aria-label="Add a task for today" style={{ padding: '0.9rem 1rem' }}><QuickAddBar date={today} placeholder="Add to today: Read ch.4 3pm 45m  (no time = next free slot)" /></section>}

          {prompt && (
            <div className="banner accent reveal" role="status"><Icon name="flag" /><div className="grow small"><b>{prompt.title}</b> was announced for {fmtLong(prompt.date)}. Shift your plan?</div>
              <button className="btn btn-sm btn-primary" onClick={() => ui.openShift('holiday', prompt.date)}>Preview shift</button><button className="btn btn-sm btn-ghost" onClick={() => st.dismissHolidayPrompt()}>Dismiss</button></div>)}

          {hour >= 5 && hour < 12 && !checkin.energy && !muted.includes('ci') && (
            <div className="banner info reveal" role="group" aria-label="Morning check-in"><Icon name="bolt" /><div className="grow small"><b>Energy check-in</b> · I’ll suggest what suits you now. Nothing moves without your OK.</div>
              {(['low', 'okay', 'high'] as const).map((e) => <button key={e} className="btn btn-sm" onClick={() => { st.setCheckin(today, { energy: e }); ui.toast(e === 'low' ? 'Low energy: start with the lightest task. Tiny Start is one tap away.' : e === 'high' ? 'High energy: tackle the hardest task first.' : 'Steady. Follow the plan.', { kind: 'good' }); }}>{e}</button>)}
              <button className="btn btn-sm btn-ghost" onClick={() => setMuted([...muted, 'ci'])} aria-label="Skip check-in"><Icon name="x" size={14} /></button></div>)}

          <AnimatePresence>
            {nudge && (
              <motion.div key={nudge.id} className="nudge" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} role="status">
                <Icon name="coffee" size={22} />
                <div className="grow" style={{ minWidth: 200 }}><b>{nudge.title}</b> was due at {fmtTime(nudge.start, hr)}.<div className="small muted">{st.settings.tips ? nudgeTip : 'Whenever you are ready.'}</div></div>
                <div className="row wrap gap-1">
                  <button className="btn btn-sm btn-primary" onClick={() => startFocus(nudge)}>Start now</button>
                  <button className="btn btn-sm" onClick={() => startFocus(nudge, 'tiny_start', 5)}>Tiny Start</button>
                  <button className="btn btn-sm" onClick={() => ui.openEditor({ id: nudge.id })}>Break it down</button>
                  <button className="btn btn-sm" onClick={() => { st.updateTask(nudge.id, { start: fromMin(Math.ceil((now + 30) / 15) * 15) }); setMuted([...muted, nudge.id]); }}>Move later</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setMuted([...muted, nudge.id])}>Not today</button>
                </div>
              </motion.div>)}
          </AnimatePresence>

          {/* Now card */}
          {nowTask ? <NowCard task={nowTask} now={now} onStart={() => startFocus(nowTask)} /> : allDone ? null : next ? (
            <section className="card reveal row gap-3 wrap" style={{ justifyContent: 'space-between' }}>
              <div><div className="eyebrow small accent" style={{ fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Up next · in {fmtDur(toMin(next.start) - now)}</div><h2 className="mt-1">{next.title}</h2><p className="muted small">{fmtTime(next.start, hr)}–{fmtTime(endOf(next.start, next.dur), hr)} · {fmtDur(next.dur)}</p></div>
              <div className="row gap-2"><button className="btn" onClick={() => startFocus(next, 'tiny_start', 5)}>Tiny Start</button><button className="btn btn-primary" onClick={() => startFocus(next)}><Icon name="play" size={16} />Start now</button></div></section>
          ) : tasks.length === 0 ? (
            <Workflow date={today} />
          ) : null}

          {late.length > 0 && (
            <section aria-label="Needs attention" className="col gap-2">
              <div className="row gap-2"><Icon name="alert" size={18} style={{ color: 'var(--warn)' }} /><h3>Needs attention</h3><span className="chip warn">{late.length}</span></div>
              <p className="small muted" style={{ marginTop: -4 }}>These were scheduled for a time that has passed. Do them now, move them, or skip. Nothing is lost.</p>
              {late.map((t) => <Attention key={t.id} t={t} now={now} />)}
            </section>)}

          {allDone && <EndOfDay tasks={tasks} stats={stats} date={today} unplannedTomorrow={unplannedTomorrow} />}
          {!allDone && evening && tasks.length > 0 && unplannedTomorrow && (
            <div className="banner accent"><Icon name="plan" /><div className="grow small"><b>Plan tomorrow</b> · It takes about two minutes and makes tomorrow start itself.</div><button className="btn btn-sm btn-primary" onClick={() => nav('/app/plan')}>Plan now</button></div>)}

          <section aria-label="Today's tasks" className="col gap-2">
            <div className="row between"><h3>Your day</h3><span className="small muted">{tasks.length} tasks · {fmtDur(tasks.reduce((a, t) => a + t.dur, 0))} planned</span></div>
            {tasks.length === 0 ? null : <div className="col gap-2">
              <AnimatePresence initial={false}>{tasks.map((t) => <TaskCard key={t.id} task={t} isToday now={now} />)}</AnimatePresence>
            </div>}
          </section>
        </div>

        {/* side panel */}
        <aside className="side-col" aria-label="Insights">
          <section className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--r-xl)' }}>
            <div style={{ borderRadius: 'inherit', overflow: 'hidden', height: 190 }}><Apex stage={stageIdx} health={Math.max(0.25, stats.pct / 100)} kind={st.settings.apexVisual} height={190} /></div>
            <div style={{ padding: '1rem 1.25rem' }}>
              <div className="row between"><h3>{STAGE_NAMES[stageIdx]}</h3><span className="chip accent">Stage {stageIdx + 1}/9</span></div>
              <p className="small muted mt-1">{nextMilestone ? `${nextMilestone - meta.streak.current} more day${nextMilestone - meta.streak.current === 1 ? '' : 's'} to grow your Apex.` : 'Your Apex is at its peak.'}</p>
              <div className="pbar mt-2"><i style={{ width: `${Math.round(meta.levelPct * 100)}%` }} /></div>
              <div className="row between tiny muted mt-1"><span>Level {meta.level}</span><span>{meta.toNext} XP to next</span></div>
            </div>
          </section>
          <section className="card">
            <div className="card-title"><h3>Today</h3><span className="help" title="Completion rate = (done + 0.5 × halfway + 0.25 × good starts) ÷ (planned − skipped). Weights are set in Settings.">?</span></div>
            <div className="grid-2">
              <Stat label="Done" value={<><CountUp to={stats.done} />/{stats.planned}</>} />
              <Stat label="Time on task" value={fmtDur(stats.min)} />
              <Stat label="XP" value={meta.xp.toLocaleString()} />
              <Stat label="Best streak" value={meta.streak.best} />
            </div>
          </section>
          <ClassList date={today} />
          <section className="card">
            <div className="card-title"><h3>Inbox</h3><button className="btn btn-ghost btn-sm" onClick={() => ui.setCapture(true)}><Icon name="plus" size={14} />Capture</button></div>
            {st.inbox.length === 0 ? <p className="small muted">Empty. Press <span className="kbd">I</span> any time to capture a thought.</p> : <div className="col gap-1">{st.inbox.slice(0, 3).map((i) => <div key={i.id} className="small ellipsis">• {i.text}</div>)}{st.inbox.length > 3 && <button className="btn btn-ghost btn-sm" onClick={() => nav('/app/plan')}>+{st.inbox.length - 3} more in planner</button>}</div>}
          </section>
          <p className="small muted" style={{ padding: '0 0.5rem' }}>{allDone ? line('perfect', st.settings.tone) : late.length ? line('behind', st.settings.tone) : hour < 12 ? line('morning', st.settings.tone) : line('focus', st.settings.tone)}</p>
        </aside>
      </div>
    </div>
  );
}

function NowCard({ task, now, onStart }: { task: Task; now: number; onStart: () => void }) {
  const st = useStore();
  const cat = st.categories.find((c) => c.id === task.categoryId);
  const left = toMin(task.start) + task.dur - now;
  const total = task.dur;
  const warm = left <= 5 && left > 0;
  const pct = Math.max(0, Math.min(1, 1 - left / total));
  const hr = st.settings.hour12;
  const tier = taskTier(task, st.settings);
  return (
    <motion.section layout className={`now-card${warm ? ' warm' : ''}${st.settings.motion === 'reduced' ? ' calm' : ''}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} aria-label="Now">
      <div className="col gap-2" style={{ minWidth: 0 }}>
        <div className="row gap-2 wrap"><span className="chip accent"><Icon name="bolt" size={12} />Now</span><span className="chip" style={{ ['--c' as string]: cat?.color }}><i className="dot" />{cat?.name}</span>{tier && <span className="chip good">{tier.label}</span>}{task.top3 && <span className="chip accent"><Icon name="star" size={11} fill />Top 3</span>}</div>
        <h2 className="clamp-2">{task.title}</h2>
        <p className="muted small tnum">{fmtTime(task.start, hr)}–{fmtTime(endOf(task.start, task.dur), hr)} · {left > 0 ? `${fmtDur(left)} left` : `${fmtDur(-left)} over — fine, planned time is a guide`}</p>
        {task.subtasks.length > 0 && <div className="pbar"><i style={{ width: `${(task.subtasks.filter((s) => s.done).length / task.subtasks.length) * 100}%` }} /></div>}
        <div className="row wrap gap-2 mt-1">
          <button className="btn btn-primary btn-lg" onClick={onStart}><Icon name="play" />Start <span className="kbd" style={{ background: 'rgba(0,0,0,.15)', border: 0, color: 'inherit' }}>F</span></button>
          <button className="btn btn-lg" onClick={() => completeWithFx(task.id, document.querySelector('.now-card'))}><Icon name="check" />Complete</button>
          <button className="btn btn-ghost" onClick={() => st.updateTask(task.id, { dur: task.dur + 10 })}>+10 min</button>
        </div>
      </div>
      <Ring value={pct} size={128} stroke={11} warm={warm} color={cat?.color} label={`${Math.round(pct * 100)} percent of planned time elapsed`}>
        <div><div className="display tnum" style={{ fontSize: '1.7rem', fontWeight: 700 }}>{left > 0 ? left : 0}</div><div className="tiny muted">min left</div></div>
      </Ring>
    </motion.section>
  );
}

function Attention({ t, now }: { t: Task; now: number }) {
  const st = useStore();
  const ui = useUI.getState();
  const p = Math.round(((t.spentMin || 0) / t.dur) * 100);
  const [skip, setSkip] = useState(false);
  const reasons = ['Not needed', 'Ran out of time', 'Too tired', 'Class changed'];
  return (
    <motion.div layout className="card flat" style={{ borderColor: 'color-mix(in srgb, var(--warn) 45%, transparent)', padding: '0.9rem 1rem' }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="row gap-3 wrap">
        <div className="grow" style={{ minWidth: 180 }}><b>{t.title}</b><div className="small muted">{fmtTime(t.start, st.settings.hour12)} · {fmtDur(t.dur)}{p > 0 ? ` · You did ${p}% — nice start` : ''}</div></div>
        <div className="row wrap gap-1">
          {p > 0 && <button className="btn btn-sm btn-soft" onClick={() => { ui.setFocus({ taskId: t.id, mode: 'free', workMin: 25, breakMin: 5, phase: 'work', running: true, elapsed: 0, round: 1, interruptions: 0, banked: 0, totalWork: 0 }); }}>Continue now</button>}
          <button className="btn btn-sm" onClick={() => completeWithFx(t.id)}>Done late</button>
          <button className="btn btn-sm" onClick={() => st.updateTask(t.id, { start: fromMin(Math.ceil((now + 10) / 15) * 15) })}>Move later today</button>
          <button className="btn btn-sm" onClick={() => { st.moveToTomorrow(t.id); ui.toast(`“${t.title}” moved to tomorrow`, { kind: 'good' }); }}>Tomorrow</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setSkip(!skip)}>Skip…</button>
        </div>
      </div>
      {skip && <div className="row wrap gap-1 mt-2">{reasons.map((r) => <button key={r} className="chip" style={{ cursor: 'pointer' }} onClick={() => { st.skipTask(t.id, r); ui.toast(`Skipped: ${r}`, { action: { label: 'Undo', run: () => useStore.getState().updateTask(t.id, { status: 'planned', skipReason: undefined }) } }); }}>{r}</button>)}</div>}
    </motion.div>
  );
}

function EndOfDay({ tasks, stats, date, unplannedTomorrow }: { tasks: Task[]; stats: ReturnType<typeof dayStats>; date: string; unplannedTomorrow: boolean }) {
  const st = useStore();
  const nav = useNavigate();
  const [text, setText] = useState(st.reflections.find((r) => r.period === 'day' && r.start === date)?.text ?? '');
  const top3 = tasks.filter((t) => t.top3);
  const top3Done = top3.filter((t) => t.status === 'done').length;
  const sealed = st.sealed.includes(date);
  const started = tasks.filter((t) => t.status !== 'done' && t.spentMin > 0);
  const biggest = [...tasks].filter((t) => t.status === 'done').sort((a, b) => b.dur - a.dur)[0];
  return (
    <motion.section className="card accent reveal" aria-label="End of day" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="row between wrap gap-2"><h2>End of day</h2><span className="chip" style={{ background: 'rgba(0,0,0,.14)', border: 0, color: 'inherit' }}>{stats.pct}% complete</span></div>
      <div className="grid-4 keep2 mt-3" style={{ color: 'var(--accent-ink)' }}>
        <Stat label="Tasks done" value={stats.done} /><Stat label="Time on task" value={fmtDur(stats.min)} /><Stat label="Top 3" value={`${top3Done}/${top3.length || 3}`} /><Stat label="Streak" value={<>{useStreakText()}</>} />
      </div>
      {biggest && <p className="mt-3" style={{ fontWeight: 600 }}>Highlight: “{biggest.title}” — {fmtDur(biggest.dur)} of real work.</p>}
      {started.length > 0 && <p className="small mt-1">You started {started.length} task{started.length > 1 ? 's' : ''} and spent {fmtDur(started.reduce((a, t) => a + t.spentMin, 0))} on things you almost skipped.</p>}
      <div className="field mt-3"><label style={{ color: 'inherit', opacity: 0.7 }} htmlFor="eod">One line of reflection (optional)</label>
        <input id="eod" className="input" style={{ background: 'rgba(255,255,255,.55)', color: '#0b0b0c', borderColor: 'transparent' }} value={text} onChange={(e) => setText(e.target.value)} placeholder="What went well?" /></div>
      <div className="row wrap gap-2 mt-3">
        <button className="btn" style={{ background: '#0b0b0c', color: '#fff', borderColor: 'transparent' }} onClick={() => { if (text.trim()) st.addReflection({ period: 'day', start: date, text: text.trim(), rating: 4 }); if (!sealed) st.sealDay(date); nav('/app/plan'); useUI.getState().setViewDate(addDays(date, 1)); }}>{unplannedTomorrow ? 'Seal day & plan tomorrow' : 'Seal day & review tomorrow'}<Icon name="arrowR" size={16} /></button>
        {sealed && <span className="chip" style={{ background: 'rgba(0,0,0,.14)', border: 0, color: 'inherit' }}><Icon name="lock" size={12} />Sealed</span>}
      </div>
    </motion.section>
  );
}
function useStreakText() { const m = useProgressMeta(); return <>{m.streak.current}d</>; }
