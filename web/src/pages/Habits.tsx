import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { Empty, PageHead, Seg } from '../components/Bits';
import { Ring } from '../components/Ring';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { useToday } from '../lib/hooks';
import { addDays, DOW, dow } from '../lib/time';
import { burst, centerOf } from '../lib/fx';
import type { Habit } from '../lib/types';

function habitStreak(logs: { habitId: string; date: string; count: number }[], h: Habit, today: string) {
  const ok = (d: string) => (logs.find((l) => l.habitId === h.id && l.date === d)?.count ?? 0) >= h.target;
  const skip = (d: string) => h.cadence === 'weekdays' && [0, 6].includes(dow(d));
  let n = 0, d = ok(today) ? today : addDays(today, -1);
  for (let i = 0; i < 400; i++) { if (skip(d)) { d = addDays(d, -1); continue; } if (ok(d)) { n++; d = addDays(d, -1); } else break; }
  return n;
}

export default function Habits() {
  const st = useStore();
  const today = useToday();
  const ui = useUI.getState();
  const [tab, setTab] = useState<'habits' | 'goals'>('habits');
  const [addH, setAddH] = useState(false);
  const [addG, setAddG] = useState(false);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  return (
    <div className="page">
      <PageHead eyebrow="Habits & Goals" title="Small daily wins, long-term direction"><button className="btn btn-primary" onClick={() => (tab === 'habits' ? setAddH(true) : setAddG(true))}><Icon name="plus" size={16} />{tab === 'habits' ? 'New habit' : 'New goal'}</button></PageHead>
      <div className="tabs" role="tablist"><button role="tab" aria-selected={tab === 'habits'} className={tab === 'habits' ? 'on' : ''} onClick={() => setTab('habits')}>Habits</button><button role="tab" aria-selected={tab === 'goals'} className={tab === 'goals' ? 'on' : ''} onClick={() => setTab('goals')}>Goals</button></div>

      {tab === 'habits' && (
        <div className="grid-auto stagger">
          {st.habits.map((h) => {
            const cur = st.habitLogs.find((l) => l.habitId === h.id && l.date === today)?.count ?? 0;
            const streak = habitStreak(st.habitLogs, h, today);
            const state = h.paused ? 'paused' : cur > h.target ? 'over' : cur >= h.target ? 'done' : 'pending';
            return (
              <section key={h.id} className="card hover" style={{ ['--c' as string]: h.color }}>
                <div className="row between"><div className="row gap-2"><span className="avatar"><Icon name={h.icon} /></span><div><b>{h.name}</b><div className="tiny muted">{h.cadence === 'daily' ? 'Every day' : 'Weekdays'} · {h.target} {h.unit}</div></div></div><span className="streak" title="Habit streak"><Icon name="flame" size={13} fill />{streak}</span></div>
                <div className="row gap-4 mt-3">
                  <Ring value={Math.min(1, cur / h.target)} size={84} stroke={9} color={h.color}><div><b className="tnum">{cur}</b><div className="tiny muted">/{h.target}</div></div></Ring>
                  <div className="col gap-2 grow">
                    <span className={`chip ${state === 'done' || state === 'over' ? 'good' : ''}`} style={{ alignSelf: 'flex-start' }}>{state === 'over' ? 'Over target' : state === 'done' ? 'Done today' : state === 'paused' ? 'Paused' : 'Pending'}</span>
                    <div className="row gap-1"><button className="btn btn-icon btn-sm" aria-label={`Remove one ${h.unit}`} onClick={() => st.logHabit(h.id, today, -1)}><Icon name="minus" size={14} /></button>
                      <button className="btn btn-primary btn-sm" onClick={(e) => { st.logHabit(h.id, today, 1); if (cur + 1 === h.target) { const c = centerOf(e.currentTarget); burst({ ...c, color: h.color }); ui.toast(`${h.name}: done for today`, { kind: 'good', ttl: 1800 }); } }}><Icon name="plus" size={14} />Log</button></div>
                  </div>
                </div>
                <div className="row gap-1 mt-3" role="img" aria-label="Last seven days">{week.map((d) => { const c = st.habitLogs.find((l) => l.habitId === h.id && l.date === d)?.count ?? 0; const full = c >= h.target; return <div key={d} className="col" style={{ alignItems: 'center', gap: 3, flex: 1 }}><span className="tiny faint">{DOW[dow(d)][0]}</span><i style={{ width: '100%', aspectRatio: '1', borderRadius: 7, background: full ? h.color : c > 0 ? `color-mix(in srgb, ${h.color} 35%, var(--surface-3))` : 'var(--surface-3)' }} /></div>; })}</div>
              </section>);
          })}
          {st.habits.length === 0 && <Empty icon="target" title="No habits yet" text="Untimed check-ins like water, reading or the gym. Add one to start a streak." />}
        </div>)}

      {tab === 'goals' && (
        <div className="grid-auto stagger">
          {st.goals.map((g) => {
            const cat = st.categories.find((c) => c.id === g.categoryId);
            const pct = Math.min(100, (g.progress / g.targetValue) * 100);
            const pace = 62; // expected pace marker (demo)
            return (
              <section key={g.id} className="card hover" style={{ ['--c' as string]: cat?.color }}>
                <div className="row between"><span className="chip" style={{ ['--c' as string]: cat?.color }}><i className="dot" />{cat?.name}</span>{pct >= 100 && <span className="chip good">Achieved</span>}</div>
                <h3 className="mt-2">{g.title}</h3>
                <div className="pbar lg mt-3" style={{ position: 'relative' }}><i style={{ width: `${pct}%` }} /><span title="Pace marker" style={{ position: 'absolute', left: `${pace}%`, top: -3, bottom: -3, width: 2, background: 'var(--text)', opacity: 0.55 }} /></div>
                <div className="row between small muted mt-2"><span>{g.progress}/{g.targetValue} {g.targetType}</span><span>{Math.round(pct)}% · {pct >= pace ? 'ahead of pace' : 'a little behind: a good week closes it'}</span></div>
                <div className="row gap-2 mt-3"><button className="btn btn-sm" onClick={() => useStore.setState((s) => ({ goals: s.goals.map((x) => (x.id === g.id ? { ...x, progress: x.progress + 1 } : x)) }))}><Icon name="plus" size={14} />Log 1 {g.targetType === 'hours' ? 'hour' : 'task'}</button></div>
              </section>);
          })}
          {st.goals.length === 0 && <Empty icon="target" title="No goals yet" text="Link tasks and habits to a long-term goal and watch the bar move." />}
        </div>)}

      <AnimatePresence>{addH && <HabitForm onClose={() => setAddH(false)} />}{addG && <GoalForm onClose={() => setAddG(false)} />}</AnimatePresence>
    </div>
  );
}

