import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '../components/Icon';
import { useStore } from '../store/useStore';
import { THEMES } from '../lib/themes';
import { burst } from '../lib/fx';

const GOALS = [
  { id: 'Ace my exams', icon: 'cap', d: 'Study blocks, revision, attendance' },
  { id: 'Build a daily routine', icon: 'repeat', d: 'Consistent days, calm streaks' },
  { id: 'Ship a side project', icon: 'code', d: 'Deep work that survives meetings' },
  { id: 'Get healthier', icon: 'heart', d: 'Training, sleep and small habits' },
];

/** First run: pick a goal, pick a theme, add three tasks. Guest mode keeps everything local. */
export function Onboarding() {
  const finish = useStore((s) => s.finishOnboarding);
  const setS = useStore((s) => s.set);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(GOALS[0].id);
  const [theme, setTheme] = useState('apex');
  const [name, setName] = useState('');
  const [tasks, setTasks] = useState(['', '', '']);
  const [sample, setSample] = useState(false);
  const pick = (id: string) => { setTheme(id); setS({ theme: id }); };
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '1.25rem', background: 'radial-gradient(70% 50% at 50% 0%, var(--accent-soft), transparent 60%), var(--bg)' }}>
      <div className="card" style={{ width: 'min(640px, 100%)', padding: 'clamp(1.25rem, 4vw, 2.25rem)', borderRadius: 'var(--r-xl)' }}>
        <div className="row between" style={{ marginBottom: '1.25rem' }}><div className="brand" style={{ padding: 0 }}><span className="brand-mark"><Icon name="mountain" size={20} stroke={2.4} /></span>ApexDay</div><div className="step-dots">{[0, 1, 2].map((i) => <i key={i} className={i === step ? 'on' : ''} />)}</div></div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
            {step === 0 && (<>
              <h1 style={{ fontSize: '1.9rem' }}>Welcome. What are we climbing?</h1><p className="muted mt-1">Pick a goal. You can change it any time.</p>
              <div className="field mt-3"><label htmlFor="nm">What should we call you?</label><input id="nm" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" autoFocus /></div>
              <div className="grid-2 mt-3">{GOALS.map((g) => <button key={g.id} className={`op-tile${goal === g.id ? ' on' : ''}`} onClick={() => setGoal(g.id)} aria-pressed={goal === g.id}><span className="row gap-2" style={{ color: 'var(--accent-text)' }}><Icon name={g.icon} /><b style={{ color: 'var(--text)' }}>{g.id}</b></span><span>{g.d}</span></button>)}</div></>)}
            {step === 1 && (<>
              <h1 style={{ fontSize: '1.9rem' }}>Pick your look</h1><p className="muted mt-1">Themes change colour, the Apex and card texture.</p>
              <div className="grid-3 mt-3" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>{THEMES.map((t) => <button key={t.id} className={`swatch${theme === t.id ? ' on' : ''}`} style={{ width: '100%', height: 76, background: `linear-gradient(135deg, ${t.bg} 55%, ${t.surface} 55%)`, padding: 10, textAlign: 'left' }} onClick={() => pick(t.id)} aria-pressed={theme === t.id}><span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 8, background: t.accent }} /><div className="tiny" style={{ color: t.id === 'light' ? '#0b0b0c' : '#fff', fontWeight: 700, marginTop: 10 }}>{t.name}</div></button>)}</div></>)}
            {step === 2 && (<>
              <h1 style={{ fontSize: '1.9rem' }}>Add your first three tasks</h1><p className="muted mt-1">For tomorrow. Small is fine. You can add routines later.</p>
              <div className="col gap-2 mt-3">{tasks.map((t, i) => <input key={i} className="input" style={{ minHeight: 48 }} value={t} onChange={(e) => setTasks(tasks.map((x, k) => (k === i ? e.target.value : x)))} placeholder={['e.g. Revise chapter 4', 'e.g. 30-minute run', 'e.g. Plan the week'][i]} aria-label={`Task ${i + 1}`} />)}</div>
              <label className="row gap-2 small mt-3" style={{ cursor: 'pointer' }}><input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />Also load a sample week and history so I can explore</label>
              <p className="small muted mt-2"><Icon name="shield" size={14} /> Guest mode: everything stays on this device. Create an account later and it migrates.</p></>)}
          </motion.div>
        </AnimatePresence>
        <div className="row between mt-4">
          {step > 0 ? <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>Back</button> : <button className="btn btn-ghost" onClick={() => finish({ name, theme, goal: '', tasks: [], guest: true })}>Skip setup</button>}
          {step < 2 ? <button className="btn btn-primary btn-lg" onClick={() => setStep(step + 1)}>Continue<Icon name="arrowR" size={18} /></button> : <button className="btn btn-primary btn-lg" onClick={() => { burst({ x: innerWidth / 2, y: innerHeight / 2, big: true }); finish({ name: name.trim(), theme, goal, tasks, guest: true, sample }); }}><Icon name="check" size={18} />Start my day</button>}
        </div>
      </div>
    </div>
  );
}
