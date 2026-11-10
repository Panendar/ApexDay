import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Icon } from '../components/Icon';
import { Ring } from '../components/Ring';
import { Apex } from '../components/Apex';
import { Heatmap } from '../components/Charts';
import { THEMES } from '../lib/themes';
import { useStore } from '../store/useStore';
import { addDays, iso } from '../lib/time';
import { useUI } from '../store/useUI';
import AuthForm from '../components/AuthForm';

const DEMO = [
  { t: '07:30', n: 'Revise DSA: graphs', c: '#c6f432', d: '60m' },
  { t: '14:30', n: 'Physics assignment', c: '#6ea8ff', d: '90m' },
  { t: '18:00', n: 'Gym: push day', c: '#ff8a65', d: '60m' },
  { t: '19:30', n: 'DSA practice: 3 problems', c: '#c6f432', d: '90m' },
];

function HeroDemo() {
  const [done, setDone] = useState(0);
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setDone((d) => { const n = d >= DEMO.length ? 0 : d + 1; setBurst((b) => b + 1); return n; }), 1700);
    return () => clearInterval(i);
  }, []);
  const pct = Math.round((done / DEMO.length) * 100);
  return (
    <div className="demo" aria-label="Animated preview of the Today screen">
      <div className="demo-glow" />
      <div className="demo-card">
        <div className="row between"><div><div className="tiny muted" style={{ fontWeight: 700, letterSpacing: '.1em' }}>TUESDAY · DAY ORDER 3</div><b className="display" style={{ fontSize: '1.2rem' }}>Good morning, Asha</b></div><span className="streak"><Icon name="flame" size={14} fill />12</span></div>
        <div className="row gap-3 mt-3">
          <Ring value={pct / 100} size={92} stroke={9}><b className="display tnum" style={{ fontSize: '1.3rem' }}>{pct}%</b></Ring>
          <div className="col gap-1 grow">
            {DEMO.map((x, i) => (
              <motion.div key={x.n} layout className="demo-row" animate={{ opacity: i < done ? 0.6 : 1, x: i === done ? 4 : 0 }} style={{ ['--cat' as string]: x.c }}>
                <span className={`demo-check${i < done ? ' on' : ''}`}><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg></span>
                <span className="tnum faint tiny">{x.t}</span><span className="grow small ellipsis" style={{ textDecoration: i < done ? 'line-through' : 'none' }}>{x.n}</span><span className="tiny muted">{x.d}</span>
              </motion.div>))}
          </div>
        </div>
        <div className="momentum mt-3"><i style={{ width: `${pct}%` }} /></div>
        {done > 0 && <motion.div key={burst} className="xp-chip" style={{ position: 'absolute', right: 24, top: 70, left: 'auto', transform: 'none' }} initial={{ opacity: 0, y: 10, scale: 0.6 }} animate={{ opacity: [0, 1, 1, 0], y: -34, scale: 1 }} transition={{ duration: 1.3 }}>+{18 + done * 4} XP</motion.div>}
      </div>
      <div className="demo-apex"><Apex stage={Math.min(8, 2 + done)} health={0.4 + pct / 160} height={130} /></div>
    </div>
  );
}

function ShiftDemo() {
  const [hol, setHol] = useState(false);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const plan = [['DSA', 'Lab'], ['Physics', 'Gym'], ['DBMS', 'Read'], ['Project', 'Run'], ['Review', 'Plan']];
  const layout = hol ? [plan[0], ['—'], plan[1], plan[2], plan[3]] : plan;
  return (
    <div className="card">
      <div className="row between wrap gap-2"><div><h3>Surprise holiday on Tuesday?</h3><p className="small muted">One step. Preview first. Nothing lost. Undo any time.</p></div>
        <button className={`btn ${hol ? '' : 'btn-primary'}`} onClick={() => setHol(!hol)}>{hol ? <><Icon name="undo" size={16} />Undo</> : <><Icon name="shift" size={16} />Mark Tuesday a holiday</>}</button></div>
      <div className="grid-auto mt-3" style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 8 }}>
        {days.map((d, i) => (
          <motion.div layout key={d} className="board-col" style={{ minHeight: 140, padding: 8 }} animate={{ borderColor: hol && i === 1 ? 'var(--info)' : 'var(--line)' }}>
            <div className="tiny muted" style={{ fontWeight: 700 }}>{d.toUpperCase()}</div>
            {layout[i].map((x, k) => x === '—' ? <span key={k} className="chip info" style={{ alignSelf: 'flex-start' }}>Holiday</span> : <motion.div layout key={x} className="mini-task" style={{ ['--cat' as string]: ['#c6f432', '#6ea8ff', '#ff8a65', '#c792ff'][(k + i) % 4] }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}>{x}</motion.div>)}
          </motion.div>))}
      </div>
      <p className="small mt-3" style={{ color: 'var(--accent-text)', minHeight: 22 }}>{hol ? 'Plan reshuffled. 6 tasks moved, nothing lost.' : ''}</p>
    </div>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null); const v = useInView(ref, { once: true, margin: '-60px' });
  return <motion.div ref={ref} initial={{ opacity: 0, y: 28 }} animate={v ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay, ease: [0.2, 0.7, 0.2, 1] }}>{children}</motion.div>;
}

