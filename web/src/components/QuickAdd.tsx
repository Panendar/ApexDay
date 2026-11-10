import { useMemo, useRef, useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { parseQuick } from '../lib/parse';
import { fmtDate, fmtDur, fmtTime, todayISO } from '../lib/time';
import { isPast, nextFreeStart } from '../lib/slots';

/** Quick-add bar: natural text → live-parsed fields → Enter adds, Shift+Enter edits details. */
export function QuickAddBar({ date, autoFocus, onDone, placeholder }: { date?: string; autoFocus?: boolean; onDone?: () => void; placeholder?: string }) {
  const st = useStore();
  const today = todayISO(st.settings.dayStartHour);
  const [text, setText] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  const p = useMemo(() => parseQuick(text, date ?? today, st.categories), [text, date, today, st.categories]);
  const cat = st.categories.find((c) => c.id === p.categoryId);

  const free = (d: string, dur: number) => nextFreeStart(st.tasks, d, dur, today);
  const build = () => {
    const d = p.date ?? date ?? today, dur = p.dur ?? 30;
    return { title: p.title, date: d, start: p.start ?? free(d, dur), dur, priority: p.priority, categoryId: p.categoryId, tags: p.tags, fixed: p.fixed };
  };
  const submit = (details: boolean) => {
    if (!p.title) return;
    const t = build();
    if (details) useUI.getState().openEditor({ defaults: t });
    else {
      const id = st.addTask(t);
      if (isPast(t.date, t.start, t.dur, today)) {
        const alt = nextFreeStart(useStore.getState().tasks, t.date, t.dur, today, id);
        useUI.getState().toast(`Added “${t.title}”. ${fmtTime(t.start, st.settings.hour12)} has already passed, so it is under Needs attention.`, { kind: 'warn', ttl: 9000, action: { label: `Move to ${fmtTime(alt, st.settings.hour12)}`, run: () => useStore.getState().updateTask(id, { start: alt }) } });
      } else useUI.getState().toast(`Added “${t.title}” · ${fmtDate(t.date, today)} ${fmtTime(t.start, st.settings.hour12)}`, { kind: 'good', ttl: 2600, action: { label: 'Undo', run: () => useStore.getState().purgeTask(id) } });
    }
    setText(''); onDone?.();
  };
  return (
    <div className="col gap-2">
      <div className="row gap-2">
        <div className="grow" style={{ position: 'relative' }}>
          <input ref={ref} className="input" style={{ paddingLeft: '2.4rem', minHeight: 48 }} value={text} onChange={(e) => setText(e.target.value)} aria-label="Quick add a task"
            placeholder={placeholder ?? 'DSA 6pm 90m tomorrow !high #study @exam'} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(e.shiftKey); } }} />
          <span style={{ position: 'absolute', left: 12, top: 13, color: 'var(--accent-text)' }}><Icon name="plus" /></span>
        </div>
        <button className="btn btn-primary" style={{ minHeight: 48 }} onClick={() => submit(false)} disabled={!p.title}>Add</button>
      </div>
      {text.trim() && (
        <div className="row wrap gap-1 reveal" aria-live="polite">
          <span className="chip accent">{p.title || '…'}</span>
          <span className="chip"><Icon name="calendar" size={12} />{fmtDate(p.date ?? date ?? today, today)}</span>
          <span className="chip"><Icon name="clock" size={12} />{p.start ? fmtTime(p.start, st.settings.hour12) : 'next free slot'}</span>
          <span className="chip">{fmtDur(p.dur ?? 30)}</span>
          {p.priority && <span className={`chip ${p.priority === 'high' ? 'warn' : ''}`}>{p.priority}</span>}
          {cat && <span className="chip" style={{ ['--c' as string]: cat.color }}><i className="dot" />{cat.name}</span>}
          {p.tags.map((t) => <span key={t} className="chip">@{t}</span>)}
          {p.fixed && <span className="chip info">fixed</span>}
          <span className="small faint">Enter adds · Shift+Enter edits details</span>
        </div>)}
    </div>
  );
}

export function QuickAddModal() {
  const open = useUI((s) => s.quickAdd);
  const set = useUI((s) => s.setQuickAdd);
  const viewDate = useUI((s) => s.viewDate);
  return <AnimatePresence>{open && <Modal title="Quick add" subtitle="Type naturally. Times, durations, !priority, #category, @tags." onClose={() => set(false)}><QuickAddBar autoFocus date={viewDate ?? undefined} onDone={() => set(false)} /></Modal>}</AnimatePresence>;
}

export function CaptureModal() {
  const open = useUI((s) => s.capture);
  const set = useUI((s) => s.setCapture);
  const add = useStore((s) => s.addInbox);
  const items = useStore((s) => s.inbox);
  const [t, setT] = useState('');
  return (
    <AnimatePresence>
      {open && (
        <Modal title="Capture to Inbox" subtitle="One line, no scheduling. Sort it out later." onClose={() => set(false)}>
          <form className="row gap-2" onSubmit={(e) => { e.preventDefault(); if (t.trim()) { add(t.trim()); setT(''); useUI.getState().toast('Captured', { kind: 'good', ttl: 1200 }); } }}>
            <input className="input" autoFocus value={t} onChange={(e) => setT(e.target.value)} placeholder="What’s on your mind?" aria-label="Inbox item" style={{ minHeight: 48 }} />
            <button className="btn btn-primary" style={{ minHeight: 48 }}>Capture</button>
          </form>
          <p className="small muted mt-3">{items.length} item{items.length === 1 ? '' : 's'} waiting. Press Esc when you’re done; keep typing to capture more.</p>
        </Modal>)}
    </AnimatePresence>
  );
}
