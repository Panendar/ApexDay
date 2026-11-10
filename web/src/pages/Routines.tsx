import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { Empty, PageHead, Switch } from '../components/Bits';
import { useStore, orderFor } from '../store/useStore';
import { useUI } from '../store/useUI';
import { useToday } from '../lib/hooks';
import { addDays, fmtDate, fmtDur, uid } from '../lib/time';
import type { Routine } from '../lib/types';

export default function Routines() {
  const st = useStore();
  const today = useToday();
  const ui = useUI.getState();
  const [tab, setTab] = useState<'routines' | 'timetable'>('routines');
  const [edit, setEdit] = useState<Routine | null>(null);
  const [imp, setImp] = useState(false);
  const todayOrder = orderFor(st, today);

  return (
    <div className="page">
      <PageHead eyebrow="Routines & Timetables" title="The rules behind your days">
        {tab === 'routines' ? <button className="btn btn-primary" onClick={() => setEdit({ id: uid(), name: '', color: '#c6f432', icon: 'repeat', recurrence: 'Daily', categoryId: 'study', active: true, tasks: [{ title: '', start: '09:00', dur: 30 }] })}><Icon name="plus" size={16} />New routine</button>
          : <><button className="btn" onClick={() => setImp(true)}><Icon name="upload" size={16} />Import</button><button className="btn btn-primary" onClick={() => ui.openShift('dayOrder', today)}><Icon name="layers" size={16} />Today is Day Order…</button></>}
      </PageHead>
      <div className="tabs" role="tablist"><button role="tab" aria-selected={tab === 'routines'} className={tab === 'routines' ? 'on' : ''} onClick={() => setTab('routines')}>Routines</button><button role="tab" aria-selected={tab === 'timetable'} className={tab === 'timetable' ? 'on' : ''} onClick={() => setTab('timetable')}>Timetable & day order</button></div>

      {tab === 'routines' && (
        <>
          <div className="banner info small" style={{ marginBottom: '1rem' }}><Icon name="info" /><div>The schedule is stored as <b>rules plus overrides</b>. Routines generate tasks; shifts, skips and holidays are overrides on top, so one Undo puts everything back.</div></div>
          <div className="grid-auto stagger">
            {st.routines.map((r) => (
              <section key={r.id} className="card hover" style={{ ['--c' as string]: r.color, opacity: r.active ? 1 : 0.6 }}>
                <div className="row between"><div className="row gap-2"><span className="avatar"><Icon name={r.icon} /></span><div><b>{r.name}</b><div className="tiny muted">{r.recurrence}</div></div></div><Switch on={r.active} onChange={() => st.toggleRoutine(r.id)} label={`${r.name} active`} /></div>
                <div className="col gap-1 mt-3">{r.tasks.slice(0, 4).map((t, i) => <div key={i} className="row gap-2 small"><span className="tnum muted">{t.start}</span><span className="grow ellipsis">{t.title}</span><span className="muted">{fmtDur(t.dur)}</span></div>)}{r.tasks.length > 4 && <span className="tiny muted">+{r.tasks.length - 4} more</span>}</div>
                <div className="row gap-2 mt-3 wrap"><button className="btn btn-sm btn-soft" onClick={() => { const n = st.applyRoutine(r.id, addDays(today, 1)); ui.toast(`Added ${n} tasks to tomorrow`, { kind: 'good' }); }}>Apply to tomorrow</button><button className="btn btn-sm" onClick={() => setEdit(structuredClone(r))}><Icon name="edit" size={14} />Edit</button><button className="btn btn-sm btn-ghost" onClick={() => { useStore.setState((s) => ({ routines: s.routines.map((x) => x.id === r.id ? { ...x, active: false } : x) })); ui.toast('Paused for now. Streaks are unaffected.'); }}>Pause</button></div>
              </section>))}
            {st.routines.length === 0 && <Empty icon="repeat" title="No routines yet" text="Create a routine and apply it to any day in one click." />}
          </div>
        </>)}

      {tab === 'timetable' && (
        <div className="col gap-3">
          <div className="grid-3">
            <section className="card"><div className="stat"><span className="l">Today is</span><span className="v">{todayOrder ? `Day ${todayOrder}` : 'No classes'}</span><span className="l">Cycle of {st.cycle} · anchored on {fmtDate(st.anchor.date, today)}</span></div></section>
            <section className="card"><div className="stat"><span className="l">Classes today</span><span className="v">{todayOrder ? st.slots.filter((s) => s.order === todayOrder).length : 0}</span></div></section>
            <section className="card"><p className="small muted">College changed the day order? Tap <b>Today is Day Order…</b>, preview how every later date re-aligns, then apply or undo.</p><button className="btn btn-sm mt-2" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/t/${st.anchor.date}-${st.cycle}`); ui.toast('Read-only timetable link copied (demo)'); }}><Icon name="share" size={14} />Share link</button></section>
          </div>
          <section className="card" style={{ overflowX: 'auto' }}>
            <div className="card-title"><h3>Cycle</h3></div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${st.cycle}, minmax(150px, 1fr))`, gap: 10, minWidth: st.cycle * 150 }}>
              {Array.from({ length: st.cycle }, (_, i) => i + 1).map((o) => (
                <div key={o} className="col gap-2"><div className={`chip ${o === todayOrder ? 'accent' : ''}`} style={{ alignSelf: 'flex-start' }}>Day {o}{o === todayOrder ? ' · today' : ''}</div>
                  {st.slots.filter((s) => s.order === o).map((s) => { const sub = st.subjects.find((x) => x.name === s.subject); return (
                    <div key={s.id} className="mini-task" style={{ ['--cat' as string]: sub?.color, cursor: 'default' }}><b>{s.subject}</b><div className="tiny muted tnum">{s.start}–{s.end} · {s.room}</div><div className="tiny muted">{s.teacher}</div></div>); })}</div>))}
            </div>
          </section>
          <section className="card"><div className="card-title"><h3>Attendance</h3></div>
            {st.subjects.map((s) => { const p = (s.attended / s.total) * 100; return <div key={s.name} className="list-row"><span className="avatar" style={{ ['--c' as string]: s.color, width: 32, height: 32 }}><Icon name="cap" size={16} /></span><span className="grow">{s.name}</span><div style={{ width: 120 }} className="pbar"><i style={{ width: `${p}%`, ['--c' as string]: p < s.limit ? 'var(--warn)' : s.color }} /></div><b className="tnum" style={{ width: 44, textAlign: 'right', color: p < s.limit ? 'var(--warn)' : undefined }}>{p.toFixed(0)}%</b></div>; })}
            <p className="small muted mt-2">Mark classes as attended, absent or cancelled from Today or Plan. A cancelled class frees its time and never counts against you.</p></section>
        </div>)}

      <AnimatePresence>{edit && <RoutineEditor r={edit} onClose={() => setEdit(null)} />}</AnimatePresence>
      <AnimatePresence>{imp && <ImportTT onClose={() => setImp(false)} />}</AnimatePresence>
    </div>
  );
}

