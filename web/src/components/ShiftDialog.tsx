import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { Seg } from './Bits';
import { useStore, planFor } from '../store/useStore';
import { useUI } from '../store/useUI';
import { addDays, fmtDate, fmtTime, todayISO } from '../lib/time';
import { OP_LABELS, type OverflowChoice, type ShiftOp } from '../lib/shift';
import { line } from '../lib/tips';
import { burst } from '../lib/fx';

type Kind = ShiftOp['kind'];
const OPS: { k: Kind; icon: string; d: string }[] = [
  { k: 'holiday', icon: 'flag', d: 'Turn a day into a holiday and decide what happens to its tasks.' },
  { k: 'push', icon: 'arrowR', d: 'Move a day to the next working day and cascade the rest.' },
  { k: 'pull', icon: 'chevL', d: 'Close the gap left by a cancelled day.' },
  { k: 'swap', icon: 'repeat', d: 'Exchange the plans of two dates.' },
  { k: 'dayOrder', icon: 'layers', d: 'Tomorrow is Day Order N: re-align every later date.' },
  { k: 'times', icon: 'clock', d: 'Move remaining tasks by ± N minutes.' },
  { k: 'compress', icon: 'wind', d: 'Fit the rest of the day into the time left.' },
  { k: 'reset', icon: 'refresh', d: 'Re-plan the rest of today from right now.' },
];

function DateField({ label, v, set, min }: { label: string; v: string; set: (x: string) => void; min?: string }) {
  return <div className="field"><label>{label}</label><input className="input" type="date" value={v} min={min} onChange={(e) => e.target.value && set(e.target.value)} /></div>;
}

export function ShiftDialog() {
  const sh = useUI((s) => s.shift);
  const close = useUI((s) => s.closeShift);
  return <AnimatePresence>{sh.open && <Body key="shift" kind={sh.kind} date={sh.date} onClose={close} />}</AnimatePresence>;
}

