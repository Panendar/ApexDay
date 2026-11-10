import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { PageHead, Seg, Switch, Help } from '../components/Bits';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { THEMES } from '../lib/themes';
import { exportCSV, exportData } from './Progress';
import { deleteAccount, onSync, signOut, syncNow, syncState } from '../lib/sync';
import AuthForm from '../components/AuthForm';
import type { Settings as S } from '../lib/types';

function Row({ title, desc, children }: { title: ReactNode; desc?: ReactNode; children: ReactNode }) {
  return <div className="setting"><div style={{ minWidth: 0 }}><div style={{ fontWeight: 600 }}>{title}</div>{desc && <div className="desc">{desc}</div>}</div><div className="row gap-2" style={{ flex: 'none' }}>{children}</div></div>;
}

export default function Settings() {
  const st = useStore();
  const s = st.settings;
  const set = st.set;
  const [tab, setTab] = useState('look');
  const notif = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
  const num = (k: keyof S, min: number, max: number, step = 1) => <input className="input tnum" style={{ width: 96 }} type="number" min={min} max={max} step={step} value={s[k] as number} onChange={(e) => set({ [k]: Math.max(min, Math.min(max, Number(e.target.value))) } as Partial<S>)} aria-label={String(k)} />;

  const requestPush = async () => {
    if (typeof Notification === 'undefined') { useUI.getState().toast('This browser does not support notifications. In-tab alerts and email still work.', { kind: 'warn' }); return; }
    const p = await Notification.requestPermission();
    set({ notifications: p === 'granted' });
    useUI.getState().toast(p === 'granted' ? 'Notifications on' : 'Notifications blocked. You can enable them in browser settings. In-tab alerts still work.', { kind: p === 'granted' ? 'good' : 'warn' });
  };

  return (
    <div className="page">
      <PageHead eyebrow="Settings" title="Make it yours" />
      <div className="tabs" role="tablist">{[['look', 'Look & motion'], ['plan', 'Planning'], ['streak', 'Streaks & progress'], ['start', 'Start support'], ['notif', 'Notifications'], ['data', 'Account & data']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === 'look' && (
        <div className="col gap-3">
          <section className="card"><div className="card-title"><h3>Theme</h3></div>
            <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
              {[...THEMES, { id: 'auto', name: 'Auto', bg: '#0b0b0c', surface: '#f5f5f0', accent: '#c6f432', text: '#fff' }].map((t) => (
                <button key={t.id} className={`swatch${s.theme === t.id ? ' on' : ''}`} style={{ width: '100%', height: 84, background: `linear-gradient(135deg, ${t.bg} 55%, ${t.surface} 55%)`, padding: 10, textAlign: 'left' }} onClick={() => set({ theme: t.id })} aria-pressed={s.theme === t.id} aria-label={`${t.name} theme`}>
                  <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 9, background: t.accent }} /><div className="small" style={{ color: t.id === 'light' ? '#0b0b0c' : '#fff', fontWeight: 700, marginTop: 14 }}>{t.name}</div></button>))}
            </div></section>
          <section className="card">
            <Row title="Apex visual" desc="The growing picture on Today and Progress."><Seg value={s.apexVisual} onChange={(v) => set({ apexVisual: v })} options={[{ v: 'mountain', l: 'Mountain' }, { v: 'tree', l: 'Tree' }, { v: 'flame', l: 'Flame' }]} /></Row>
            <Row title="Density"><Seg value={s.density} onChange={(v) => set({ density: v })} options={[{ v: 'comfortable', l: 'Comfortable' }, { v: 'compact', l: 'Compact' }]} /></Row>
            <Row title="Motion" desc="Reduced motion swaps movement for fades. We also respect your system setting."><Seg value={s.motion} onChange={(v) => set({ motion: v })} options={[{ v: 'full', l: 'Full' }, { v: 'reduced', l: 'Reduced' }]} /></Row>
            <Row title="Sounds" desc="Soft chimes on completion and breaks. Off by default."><Switch on={s.sound} onChange={(v) => set({ sound: v })} label="Sound" /></Row>
            <Row title="Motivation tone" desc="Calm, energetic or tough love. Never guilt."><Seg value={s.tone} onChange={(v) => set({ tone: v })} options={[{ v: 'calm', l: 'Calm' }, { v: 'energetic', l: 'Energetic' }, { v: 'tough', l: 'Tough love' }]} /></Row>
            <Row title="Time format"><Seg value={s.hour12 ? 12 : 24} onChange={(v) => set({ hour12: v === 12 })} options={[{ v: 24, l: '24-hour' }, { v: 12, l: '12-hour' }]} /></Row>
          </section>
        </div>)}

      {tab === 'plan' && (
        <section className="card">
          <Row title="Your name"><input className="input" style={{ width: 180 }} value={s.name} onChange={(e) => set({ name: e.target.value })} aria-label="Name" /></Row>
          <Row title="Day starts at" desc="Work after midnight but before this hour counts for the previous day."><select className="select" style={{ width: 110 }} value={s.dayStartHour} onChange={(e) => set({ dayStartHour: Number(e.target.value) })} aria-label="Day start hour">{[0, 1, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></Row>
          <Row title="Week starts on"><Seg value={s.weekStart} onChange={(v) => set({ weekStart: v })} options={[{ v: 1, l: 'Monday' }, { v: 0, l: 'Sunday' }]} /></Row>
          <Row title="Snap grid" desc="Dragging snaps to this many minutes."><Seg value={s.snap} onChange={(v) => set({ snap: v })} options={[5, 10, 15, 30].map((v) => ({ v: v as S['snap'], l: `${v}m` }))} /></Row>
          <Row title="Overload warning" desc="Warn when a day has more than this many hours planned.">{num('overloadHours', 6, 20)}<span className="muted small">hours</span></Row>
          <Row title="Plan Tomorrow prompt" desc="When the evening nudge appears."><input className="input" style={{ width: 120 }} type="time" value={s.planTime} onChange={(e) => set({ planTime: e.target.value })} aria-label="Plan time" /></Row>
          <Row title="Weekly planning day"><select className="select" style={{ width: 140 }} value={s.planDay} onChange={(e) => set({ planDay: Number(e.target.value) })} aria-label="Weekly planning day">{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => <option key={d} value={i}>{d}</option>)}</select></Row>
          <Row title="End of day for re-planning" desc="Reset my day and Compress fit tasks before this time."><input className="input" style={{ width: 120 }} type="time" value={s.dayEnd} onChange={(e) => set({ dayEnd: e.target.value })} aria-label="Day end" /></Row>
          <Row title="Focus Mode defaults" desc="Sprint work and break minutes.">{num('focusWork', 5, 90)}<span className="muted">+</span>{num('focusBreak', 1, 30)}</Row>
        </section>)}

      {tab === 'streak' && (
        <section className="card">
          <Row title="Streak threshold" desc="A day counts when completion reaches this percent. Holidays and rest days are neutral.">{num('streakThreshold', 30, 100, 5)}<span className="muted">%</span></Row>
          <Row title="Streak freezes per month" desc="Offered, never spent without your consent. Not purchasable.">{num('freezesPerMonth', 0, 5)}</Row>
          <Row title={<>Partial credit: “Good start” <Help text="20% to under 50% of planned time" /></>} desc="Credit toward the day ring and streak when you spent 20%+ of a task.">{num('w25', 0, 0.5, 0.05)}</Row>
          <Row title={<>Partial credit: “Halfway+” <Help text="50% to under 100% of planned time" /></>} desc="Credit when you spent 50%+ of a task.">{num('w50', 0.25, 0.9, 0.05)}</Row>
          <p className="small muted mt-2">Completion rate = (done + {s.w50} × halfway + {s.w25} × good starts) ÷ (planned − skipped − holiday days).</p>
        </section>)}

      {tab === 'start' && (
        <section className="card">
          <Row title="Start nudges" desc="A calm card when a task’s start has passed and no timer is running. Never guilt, never about streaks."><Switch on={s.nudges} onChange={(v) => set({ nudges: v })} label="Nudges" /></Row>
          <Row title="Nudge delay" desc="Minutes after start time.">{num('nudgeDelay', 1, 60)}</Row>
          <Row title="Daily nudge cap">{num('nudgeCap', 1, 15)}</Row>
          <Row title="Quiet hours" desc="No nudges or reminders between these times."><input className="input" style={{ width: 110 }} type="time" value={s.quietFrom} onChange={(e) => set({ quietFrom: e.target.value })} aria-label="Quiet from" /><span className="muted">to</span><input className="input" style={{ width: 110 }} type="time" value={s.quietTo} onChange={(e) => set({ quietTo: e.target.value })} aria-label="Quiet to" /></Row>
          <Row title="Anti-procrastination tips" desc="Short, practical, supportive. Hide any tip or turn all off."><Switch on={s.tips} onChange={(v) => set({ tips: v })} label="Tips" /></Row>
        </section>)}

      {tab === 'notif' && (
        <section className="card">
          <Row title="Browser notifications" desc={notif === 'granted' ? 'On. Reminders fire at task start and your lead time.' : notif === 'denied' ? 'Blocked in your browser. In-tab alerts and email still work.' : notif === 'unsupported' ? 'Not supported here. In-tab alerts and email still work.' : 'Asked after your first completed task. Safari needs the installed web app.'}>
            <button className="btn btn-primary btn-sm" onClick={requestPush} disabled={notif === 'granted'}>{notif === 'granted' ? 'Enabled' : 'Enable'}</button></Row>
          <div className="banner info small mt-2"><Icon name="info" /><div>Honest limits: a browser can’t fire a reminder when it’s fully closed and push is blocked. On iPhone, install ApexDay to the home screen first.</div></div>
          <Row title="Email digests" desc="Daily plan summary and weekly review. One-click unsubscribe."><Switch on={false} onChange={() => useUI.getState().toast('Email needs an account. Coming with sync.', { kind: 'info' })} label="Email" /></Row>
          <Row title="Max notifications per day" desc="Grouped when several fire together.">8</Row>
        </section>)}

      {tab === 'data' && (
        <div className="col gap-3">
          <section className="card">
            <AccountRow />
            <Row title="Export everything" desc="Your data is yours. Full export, always free."><button className="btn btn-sm" onClick={() => exportData(st)}><Icon name="download" size={14} />JSON</button><button className="btn btn-sm" onClick={() => exportCSV(st)}><Icon name="download" size={14} />Tasks CSV</button></Row>
            <Row title="Reset demo data" desc="Restore the sample plan and history."><button className="btn btn-sm" onClick={() => { if (confirm('Replace your data with the sample data?')) { st.resetDemo(); useUI.getState().toast('Demo data restored', { kind: 'good' }); } }}>Reset</button></Row>
            <Row title="Delete all local data" desc="Removes everything from this browser."><button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Delete all ApexDay data from this browser? This cannot be undone.')) st.wipe(); }}>Delete</button></Row>
          </section>
          <section className="card"><div className="card-title"><h3>Privacy</h3></div><p className="small muted">Search runs on your device. Nothing is sold or shared. Analytics are opt-in and anonymous. ApexDay is free, with no paid tier and no locked features.</p></section>
        </div>)}
    </div>
  );
}

