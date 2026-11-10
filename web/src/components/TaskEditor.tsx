import { useEffect, useMemo, useState } from 'react';
import { Drawer } from './Modal';
import { Icon } from './Icon';
import { Seg, Switch } from './Bits';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import type { Energy, Priority, Subtask, Task } from '../lib/types';
import { addDays, fmtDate, fmtDur, toMin, todayISO, uid } from '../lib/time';
import { tipFor } from '../lib/tips';
import { isPast, nextFreeStart } from '../lib/slots';

const TEMPLATES: Record<string, string[]> = {
  study: ['Open notes', 'Read one section', 'Write 3 key points', 'Quick self-test'],
  health: ['Get changed', 'Warm up for 5 minutes', 'Main set', 'Cool down'],
  project: ['Open the project', 'Write the first small piece', 'Run and check it', 'Commit'],
  personal: ['Decide the first step', 'Do the first 5 minutes', 'Finish and tidy up'],
  class: ['Pack materials', 'Review last notes', 'Prepare one question'],
};

export function TaskEditor() {
  const ed = useUI((s) => s.editor);
  const close = useUI((s) => s.closeEditor);
  if (!ed) return null;
  return <EditorBody key={ed.id ?? 'new'} id={ed.id} defaults={ed.defaults as Partial<Task> | undefined} onClose={close} />;
}

