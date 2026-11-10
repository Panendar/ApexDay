import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { Empty, PageHead } from '../components/Bits';
import { CountUp } from '../components/Ring';
import { useStore, summaryFor, tasksOn } from '../store/useStore';
import { useUI } from '../store/useUI';
import { useProgressMeta, useToday } from '../lib/hooks';
import { isActive } from '../lib/progress';
import { addDays, DOW, dow, fmtDate, fmtDur, weekStartOf } from '../lib/time';

export default function Reviews() {
  const st = useStore();
  const today = useToday();
  const meta = useProgressMeta();
  const [tab, setTab] = useState<'week' | 'day' | 'month'>('week');
  const [ritual, setRitual] = useState(false);
  const [recap, setRecap] = useState(false);
  const lastWs = addDays(weekStartOf(today, st.settings.weekStart), -7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(lastWs, i));
  const sums = days.map((d) => ({ d, s: summaryFor(st, d) }));
  const real = sums.filter((x) => x.s && !x.s.kind && x.s.planned);
  const avg = real.length ? Math.round(real.reduce((a, x) => a + x.s!.pct, 0) / real.length) : 0;
  const best = [...real].sort((a, b) => b.s!.pct - a.s!.pct)[0];
  const low = [...real].sort((a, b) => a.s!.pct - b.s!.pct)[0];
  const mins = sums.reduce((a, x) => a + (x.s?.min ?? 0), 0);
  const reflections = st.reflections.filter((r) => r.period === tab);

  const share = () => { // shareable image: numbers only, no task titles
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const g = c.getContext('2d')!;
    g.fillStyle = '#0b0b0c'; g.fillRect(0, 0, 1080, 1350);
    const gr = g.createRadialGradient(540, 200, 20, 540, 200, 700); gr.addColorStop(0, 'rgba(198,244,50,.28)'); gr.addColorStop(1, 'transparent'); g.fillStyle = gr; g.fillRect(0, 0, 1080, 1350);
    g.fillStyle = '#fff'; g.font = '700 64px system-ui'; g.fillText('My week on ApexDay', 80, 160);
    g.fillStyle = '#c6f432'; g.font = '800 300px system-ui'; g.fillText(`${avg}%`, 80, 520);
    g.fillStyle = '#9a9aa3'; g.font = '500 40px system-ui'; g.fillText('average completion', 90, 590);
    g.fillStyle = '#fff'; g.font = '600 48px system-ui'; g.fillText(`${fmtDur(mins)} on task`, 80, 760); g.fillText(`${meta.streak.current}-day streak`, 80, 840); g.fillText(`Level ${meta.level}`, 80, 920);
    days.forEach((d, i) => { const p = summaryFor(st, d)?.pct ?? 0; g.fillStyle = '#232327'; g.fillRect(80 + i * 135, 1220 - 220, 100, 220); g.fillStyle = '#c6f432'; g.fillRect(80 + i * 135, 1220 - (p / 100) * 220, 100, (p / 100) * 220); g.fillStyle = '#9a9aa3'; g.font = '500 28px system-ui'; g.fillText(DOW[dow(d)], 100 + i * 135, 1270); });
    const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'apexday-week.png'; a.click();
  };

  return (
    <div className="page">
      <PageHead eyebrow="Reviews" title="Look back, aim forward"><button className="btn btn-primary" onClick={() => setRitual(true)}><Icon name="sparkle" size={16} />Weekly planning ritual</button></PageHead>
      <div className="tabs" role="tablist">{(['week', 'day', 'month'] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{k === 'week' ? 'Weekly' : k === 'day' ? 'Daily' : 'Monthly'}</button>)}</div>

      {tab === 'week' && (
        <div className="col gap-3 stagger">
          <section className="card accent">
            <div className="row between wrap gap-2"><h2>Last week · {fmtDate(lastWs)} – {fmtDate(addDays(lastWs, 6))}</h2><div className="row gap-2"><button className="btn" style={{ background: '#0b0b0c', color: '#fff', borderColor: 'transparent' }} onClick={() => setRecap(true)}><Icon name="play" size={16} />Play recap</button><button className="btn" style={{ background: 'rgba(0,0,0,.14)', borderColor: 'transparent', color: 'inherit' }} onClick={share}><Icon name="share" size={16} />Share image</button></div></div>
            <div className="grid-3 mt-3" style={{ color: 'var(--accent-ink)' }}>
              <div className="stat"><span className="l">Average completion</span><span className="v"><CountUp to={avg} suffix="%" /></span></div>
              <div className="stat"><span className="l">Time on task</span><span className="v">{fmtDur(mins)}</span></div>
              <div className="stat"><span className="l">Streak</span><span className="v">{meta.streak.current}d</span></div>
            </div>
          </section>
          <div className="grid-3">
            <section className="card"><div className="row gap-2"><Icon name="trophy" style={{ color: 'var(--accent-text)' }} /><b>Wins</b></div><p className="small muted mt-2">{best ? `${DOW[dow(best.d)]} was your best day at ${best.s!.pct}%.` : 'Plan a few days and wins will appear here.'}</p></section>
            <section className="card"><div className="row gap-2"><Icon name="wind" style={{ color: 'var(--info)' }} /><b>Gentle lowlight</b></div><p className="small muted mt-2">{low && low !== best ? `${DOW[dow(low.d)]} was lighter at ${low.s!.pct}%. That is normal; bad days still count when you start small.` : 'Nothing worth worrying about.'}</p></section>
            <section className="card"><div className="row gap-2"><Icon name="target" style={{ color: 'var(--warn)' }} /><b>Goal for this week</b></div><p className="small muted mt-2">{st.intentions['week-' + weekStartOf(today, st.settings.weekStart)] ?? 'Run the weekly ritual to set a headline.'}</p></section>
          </div>
        </div>)}

      {tab !== 'week' && (
        <div className="col gap-3">
          {reflections.length === 0 ? <section className="card"><Empty icon="book" title={tab === 'day' ? 'No daily reflections yet' : 'No monthly reflection yet'} text={tab === 'day' ? 'Finish the day on Today and add one line in the End of Day card.' : 'At month end, write one line about what you want to carry forward.'} />{tab === 'month' && <div className="row center"><button className="btn" onClick={() => { st.addReflection({ period: 'month', start: today.slice(0, 7) + '-01', text: 'Keep the morning run. Plan tomorrow every night.', rating: 4 }); }}>Add sample reflection</button></div>}</section>
            : reflections.map((r) => <section key={r.id} className="card"><div className="row between"><b>{fmtDate(r.start)}</b><span className="chip">{'★'.repeat(r.rating)}</span></div><p className="muted mt-2">{r.text}</p></section>)}
        </div>)}

      <AnimatePresence>{ritual && <Ritual onClose={() => setRitual(false)} avg={avg} />}{recap && <Recap onClose={() => setRecap(false)} best={best?.d} mins={mins} streak={meta.streak.current} avg={avg} />}</AnimatePresence>
    </div>
  );
}

