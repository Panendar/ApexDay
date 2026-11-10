import { Link } from "react-router-dom";
import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Apex } from '../components/Apex';
import { PageHead, Seg } from '../components/Bits';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { useProgressMeta } from '../lib/hooks';
import { ACHIEVEMENTS } from '../lib/achievements';
import { STAGES, STAGE_NAMES, levelFloor } from '../lib/progress';

const GROUP_ICON: Record<string, string> = { Consistency: 'flame', Timing: 'clock', Comeback: 'refresh', Focus: 'bolt', 'Shifting well': 'shift', Habits: 'target', Goals: 'flag', Attendance: 'cap', Mastery: 'trophy' };

export default function Achievements() {
  const st = useStore();
  const meta = useProgressMeta();
  const [quest, setQuest] = useState<'off' | 'on'>('off');
  const [previewStage, setPreviewStage] = useState<number | null>(null);
  const stage = previewStage ?? meta.stage;
  const groups = [...new Set(ACHIEVEMENTS.map((a) => a.group))];
  const got = ACHIEVEMENTS.filter((a) => st.unlocked[a.code]).length;
  const lo = levelFloor(meta.level), hi = levelFloor(meta.level + 1);
  return (
    <div className="page">
      <PageHead eyebrow="Achievements" title="Your Apex"><span className="chip accent"><Icon name="trophy" size={13} />{got}/{ACHIEVEMENTS.length} badges</span></PageHead>
      <section className="card reveal" style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--r-xl)' }}>
        <div style={{ height: 'clamp(220px, 38vw, 360px)' }}><Apex stage={stage} health={0.8} kind={st.settings.apexVisual} height={360} hero /></div>
        <div style={{ padding: '1.25rem 1.5rem' }} className="col gap-3">
          <div className="row between wrap gap-3"><div><div className="eyebrow small accent" style={{ fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Stage {stage + 1} of 9{previewStage !== null ? ' · preview' : ''}</div><h2>{STAGE_NAMES[stage]}</h2><p className="small muted">A missed day only pauses growth and dims it. Recovery is one good day away.</p></div>
            <Seg value={st.settings.apexVisual} onChange={(v) => st.set({ apexVisual: v })} options={[{ v: 'mountain', l: 'Mountain' }, { v: 'tree', l: 'Tree' }, { v: 'flame', l: 'Flame' }]} label="Apex visual" /></div>
          <div className="row gap-2 wrap" role="group" aria-label="Preview stages">{STAGES.map((s, i) => <button key={s} className={`btn btn-sm ${i === stage ? 'btn-soft' : ''}`} disabled={false} onClick={() => setPreviewStage(i === meta.stage ? null : i)} title={i > meta.stage ? 'Preview future stage' : STAGE_NAMES[i]}>{s}d{i > meta.stage ? ' 🔒' : ''}</button>)}</div>
          <div><div className="row between small"><b>Level {meta.level}</b><span className="muted">{meta.xp - lo}/{hi - lo} XP</span></div><div className="pbar lg mt-1 striped"><i style={{ width: `${meta.levelPct * 100}%` }} /></div></div>
        </div>
      </section>

      <section className="card mt-3 row between wrap gap-3"><div className="row gap-3"><span className="avatar" style={{ width: 46, height: 46 }}><Icon name="gift" size={22} /></span><div><b>Daily quests</b><div className="small muted">Take a quest, finish it, and see your results on the Quests page.</div></div></div><Link className="btn btn-primary" to="/app/quests">Open Quests</Link></section>

      {groups.map((g) => (
        <section key={g} className="mt-4">
          <div className="row gap-2" style={{ marginBottom: '0.75rem' }}><Icon name={GROUP_ICON[g] ?? 'star'} style={{ color: 'var(--accent-text)' }} /><h3>{g}</h3></div>
          <div className="grid-auto stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {ACHIEVEMENTS.filter((a) => a.group === g).map((a) => { const on = !!st.unlocked[a.code]; return (
              <div key={a.code} className={`badge-tile${on ? '' : ' locked'}`} title={a.desc}>
                <span className={`medal${on ? ' shine' : ''}`}><Icon name={GROUP_ICON[g] ?? 'star'} size={26} /></span><b className="small">{a.name}</b><span className="tiny muted">{a.desc}</span>{on && <span className="tiny accent">{new Date(st.unlocked[a.code]).toLocaleDateString()}</span>}</div>); })}
          </div>
        </section>))}
    </div>
  );
}