function EditorBody({ id, defaults, onClose }: { id?: string; defaults?: Partial<Task>; onClose: () => void }) {
  const st = useStore();
  const today = todayISO(st.settings.dayStartHour);
  const existing = id ? st.tasks.find((t) => t.id === id) : undefined;
  const [f, setF] = useState<Task>(() => existing ?? {
    id: uid(), title: '', categoryId: 'study', tags: [], priority: 'med', energy: 'med', date: defaults?.date ?? today, start: nextFreeStart(st.tasks, defaults?.date ?? today, defaults?.dur ?? 30, today), dur: 30, fixed: false, top3: false, source: 'manual', status: 'planned', subtasks: [], spentMin: 0, ...defaults,
  });
  const [tags, setTags] = useState(f.tags.join(', '));
  const [sub, setSub] = useState('');
  const [stuck, setStuck] = useState(false);
  const [tip, setTip] = useState(tipFor('big'));
  const set = <K extends keyof Task>(k: K, v: Task[K]) => setF((x) => ({ ...x, [k]: v }));
  const live = id ? st.tasks.find((t) => t.id === id) : undefined;
  const locked = st.locked[f.date] && !existing?.status.match(/done/);
  const overlaps = useMemo(() => st.tasks.filter((t) => t.id !== f.id && !t.deletedAt && t.status !== 'moved' && t.status !== 'skipped' && t.date === f.date && toMin(t.start) < toMin(f.start) + f.dur && toMin(f.start) < toMin(t.start) + t.dur), [st.tasks, f.date, f.start, f.dur, f.id]);
  const hist = useMemo(() => { // smart duration: median of similar completed tasks
    const sim = st.tasks.filter((t) => t.status === 'done' && t.categoryId === f.categoryId && t.title.toLowerCase().split(' ')[0] === f.title.toLowerCase().split(' ')[0] && t.spentMin > 0).map((t) => t.spentMin).sort((a, b) => a - b);
    return sim.length >= 5 ? sim[Math.floor(sim.length / 2)] : null;
  }, [st.tasks, f.title, f.categoryId]);

  useEffect(() => { if (live && existing) setF((x) => ({ ...x, subtasks: live.subtasks, spentMin: live.spentMin, status: live.status })); }, [live?.subtasks, live?.spentMin, live?.status]); // eslint-disable-line

  const save = () => {
    if (!f.title.trim()) { useUI.getState().toast('Give the task a title first.', { kind: 'warn' }); return; }
    if (locked && !confirm('This day is locked. Edit anyway?')) return;
    const clean = { ...f, title: f.title.trim(), tags: tags.split(',').map((x) => x.trim().replace(/^@/, '')).filter(Boolean) };
    if (existing) st.updateTask(existing.id, clean);
    else { const { id: _drop, status: _s, ...rest } = clean; void _drop; void _s; st.addTask(rest); }
    useUI.getState().toast(existing ? 'Task updated' : 'Task added', { kind: 'good', ttl: 2200 });
    onClose();
  };
  const addSub = () => { if (!sub.trim()) return; const s: Subtask = { id: uid(), title: sub.trim(), done: false }; if (existing) st.addSubtasks(existing.id, [s.title]); else set('subtasks', [...f.subtasks, s]); setSub(''); };
  const breakDown = () => {
    const tpl = TEMPLATES[f.categoryId] ?? TEMPLATES.personal;
    if (existing) st.addSubtasks(existing.id, tpl); else set('subtasks', [...f.subtasks, ...tpl.map((title) => ({ id: uid(), title, done: false }))]);
    useUI.getState().toast('Broken into small steps. Start with the first one.', { kind: 'good' });
  };
  const startTiny = (min: number) => {
    if (!existing) return;
    useUI.getState().setFocus({ taskId: existing.id, mode: 'tiny_start', workMin: min, breakMin: 2, phase: 'work', running: true, elapsed: 0, round: 1, interruptions: 0, banked: 0, totalWork: 0 });
    onClose();
  };
  const subs = existing ? (live?.subtasks ?? f.subtasks) : f.subtasks;
  const cats = st.categories;

  return (
    <Drawer title={existing ? 'Edit task' : 'New task'} onClose={onClose}>
      <div className="col gap-3">
        <div className="field"><label htmlFor="te-title">Title</label>
          <input id="te-title" className="input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="What will you do?" onKeyDown={(e) => { if (e.key === 'Enter') save(); }} maxLength={200} /></div>
        <div className="grid-2">
          <div className="field"><label htmlFor="te-date">Date</label><input id="te-date" className="input" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></div>
          <div className="field"><label htmlFor="te-start">Starts</label><input id="te-start" className="input" type="time" step={st.settings.snap * 60} value={f.start} onChange={(e) => set('start', e.target.value)} /></div>
        </div>
        <div className="grid-2">
          <div className="field"><label htmlFor="te-dur">Duration (min)</label>
            <input id="te-dur" className="input tnum" type="number" min={5} max={720} step={5} value={f.dur} onChange={(e) => set('dur', Math.max(5, Number(e.target.value) || 5))} />
            {hist && hist !== f.dur && <button type="button" className="btn btn-soft btn-sm" onClick={() => set('dur', Math.round(hist / 5) * 5)}><Icon name="sparkle" size={14} />You usually take {fmtDur(hist)}. Use it?</button>}</div>
          <div className="field"><label>Quick duration</label>
            <div className="row wrap gap-1">{[15, 30, 45, 60, 90].map((m) => <button key={m} type="button" className={`btn btn-sm ${f.dur === m ? 'btn-primary' : ''}`} onClick={() => set('dur', m)}>{fmtDur(m)}</button>)}</div></div>
        </div>
        {overlaps.length > 0 && (
          <div className="banner warn" role="status"><Icon name="alert" /><div className="grow small">Overlaps <b>{overlaps[0].title}</b>{overlaps.length > 1 ? ` and ${overlaps.length - 1} more` : ''}. You can still save.</div></div>
        )}
        {isPast(f.date, f.start, f.dur, today) && f.status !== 'done' && (
          <div className="banner info" role="status"><Icon name="clock" /><div className="grow small"><b>That time has already passed today.</b> You can still save it; it will wait under “Needs attention”.</div>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => set('start', nextFreeStart(st.tasks, f.date, f.dur, today, f.id))}>Use next free slot ({nextFreeStart(st.tasks, f.date, f.dur, today, f.id)})</button></div>)}
        <div className="field"><label>Category</label>
          <div className="row wrap gap-2">{cats.map((c) => (
            <button key={c.id} type="button" className={`btn btn-sm ${f.categoryId === c.id ? 'btn-soft' : ''}`} style={{ ['--c' as string]: c.color }} aria-pressed={f.categoryId === c.id} onClick={() => set('categoryId', c.id)}><i className="dot" />{c.name}</button>))}</div></div>
        <div className="grid-2">
          <div className="field"><label>Priority</label><Seg<Priority> value={f.priority} onChange={(v) => set('priority', v)} options={[{ v: 'low', l: 'Low' }, { v: 'med', l: 'Med' }, { v: 'high', l: 'High' }]} label="Priority" /></div>
          <div className="field"><label>Energy needed</label><Seg<Energy> value={f.energy} onChange={(v) => set('energy', v)} options={[{ v: 'low', l: 'Low' }, { v: 'med', l: 'Med' }, { v: 'high', l: 'High' }]} label="Energy" /></div>
        </div>
        <div className="row between"><div><b>Top 3 of the day</b><div className="small muted">Bonus XP. Up to three per day.</div></div>
          <Switch label="Top 3" on={f.top3} onChange={(v) => { if (v && st.tasks.filter((t) => t.date === f.date && t.top3 && t.id !== f.id && !t.deletedAt).length >= 3) { useUI.getState().toast('Top 3 is full for that day. Unpin one first.', { kind: 'warn' }); return; } set('top3', v); }} /></div>
        <div className="row between"><div><b>Fixed</b><div className="small muted">Shifts skip fixed items.</div></div><Switch label="Fixed" on={f.fixed} onChange={(v) => set('fixed', v)} /></div>
        <div className="field"><label htmlFor="te-tags">Tags (comma separated)</label><input id="te-tags" className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="exam, lab" /></div>
        <div className="field"><label htmlFor="te-notes">Notes</label><textarea id="te-notes" className="textarea" value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Links, details, the very first action…" /></div>

        <div className="field">
          <div className="row between"><label>Subtasks</label><button type="button" className="btn btn-soft btn-sm" onClick={breakDown}><Icon name="layers" size={14} />Break it down</button></div>
          <div className="col gap-1">
            {subs.map((s, i) => (
              <div key={s.id} className="row gap-2">
                <button type="button" className={`check${s.done ? ' on' : ''}`} style={{ width: 24, height: 24 }} aria-label={`Toggle ${s.title}`} onClick={() => existing ? st.toggleSubtask(existing.id, s.id) : set('subtasks', f.subtasks.map((x) => x.id === s.id ? { ...x, done: !x.done } : x))}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg></button>
                <span className="grow small" style={{ textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--muted)' : undefined }}>{i === 0 && !s.done && <span className="chip accent" style={{ marginRight: 6 }}>start here</span>}{s.title}</span>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Remove subtask" onClick={() => existing ? st.updateTask(existing.id, { subtasks: subs.filter((x) => x.id !== s.id) }) : set('subtasks', f.subtasks.filter((x) => x.id !== s.id))}><Icon name="x" size={14} /></button>
              </div>))}
            <div className="row gap-2"><input className="input" value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Add a small step" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }} aria-label="New subtask" /><button type="button" className="btn btn-icon" onClick={addSub} aria-label="Add subtask"><Icon name="plus" /></button></div>
          </div>
        </div>

        {existing && existing.status !== 'done' && (
          <div className="card flat" style={{ background: 'var(--bg-2)' }}>
            <div className="row between"><div className="row gap-2"><Icon name="brain" /><b>Stuck?</b></div><button type="button" className="btn btn-ghost btn-sm" onClick={() => { setStuck(!stuck); setTip(tipFor()); }}>{stuck ? 'Hide' : 'Open'}</button></div>
            {stuck && (
              <div className="col mt-3">
                <p className="small muted">{tip}</p>
                <div className="row wrap gap-2">
                  <button type="button" className="btn btn-sm" onClick={breakDown}>Too big → Break it down</button>
                  <button type="button" className="btn btn-sm" onClick={() => startTiny(2)}>Boring → Just 2 minutes</button>
                  <button type="button" className="btn btn-sm" onClick={() => startTiny(5)}>Don’t know where to start → Tiny Start</button>
                  <button type="button" className="btn btn-sm" onClick={() => { st.updateTask(existing.id, { energy: 'low' }); useUI.getState().toast('Marked low-energy. Try the easiest 5 minutes.'); }}>Tired → Easiest 5 minutes</button>
                  <button type="button" className="btn btn-sm" onClick={() => startTiny(5)}>Distracted → 5 + 2 sprint</button>
                </div>
              </div>)}
          </div>
        )}

        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <div className="row gap-2">
            {existing && <button type="button" className="btn btn-danger btn-sm" onClick={() => { st.deleteTask(existing.id); useUI.getState().toast('Moved to Trash for 30 days', { action: { label: 'Undo', run: () => useStore.getState().restoreTask(existing.id) } }); onClose(); }}><Icon name="trash" size={15} />Delete</button>}
            {existing && <button type="button" className="btn btn-sm" onClick={() => { st.addTask({ ...existing, id: undefined as never, title: existing.title + ' (copy)', date: addDays(existing.date, 0) } as never); useUI.getState().toast('Duplicated', { kind: 'good', ttl: 1800 }); onClose(); }}><Icon name="copy" size={15} />Duplicate</button>}
          </div>
          <div className="row gap-2"><span className="small muted hide-sm">{fmtDate(f.date, today)}</span><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={save}>{existing ? 'Save' : 'Add task'}</button></div>
        </div>
      </div>
    </Drawer>
  );
}
