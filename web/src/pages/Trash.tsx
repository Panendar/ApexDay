import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Empty, PageHead } from '../components/Bits';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { fmtDate, fmtTime } from '../lib/time';
import { useToday } from '../lib/hooks';

export default function Trash() {
  const st = useStore();
  const today = useToday();
  const ui = useUI.getState();
  const [tab, setTab] = useState<'shifts' | 'trash' | 'log'>('shifts');
  const trash = st.tasks.filter((t) => t.deletedAt);
  const left = (t: number) => Math.max(0, 30 - Math.floor((Date.now() - t) / 86400000));
  return (
    <div className="page">
      <PageHead eyebrow="Safety net" title="Trash & history">{tab === 'trash' && trash.length > 0 && <button className="btn btn-danger" onClick={() => { if (confirm('Permanently delete everything in Trash?')) trash.forEach((t) => st.purgeTask(t.id)); }}>Empty trash</button>}</PageHead>
      <div className="tabs" role="tablist">{([['shifts', `Shifts (${st.batches.length})`], ['trash', `Trash (${trash.length})`], ['log', 'History log']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === 'shifts' && (st.batches.length === 0 ? <section className="card"><Empty icon="shift" title="No shifts yet" text="Every shift is stored as one batch you can undo, even after you close the app." action={<button className="btn btn-primary" onClick={() => ui.openShift()}>Open Shift</button>} /></section> : (
        <div className="col gap-2 stagger">{st.batches.map((b) => (
          <section key={b.id} className="card row gap-3 wrap" style={{ opacity: b.undoneAt ? 0.55 : 1 }}>
            <span className="avatar"><Icon name="shift" /></span>
            <div className="grow" style={{ minWidth: 200 }}><b>{b.label}</b><div className="small muted">{new Date(b.createdAt).toLocaleString()} · {b.counts.moved} moved · {b.counts.skipped} skipped · {b.counts.overflow} overflow · {b.counts.fixed} fixed protected</div></div>
            {b.undoneAt ? <span className="chip">Undone</span> : <button className="btn" onClick={() => { const r = st.undoShift(b.id); ui.toast(r.edited.length ? `Reverted ${r.reverted}. Kept ${r.edited.length} you edited since: ${r.edited.slice(0, 2).join(', ')}` : 'Shift undone. Everything is back.', { kind: 'good' }); }}><Icon name="undo" size={16} />Undo</button>}
          </section>))}</div>))}

      {tab === 'trash' && (trash.length === 0 ? <section className="card"><Empty icon="trash" title="Trash is empty" text="Deleted tasks wait here for 30 days before they are removed for good." /></section> : (
        <div className="col gap-2 stagger">{trash.map((t) => (
          <section key={t.id} className="card row gap-3 wrap"><div className="grow"><b>{t.title}</b><div className="small muted">{fmtDate(t.date, today)} {fmtTime(t.start, st.settings.hour12)} · {left(t.deletedAt!)} days left</div></div>
            <button className="btn" onClick={() => { st.restoreTask(t.id); ui.toast('Restored', { kind: 'good' }); }}><Icon name="undo" size={16} />Restore</button><button className="btn btn-danger btn-icon" aria-label="Delete forever" onClick={() => st.purgeTask(t.id)}><Icon name="trash" size={16} /></button></section>))}</div>))}

      {tab === 'log' && (st.log.length === 0 ? <section className="card"><Empty icon="history" title="Nothing logged yet" text="Shifts, edits to sealed days and deletions are written here so history stays honest." /></section> : (
        <section className="card">{st.log.map((l) => <div key={l.id} className="list-row"><span className={`chip ${l.kind === 'shift' ? 'accent' : l.kind === 'delete' ? 'warn' : ''}`}>{l.kind}</span><span className="grow small">{l.text}</span><span className="tiny muted">{new Date(l.at).toLocaleTimeString()}</span></div>)}</section>))}
    </div>
  );
}