function RoutineEditor({ r, onClose }: { r: Routine; onClose: () => void }) {
  const st = useStore();
  const [f, setF] = useState(r);
  const exists = st.routines.some((x) => x.id === r.id);
  const setT = (i: number, p: Partial<Routine['tasks'][number]>) => setF({ ...f, tasks: f.tasks.map((t, k) => (k === i ? { ...t, ...p } : t)) });
  return (
    <Modal title={exists ? 'Edit routine' : 'New routine'} subtitle="Editing asks: this day only, this and future days, or all days." onClose={onClose}
      footer={<>{exists && <button className="btn btn-danger" onClick={() => { useStore.setState((s) => ({ routines: s.routines.filter((x) => x.id !== r.id) })); useUI.getState().toast('Routine removed. Past history is kept.'); onClose(); }}>Delete</button>}<button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { if (!f.name.trim()) return useUI.getState().toast('Name your routine.', { kind: 'warn' }); const clean = { ...f, tasks: f.tasks.filter((t) => t.title.trim()) }; useStore.setState((s) => ({ routines: exists ? s.routines.map((x) => (x.id === r.id ? clean : x)) : [...s.routines, clean] })); const n = useStore.getState().generateRoutine(r.id, 14); useUI.getState().toast(n ? `Saved. ${n} tasks scheduled over the next 2 weeks.` : 'Routine saved.', { kind: 'good' }); onClose(); }}>Save</button></>}>
      <div className="col gap-3">
        <div className="grid-2"><div className="field"><label htmlFor="rn">Name</label><input id="rn" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Deep work" /></div>
          <div className="field"><label htmlFor="rr">Repeats</label><select id="rr" className="select" value={f.recurrence} onChange={(e) => setF({ ...f, recurrence: e.target.value })}>{['Daily', 'Mon–Fri', 'Sat, Sun', 'Every 2 days', 'Mon–Fri · by day order', 'Custom range'].map((x) => <option key={x}>{x}</option>)}</select></div></div>
        <div className="field"><label>Category</label><div className="row wrap gap-1">{st.categories.map((c) => <button key={c.id} type="button" className={`btn btn-sm ${f.categoryId === c.id ? 'btn-soft' : ''}`} onClick={() => setF({ ...f, categoryId: c.id, color: c.color })}><i className="dot" style={{ ['--c' as string]: c.color }} />{c.name}</button>)}</div></div>
        <div className="col gap-2"><label className="label">Tasks</label>
          {f.tasks.map((t, i) => <div key={i} className="row gap-2"><input className="input" style={{ width: 110 }} type="time" value={t.start} onChange={(e) => setT(i, { start: e.target.value })} aria-label="Start" /><input className="input grow" value={t.title} onChange={(e) => setT(i, { title: e.target.value })} placeholder="Task title" aria-label="Title" /><input className="input tnum" style={{ width: 84 }} type="number" min={5} step={5} value={t.dur} onChange={(e) => setT(i, { dur: Number(e.target.value) })} aria-label="Minutes" /><button className="btn btn-ghost btn-icon btn-sm" aria-label="Remove" onClick={() => setF({ ...f, tasks: f.tasks.filter((_, k) => k !== i) })}><Icon name="x" size={14} /></button></div>)}
          <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setF({ ...f, tasks: [...f.tasks, { title: '', start: '09:00', dur: 30 }] })}><Icon name="plus" size={14} />Add task</button></div>
      </div>
    </Modal>
  );
}