export default function Landing() {
  const nav = useNavigate();
  const set = useStore((s) => s.set);
  const today = iso(new Date());
  useEffect(() => { document.documentElement.dataset.theme = useStore.getState().settings.theme === 'light' ? 'light' : 'apex'; document.title = 'ApexDay — plan it. run it. shift it.'; }, []);
  const demoHeat = (d: string) => { const n = Array.from(d).reduce((a, c) => a + c.charCodeAt(0), 0); const p = (n * 37) % 100; return { pct: p < 12 ? 0 : 45 + (p % 56), done: 4, planned: 6, min: 200 }; };
  return (
    <div className="landing">
      <header className="land-nav">
        <Link to="/" className="brand" style={{ padding: 0 }}><span className="brand-mark"><Icon name="mountain" size={20} stroke={2.4} /></span>ApexDay</Link>
        <nav className="land-links" aria-label="Sections"><a href="#features">Features</a><a href="#shift">Shift</a><a href="#free">Free</a><a href="#faq">FAQ</a></nav>
        <button className="btn btn-primary" onClick={() => nav('/app')}>Open app<Icon name="arrowR" size={16} /></button>
      </header>

      <section className="land-hero">
        <div className="land-hero-copy">
          <motion.span className="chip accent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><Icon name="sparkle" size={13} />Free · offline-ready · never punishing</motion.span>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.7 }}>Plan it.<br />Run it.<br /><span className="grad">Shift it.</span></motion.h1>
          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.7 }}>The day tracker for people whose schedule keeps changing. Plan tomorrow in two minutes, complete tasks with feedback that feels good, and absorb a holiday or a day-order change in one reversible step.</motion.p>
          <motion.div className="row gap-3 wrap" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.7 }}>
            <button className="btn btn-primary btn-lg" onClick={() => nav('/app')}>Start free — no sign-up<Icon name="arrowR" size={18} /></button>
            <a className="btn btn-lg" href="#shift"><Icon name="play" size={16} />See Shift</a>
          </motion.div>
          <div className="row gap-4 wrap small muted" style={{ marginTop: '1.5rem' }}><span className="row gap-1"><Icon name="check" size={14} />Works offline</span><span className="row gap-1"><Icon name="check" size={14} />Your data stays yours</span><span className="row gap-1"><Icon name="check" size={14} />No paid tier</span></div>
        </div>
        <HeroDemo />
      </section>

      <div className="marquee" aria-hidden="true"><div className="marquee-track">{Array.from({ length: 2 }).flatMap((_, k) => ['Plan tomorrow in 2 minutes', 'Top 3', 'Focus Mode', 'Tiny Start 5 + 2', 'Day-order timetables', 'Undo everything', 'Fair streaks', 'Year heatmap', 'Apex grows with you'].map((x) => <span key={x + k}><i />{x}</span>))}</div></div>

      <section id="features" className="land-section">
        <Reveal><h2 className="land-h2">Everything keeps you <span className="grad">coming back</span></h2><p className="muted" style={{ maxWidth: 560 }}>Built around one question: does this make you open ApexDay tomorrow?</p></Reveal>
        <div className="bento">
          <Reveal><div className="card hover bento-a"><Icon name="shift" size={28} style={{ color: 'var(--accent-text)' }} /><h3>The Shift engine</h3><p className="muted">Holiday, day-order change, overrunning class. Preview the cascade across the week, apply as one batch, undo as one action. Fixed items are protected and nothing is silently dropped.</p></div></Reveal>
          <Reveal delay={0.05}><div className="card hover"><Icon name="bolt" size={28} style={{ color: 'var(--accent-text)' }} /><h3>Start small</h3><p className="muted">Tiny Start runs 5 minutes of work then a 2-minute break. 20% of a task counts as a win, and it is honestly counted.</p></div></Reveal>
          <Reveal delay={0.1}><div className="card hover"><Icon name="flame" size={28} style={{ color: 'var(--accent-text)' }} /><h3>Streaks that never punish</h3><p className="muted">Holidays and rest days are neutral. Freezes are offered, never forced. A missed day only dims your Apex.</p></div></Reveal>
          <Reveal delay={0.05}><div className="card hover bento-b"><div className="row between"><h3>Your year, at a glance</h3><Icon name="chart" size={22} style={{ color: 'var(--accent-text)' }} /></div><div style={{ pointerEvents: 'none', marginTop: 12 }}><Heatmap end={today} weeks={30} get={demoHeat} /></div></div></Reveal>
          <Reveal delay={0.1}><div className="card hover" style={{ padding: 0, overflow: 'hidden' }}><Apex stage={6} health={0.9} height={170} /><div style={{ padding: '1rem 1.25rem' }}><h3>Apex grows with you</h3><p className="muted small">A mountain, tree or flame that evolves at every streak milestone.</p></div></div></Reveal>
        </div>
      </section>

      <section id="shift" className="land-section"><Reveal><h2 className="land-h2">Real life changes. <span className="grad">Your plan keeps up.</span></h2></Reveal><Reveal delay={0.05}><ShiftDemo /></Reveal></section>

      <section className="land-section">
        <Reveal><h2 className="land-h2">Nine themes. One <span className="grad">premium feel.</span></h2></Reveal>
        <Reveal delay={0.05}><div className="theme-row">{THEMES.map((t) => <button key={t.id} className="theme-chip" style={{ background: `linear-gradient(135deg, ${t.bg} 55%, ${t.surface} 55%)`, color: t.id === 'light' ? '#0b0b0c' : '#fff' }} onClick={() => { document.documentElement.dataset.theme = t.id; set({ theme: t.id }); }} aria-label={`Try ${t.name} theme`}><i style={{ background: t.accent }} />{t.name}</button>)}</div></Reveal>
      </section>

      <section id="free" className="land-section">
        <Reveal><div className="card accent" style={{ padding: 'clamp(1.5rem,4vw,3rem)', borderRadius: 'var(--r-xl)' }}>
          <h2 className="land-h2" style={{ color: 'inherit' }}>Free. All of it. Forever.</h2>
          <p style={{ maxWidth: 560, marginTop: 8, opacity: 0.8 }}>No tiers, no caps, no locked themes or insights. Your data is never sold or shared, and you can export it any time.</p>
          <div className="grid-3 mt-4" style={{ fontWeight: 600 }}>{['Unlimited tasks & routines', 'Every theme and insight', 'Offline, installable PWA', 'Full export (JSON & CSV)', 'Undo for every bulk action', 'No ads, no tracking by default'].map((x) => <span key={x} className="row gap-2"><Icon name="check" size={18} stroke={3} />{x}</span>)}</div>
        </div></Reveal>
      </section>

      <section className="land-section" style={{ maxWidth: 620 }}>
        <Reveal><div className="card"><h3>Start in ten seconds</h3><p className="muted small">Guest mode needs nothing. Pick a unique username and password to save and sync your tasks and routines.</p>
          <div className="mt-3"><AuthForm big onDone={() => nav('/app')} /></div>
          <div className="row gap-2 mt-2 wrap"><button className="btn btn-primary" onClick={() => nav('/app')}>Continue as guest<Icon name="arrowR" size={16} /></button></div></div></Reveal>
      </section>

      <section id="faq" className="land-section" style={{ maxWidth: 760 }}>
        <Reveal><h2 className="land-h2">Questions</h2></Reveal>
        {[['Does it work offline?', 'Yes. ApexDay is an installable PWA. The app and your data live on your device, and edits sync when you are online.'], ['What if I miss a day?', 'Nothing breaks. You get a welcome-back card, a clean day and a freeze offered. Your Apex dims; it never disappears.'], ['Will it move my tasks without asking?', 'Never. Every shift, reset and suggestion shows a preview first, and Undo stays available.'], ['Is it really free?', 'Yes. There is no paid tier and no locked feature. Funding options will never gate existing features.']].map(([q, a]) => <Reveal key={q}><details className="faq"><summary>{q}</summary><p className="muted">{a}</p></details></Reveal>)}
      </section>

      <footer className="land-foot"><div className="brand" style={{ padding: 0 }}><span className="brand-mark" style={{ width: 28, height: 28 }}><Icon name="mountain" size={16} stroke={2.4} /></span>ApexDay</div><span className="small muted">Plan it. Run it. Shift it. · {addDays(today, 0).slice(0, 4)}</span><button className="btn btn-primary" onClick={() => nav('/app')}>Open app</button></footer>
    </div>
  );
}