function Ritual({ onClose, avg }: { onClose: () => void; avg: number }) {
  const st = useStore();
  const today = useToday();
  const [step, setStep] = useState(0);
  const [head, setHead] = useState('');
  const ws = weekStartOf(today, st.settings.weekStart);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const upcomingDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i)).filter((d) => d >= today);
  const big = useMemo(() => st.inbox.slice(0, 4), [st.inbox]);
  const finish = () => {
    st.setIntention('week-' + ws, head || 'A steady week');
    Object.entries(assign).forEach(([id, d]) => { if (d) st.promoteInbox(id, { date: d, start: '10:00', dur: 60 }); });
    useStore.setState((s) => ({ xp: s.xp + 50, counters: { ...s.counters, planned: s.counters.planned + 1 } }));
    useUI.getState().toast('Weekly ritual done. +50 XP. Your week has a headline.', { kind: 'good' }); onClose();
  };
  return (
    <Modal title={['Review last week', 'Set the week’s goal', 'Drop big tasks onto days'][step]} subtitle={`Step ${step + 1} of 3`} onClose={onClose}
      footer={<>{step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>Back</button>}{step < 2 ? <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Next<Icon name="arrowR" size={16} /></button> : <button className="btn btn-primary" onClick={finish}><Icon name="check" size={16} />Finish ritual</button>}</>}>
      <div className="step-dots" style={{ marginBottom: 16 }}>{[0, 1, 2].map((i) => <i key={i} className={i === step ? 'on' : ''} />)}</div>
      {step === 0 && <div className="col gap-2"><p>Last week you averaged <b className="accent">{avg}%</b>. Every start counts, and nothing here is a score against you.</p><div className="banner accent small"><Icon name="sparkle" /><div>Notice one thing that helped, and carry it into this week.</div></div></div>}
      {step === 1 && <div className="field"><label htmlFor="wh">This week’s headline</label><input id="wh" autoFocus className="input" value={head} onChange={(e) => setHead(e.target.value)} placeholder="e.g. Finish graph algorithms and ship the MVP" maxLength={90} /></div>}
      {step === 2 && (big.length ? <div className="col gap-2">{big.map((i) => <div key={i.id} className="row gap-2"><span className="grow small">{i.text}</span><select className="select" style={{ width: 150 }} value={assign[i.id] ?? ''} onChange={(e) => setAssign({ ...assign, [i.id]: e.target.value })} aria-label={`Day for ${i.text}`}><option value="">Not now</option>{upcomingDays.map((d) => <option key={d} value={d}>{fmtDate(d, today)}</option>)}</select></div>)}</div> : <Empty icon="inbox" title="Inbox is empty" text="Nothing to place. You can finish the ritual." />)}
    </Modal>
  );
}

function Recap({ onClose, best, mins, streak, avg }: { onClose: () => void; best?: string; mins: number; streak: number; avg: number }) {
  const slides = [
    { icon: 'chart', big: `${avg}%`, sub: 'average completion last week' },
    { icon: 'trophy', big: best ? DOW[dow(best)] : '—', sub: 'your best day' },
    { icon: 'bolt', big: fmtDur(mins), sub: 'of focused work' },
    { icon: 'flame', big: `${streak} days`, sub: 'and the streak keeps growing' },
  ];
  const [i, setI] = useState(0);
  return (
    <motion.div className="celebrate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => (i < slides.length - 1 ? setI(i + 1) : onClose())} role="dialog" aria-label="Weekly recap">
      <AnimatePresence mode="wait"><motion.div key={i} className="celebrate-card" initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
        <div className="avatar shine" style={{ width: 84, height: 84, borderRadius: 28, margin: '0 auto 1rem', background: 'var(--accent)', color: 'var(--accent-ink)' }}><Icon name={slides[i].icon} size={40} /></div>
        <h2>{slides[i].big}</h2><p className="muted mt-2">{slides[i].sub}</p><div className="step-dots mt-3" style={{ justifyContent: 'center' }}>{slides.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div><p className="tiny faint mt-3">Click to continue</p>
      </motion.div></AnimatePresence>
    </motion.div>
  );
}