function Body({ kind: k0, date: d0, onClose }: { kind?: Kind; date?: string; onClose: () => void }) {
  const data = useStore();
  const today = todayISO(data.settings.dayStartHour);
  const tomorrow = addDays(today, 1);
  const [kind, setKind] = useState<Kind | null>(k0 ?? null);
  const [step, setStep] = useState<'choose' | 'params' | 'preview' | 'applied'>(k0 ? 'params' : 'choose');
  const base = d0 ?? (k0 === 'reset' || k0 === 'compress' || k0 === 'times' ? today : tomorrow);
  const [date, setDate] = useState(base);
  const lastPlanned = data.tasks.reduce((m, t) => (!t.deletedAt && t.status === 'planned' && t.date > m ? t.date : m), addDays(base, 1));
  const defEnd = lastPlanned > addDays(base, 1) ? lastPlanned : addDays(base, 7);
  const [end, setEnd] = useState(defEnd);
  const [date2, setDate2] = useState(addDays(base, 1));
  const [overflow, setOverflow] = useState<OverflowChoice>('extend');
  const [then, setThen] = useState<'push' | 'skip' | 'move'>('push');
  const [order, setOrder] = useState(data.anchor.order);
  const [minutes, setMinutes] = useState(30);
  const [fromNow, setFromNow] = useState(true);
  const [applied, setApplied] = useState<{ id: string; moved: number; skipped: number; msg: string } | null>(null);

  const op: ShiftOp | null = useMemo(() => {
    switch (kind) {
      case 'push': return { kind, from: date, end, overflow };
      case 'pull': return { kind, from: date, end };
      case 'swap': return { kind, a: date, b: date2 };
      case 'dayOrder': return { kind, date, order };
      case 'holiday': return { kind, date, then, moveTo: date2, end, overflow };
      case 'times': return { kind, date, minutes, fromNow };
      case 'compress': return { kind, date };
      case 'reset': return { kind, date };
      default: return null;
    }
  }, [kind, date, date2, end, overflow, then, order, minutes, fromNow]);
  const plan = useMemo(() => (op && step !== 'choose' ? planFor(data, op) : null), [op, step, data.tasks, data.dayTypes, data.anchor]);
  const byId = useMemo(() => new Map(data.tasks.map((t) => [t.id, t])), [data.tasks]);
  const hr = data.settings.hour12;

  const apply = () => {
    if (!plan) return;
    const b = useStore.getState().applyShift(plan);
    const msg = `${line('shift', data.settings.tone)} ${plan.counts.moved} moved${plan.counts.skipped ? `, ${plan.counts.skipped} skipped` : ''}, nothing lost.`;
    setApplied({ id: b.id, moved: plan.counts.moved, skipped: plan.counts.skipped, msg });
    setStep('applied');
    burst({ x: innerWidth / 2, y: innerHeight / 2, color: 'var(--accent)' });
    useUI.getState().toast(msg, { kind: 'good', ttl: 30000, action: { label: 'Undo', run: () => { const r = useStore.getState().undoShift(b.id); useUI.getState().toast(r.edited.length ? `Undone. Kept ${r.edited.length} edited task(s): ${r.edited.slice(0, 2).join(', ')}` : 'Shift undone. Everything is back.', { kind: 'good' }); } } });
  };
  const undo = () => {
    if (!applied) return;
    const r = useStore.getState().undoShift(applied.id);
    useUI.getState().toast(r.edited.length ? `Undone. Kept ${r.edited.length} edited task(s).` : 'Shift undone. Everything is back.', { kind: 'good' });
    setStep('choose'); setApplied(null); setKind(null);
  };

  const dayBadge = (d: string) => { const t = data.dayTypes[d]; return t ? <span className="chip info">{t}</span> : null; };

  return (
    <Modal wide title={step === 'applied' ? 'Plan reshuffled' : kind ? OP_LABELS[kind] : 'Shift'} subtitle={step === 'choose' ? 'Preview first. Apply as one step. Undo any time.' : step === 'applied' ? undefined : 'Nothing changes until you press Apply.'} onClose={onClose}>
      <div className="step-dots mb-2" style={{ marginBottom: 14 }} aria-hidden="true">{['choose', 'params', 'preview', 'applied'].map((s) => <i key={s} className={s === step ? 'on' : ''} />)}</div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.18 }}>
          {step === 'choose' && (
            <div className="grid-2">
              {OPS.map((o) => (
                <button key={o.k} className={`op-tile${kind === o.k ? ' on' : ''}`} onClick={() => { setKind(o.k); setDate(o.k === 'reset' || o.k === 'compress' || o.k === 'times' ? today : tomorrow); setEnd(lastPlanned > tomorrow ? lastPlanned : addDays(tomorrow, 7)); setStep('params'); }}>
                  <div className="row gap-2" style={{ color: 'var(--accent-text)' }}><Icon name={o.icon} /><b style={{ color: 'var(--text)' }}>{OP_LABELS[o.k]}</b></div><span>{o.d}</span>
                </button>))}
            </div>
          )}

          {step === 'params' && kind && (
            <div className="col gap-3">
              {(kind === 'push' || kind === 'pull') && <div className="grid-2"><DateField label={kind === 'push' ? 'Push from (this day moves forward)' : 'Gap day (tasks close up to here)'} v={date} set={setDate} min={today} /><DateField label="Up to (scope end)" v={end} set={setEnd} min={date} /></div>}
              {kind === 'holiday' && (<>
                <div className="grid-2"><DateField label="Holiday date" v={date} set={setDate} min={today} />
                  <div className="field"><label>What happens to its tasks?</label><Seg value={then} onChange={setThen} options={[{ v: 'push', l: 'Push forward' }, { v: 'move', l: 'Move to a date' }, { v: 'skip', l: 'Skip them' }]} label="Holiday choice" /></div></div>
                {then === 'move' && <DateField label="Move tasks to" v={date2} set={setDate2} min={today} />}
                {then === 'push' && <DateField label="Cascade up to" v={end} set={setEnd} min={date} />}
                <p className="small muted">Streak is neutral on a holiday. Fixed items stay put.</p></>)}
              {kind === 'swap' && <div className="grid-2"><DateField label="First date" v={date} set={setDate} min={today} /><DateField label="Second date" v={date2} set={setDate2} min={today} /></div>}
              {kind === 'dayOrder' && <div className="grid-2"><DateField label="Date" v={date} set={setDate} min={today} /><div className="field"><label>Is Day Order</label><Seg value={order} onChange={setOrder} options={Array.from({ length: data.cycle }, (_, i) => ({ v: i + 1, l: String(i + 1) }))} label="Day order" /></div></div>}
              {kind === 'times' && (<div className="grid-2"><DateField label="Day" v={date} set={setDate} min={today} />
                <div className="field"><label>Move by (minutes)</label><div className="row gap-2"><input className="input tnum" type="number" step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />{[-30, -15, 15, 30, 60].map((m) => <button key={m} type="button" className="btn btn-sm" onClick={() => setMinutes(m)}>{m > 0 ? '+' : ''}{m}</button>)}</div></div>
                <label className="row gap-2 small"><input type="checkbox" checked={fromNow} onChange={(e) => setFromNow(e.target.checked)} /> Only tasks that have not finished yet</label></div>)}
              {(kind === 'compress' || kind === 'reset') && <DateField label="Day" v={date} set={setDate} min={today} />}
              {(kind === 'push' || kind === 'holiday') && then !== 'skip' && (
                <div className="field"><label>If something no longer fits (overflow)</label>
                  <Seg value={overflow} onChange={setOverflow} options={[{ v: 'extend', l: 'Extend the plan' }, { v: 'skip', l: 'Skip with reason' }, { v: 'keep', l: 'Keep in place' }]} label="Overflow" />
                  <span className="small muted">A push never silently drops work.</span></div>)}
              <div className="row between mt-2"><button className="btn btn-ghost" onClick={() => setStep('choose')}><Icon name="chevL" size={16} />Back</button><button className="btn btn-primary" onClick={() => setStep('preview')}>Preview<Icon name="arrowR" size={16} /></button></div>
            </div>
          )}

          {step === 'preview' && plan && (
            <div className="col gap-3">
              <div className="row wrap gap-2">
                <span className="chip accent">{plan.counts.moved} moved</span>
                <span className="chip">{plan.counts.skipped} skipped</span>
                <span className={`chip ${plan.counts.overflow ? 'warn' : ''}`}>{plan.counts.overflow} overflow</span>
                <span className="chip info"><Icon name="pin" size={12} />{plan.counts.fixed} fixed protected</span>
              </div>
              {plan.daysSkipped.length > 0 && <div className="banner info small"><Icon name="info" /><div>Skipped non-working days: {plan.daysSkipped.map((d) => `${fmtDate(d.date, today)} (${d.type})`).join(', ')}</div></div>}
              {plan.dayTypes.map((d) => <div key={d.date} className="diff-line"><span className="from">{fmtDate(d.date, today)} · {d.from}</span><Icon name="arrowR" size={14} /><span className="to">{d.to}</span></div>)}
              {plan.orderPreview && (
                <div className="col gap-1"><b className="small">Day order re-alignment</b>
                  {plan.orderPreview.map((o) => <div key={o.date} className="diff-line"><span className="from">{fmtDate(o.date, today)} · Day {o.before ?? '–'}</span><Icon name="arrowR" size={14} /><span className="to">Day {o.after ?? '–'}</span></div>)}</div>)}
              {plan.changes.length > 0 && (
                <div className="col gap-1" style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {plan.changes.map((c) => { const t = byId.get(c.id); if (!t) return null; const b = { ...t, ...c.before }, a = { ...t, ...c.after };
                    return <div key={c.id} className="diff-line"><span className="from ellipsis" title={t.title}>{t.title}<br /><small>{fmtDate(b.date, today)} {fmtTime(b.start, hr)}{b.dur !== a.dur ? ` · ${b.dur}m` : ''}</small></span><Icon name="arrowR" size={14} />
                      <span className="to">{a.status === 'skipped' ? 'skipped' : `${fmtDate(a.date, today)} ${fmtTime(a.start, hr)}${b.dur !== a.dur ? ` · ${a.dur}m` : ''}`}</span></div>; })}
                </div>)}
              {plan.empty && <div className="banner small"><Icon name="info" /><div>Nothing would change. Try another date or operation.</div></div>}
              {plan.warnings.map((w, i) => <div key={i} className="banner warn small"><Icon name="alert" /><div>{w}</div></div>)}
              <div className="row between mt-2"><button className="btn btn-ghost" onClick={() => setStep('params')}><Icon name="chevL" size={16} />Adjust</button>
                <div className="row gap-2"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={plan.empty} onClick={apply}><Icon name="check" size={16} />Apply</button></div></div>
            </div>
          )}

          {step === 'applied' && applied && (
            <div className="col gap-3" style={{ alignItems: 'center', textAlign: 'center', padding: '1rem 0' }}>
              <div className="avatar" style={{ width: 64, height: 64, borderRadius: 22, animation: 'pop 500ms var(--spring)' }}><Icon name="check" size={32} stroke={3} /></div>
              <h3>{applied.msg}</h3>
              <p className="muted small">One step to undo, kept for the whole session and logged in History.</p>
              <div className="row gap-2"><button className="btn" onClick={undo}><Icon name="undo" size={16} />Undo</button><button className="btn btn-primary" onClick={onClose}>Done</button></div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {step === 'params' && kind === 'holiday' && dayBadge(date)}
    </Modal>
  );
}