function AccountRow() {
  const auth = useStore((s) => s.auth);
  const [, force] = useState(0);
  useEffect(() => onSync(() => force((n) => n + 1)), []);
  const toast = useUI.getState().toast;
  const fail = (e: unknown) => toast((e as Error).message === 'Failed to fetch' ? 'Cannot reach the server. Start it with npm run dev.' : (e as Error).message, { kind: 'warn' });
  if (auth) return (
    <>
      <Row title="Signed in" desc={`${auth.username} · ${syncState.status === 'syncing' ? 'syncing…' : syncState.status === 'offline' ? 'offline, changes are queued' : syncState.status === 'error' ? 'error: ' + syncState.message : syncState.at ? 'last synced ' + new Date(syncState.at).toLocaleTimeString() : 'ready'}`}>
        <button className="btn btn-sm" onClick={() => void syncNow()}><Icon name="refresh" size={14} />Sync now</button><button className="btn btn-sm" onClick={() => { signOut(); toast('Signed out. Data stays on this device.'); }}>Sign out</button></Row>
      <Row title="Delete my account" desc="Removes all server data within 30 days. Local data stays until you delete it."><button className="btn btn-danger btn-sm" onClick={async () => { if (confirm('Request deletion of your server account and data?')) { try { await deleteAccount(); toast('Deletion requested. Server data is removed within 30 days.'); } catch (e) { fail(e); } } }}>Delete</button></Row>
    </>
  );
  return (
    <>
      <Row title="Sign in to sync" desc="Guest mode keeps everything on this device. Create an account with a unique username and password, and your tasks and routines migrate to it and sync across devices."><span /></Row>
      <div style={{ padding: '0 0 12px', maxWidth: 360 }}><AuthForm /></div>
    </>
  );
}