function ImportTT({ onClose }: { onClose: () => void }) {
  const [t, setT] = useState('order,subject,start,end,room,teacher\n1,Data Structures,09:00,09:50,B-204,Dr. Rao\n2,Database Systems,10:00,10:50,A-101,Prof. Iyer');
  const parse = () => {
    const rows = t.trim().split(/\n/).slice(1).map((l) => l.split(/[,\t]/).map((x) => x.trim())).filter((r) => r.length >= 4 && Number(r[0]));
    if (!rows.length) return useUI.getState().toast('No valid rows found. Use: order, subject, start, end, room, teacher.', { kind: 'warn' });
    useStore.setState((s) => ({ slots: [...s.slots, ...rows.map((r) => ({ id: uid(), order: Number(r[0]), subject: r[1], start: r[2], end: r[3], room: r[4] ?? '', teacher: r[5] ?? '' }))] }));
    useUI.getState().toast(`Imported ${rows.length} class slots`, { kind: 'good' }); onClose();
  };
  return (
    <Modal title="Import timetable" subtitle="Paste CSV or a table copied from a spreadsheet." onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={parse}>Import</button></>}>
      <textarea className="textarea" style={{ minHeight: 180, fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }} value={t} onChange={(e) => setT(e.target.value)} aria-label="Timetable CSV" />
    </Modal>
  );
}