function HabitForm({ onClose }: { onClose: () => void }) {
  const st = useStore();
  const [f, setF] = useState<Omit<Habit, 'id'>>({ name: '', icon: 'heart', color: '#c6f432', cadence: 'daily', target: 1, unit: 'time' });
  return (
    <Modal title="New habit" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => { if (!f.name.trim()) return; st.addHabit({ ...f, name: f.name.trim() }); onClose(); }}>Add habit</button></>}>
      <div className="col gap-3">
        <div className="field"><label htmlFor="hn">Name</label><input id="hn" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Stretch" autoFocus /></div>
        <div className="grid-2"><div className="field"><label htmlFor="ht">Target per day</label><input id="ht" className="input tnum" type="number" min={1} value={f.target} onChange={(e) => setF({ ...f, target: Math.max(1, Number(e.target.value)) })} /></div><div className="field"><label htmlFor="hu">Unit</label><input id="hu" className="input" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div></div>
        <div className="field"><label>Cadence</label><Seg value={f.cadence} onChange={(v) => setF({ ...f, cadence: v })} options={[{ v: 'daily', l: 'Every day' }, { v: 'weekdays', l: 'Weekdays' }]} /></div>
        <div className="field"><label>Color</label><div className="row gap-2 wrap">{['#c6f432', '#6ea8ff', '#ff8a65', '#c792ff', '#ffd166', '#5eead4'].map((c) => <button key={c} type="button" className="swatch" style={{ background: c, width: 36, height: 36, borderRadius: 12, borderColor: f.color === c ? 'var(--text)' : 'var(--line-2)' }} aria-label={c} onClick={() => setF({ ...f, color: c })} />)}</div></div>
      </div>
    </Modal>
  );
}
function GoalForm({ onClose }: { onClose: () => void }) {
  const st = useStore();
  const [title, setTitle] = useState(''); const [v, setV] = useState(20); const [type, setType] = useState<'hours' | 'tasks'>('hours'); const [cat, setCat] = useState('study');
  return (
    <Modal title="New goal" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => { if (!title.trim()) return; st.addGoal({ title: title.trim(), categoryId: cat, targetType: type, targetValue: v, due: '' }); onClose(); }}>Add goal</button></>}>
      <div className="col gap-3">
        <div className="field"><label htmlFor="gt">Goal</label><input id="gt" className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Finish the algorithms course" /></div>
        <div className="grid-2"><div className="field"><label>Measured in</label><Seg value={type} onChange={setType} options={[{ v: 'hours', l: 'Hours' }, { v: 'tasks', l: 'Tasks' }]} /></div><div className="field"><label htmlFor="gv">Target</label><input id="gv" className="input tnum" type="number" min={1} value={v} onChange={(e) => setV(Number(e.target.value))} /></div></div>
        <div className="field"><label htmlFor="gc">Category</label><select id="gc" className="select" value={cat} onChange={(e) => setCat(e.target.value)}>{st.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      </div>
    </Modal>
  );
}
