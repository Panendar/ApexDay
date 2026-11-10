import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { Ring } from './Ring';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { parseQuick } from '../lib/parse';
import { addDays, fmtDate, fmtTime, todayISO } from '../lib/time';
import { THEMES } from '../lib/themes';

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismiss);
  return (
    <div className="toasts" aria-live="polite" role="status">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div key={t.id} layout className={`toast ${t.kind}`} initial={{ opacity: 0, y: 30, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
            <span className="grow">{t.text}</span>
            {t.action && <button className="btn btn-sm btn-soft" onClick={() => { t.action!.run(); dismiss(t.id); }}><Icon name="undo" size={14} />{t.action.label}</button>}
            <button className="btn btn-ghost btn-icon btn-sm" aria-label="Dismiss" onClick={() => dismiss(t.id)}><Icon name="x" size={14} /></button>
            {t.ttl > 0 && t.ttl < 20000 && <i className="bar" style={{ animationDuration: `${t.ttl}ms` }} />}
          </motion.div>))}
      </AnimatePresence>
    </div>
  );
}

export function Celebration() {
  const c = useUI((s) => s.celebrate);
  const set = useUI((s) => s.setCelebrate);
  useEffect(() => { if (!c) return; const t = setTimeout(() => set(null), 3600); return () => clearTimeout(t); }, [c, set]);
  useEffect(() => { if (!c) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') set(null); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [c, set]);
  return (
    <AnimatePresence>
      {c && (
        <motion.div className="celebrate" role="dialog" aria-label={c.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => set(null)}>
          <motion.div className="celebrate-card" initial={{ scale: 0.7, y: 40, rotate: -3 }} animate={{ scale: 1, y: 0, rotate: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
            <div style={{ display: 'grid', placeItems: 'center', marginBottom: '1rem' }}>
              {c.kind === 'day' ? <Ring value={1} size={150} stroke={14}><div className="display" style={{ fontSize: '2.6rem', fontWeight: 700 }}>100%</div></Ring>
                : <div className="avatar shine" style={{ width: 96, height: 96, borderRadius: 32, background: 'var(--accent)', color: 'var(--accent-ink)' }}><Icon name={c.kind === 'level' ? 'bolt' : c.kind === 'shift' ? 'shift' : 'trophy'} size={48} /></div>}
            </div>
            <p className="eyebrow accent small" style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>{c.kind === 'day' ? 'Day complete' : c.kind === 'level' ? 'Level up' : 'Unlocked'}</p>
            <h2>{c.title}</h2>
            <p className="muted mt-2">{c.sub}</p>
            <p className="tiny faint mt-3">Click anywhere or press Esc to skip</p>
          </motion.div>
        </motion.div>)}
    </AnimatePresence>
  );
}

const KEYS: [string, string][] = [['N', 'New task'], ['I', 'Capture to Inbox'], ['Space', 'Complete selected task'], ['F', 'Focus Mode on selected / current task'], ['S', 'Shift'], ['T', 'Jump to today'], ['/  or  Ctrl+K', 'Search / command palette'], ['← →', 'Change day (Plan, Calendar)'], ['↑ ↓', 'Move selection'], ['?', 'Show shortcuts']];
export function ShortcutsHelp() {
  const open = useUI((s) => s.shortcuts), set = useUI((s) => s.setShortcuts);
  return (
    <AnimatePresence>
      {open && (
        <Modal title="Keyboard shortcuts" subtitle="Everything works without a mouse." onClose={() => set(false)}>
          <div className="col gap-1">{KEYS.map(([k, d]) => <div key={k} className="list-row"><span className="grow">{d}</span><span className="row gap-1">{k.split(' ').filter((x) => x && x !== 'or').map((x, i) => <span key={i} className="kbd">{x}</span>)}</span></div>)}</div>
        </Modal>)}
    </AnimatePresence>
  );
}

interface Item { id: string; group: string; label: string; hint?: string; icon: string; run: () => void }

export function CommandPalette() {
  const open = useUI((s) => s.palette);
  return <AnimatePresence>{open && <Palette />}</AnimatePresence>;
}

function Palette() {
  const nav = useNavigate();
  const st = useStore();
  const ui = useUI.getState();
  const close = () => ui.setPalette(false);
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const today = todayISO(st.settings.dayStartHour);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo<Item[]>(() => {
    const go = (p: string) => () => { nav(p); close(); };
    const acts: Item[] = [
      { id: 'new', group: 'Actions', label: 'New task', hint: 'N', icon: 'plus', run: () => { close(); ui.openEditor({}); } },
      { id: 'cap', group: 'Actions', label: 'Capture to Inbox', hint: 'I', icon: 'inbox', run: () => { close(); ui.setCapture(true); } },
      { id: 'shift', group: 'Actions', label: 'Shift…', hint: 'S', icon: 'shift', run: () => { close(); ui.openShift(); } },
      { id: 'reset', group: 'Actions', label: 'Reset my day', icon: 'refresh', run: () => { close(); ui.openShift('reset', today); } },
      { id: 'hol', group: 'Actions', label: 'Mark tomorrow a holiday', icon: 'flag', run: () => { close(); ui.openShift('holiday'); } },
      { id: 'focus', group: 'Actions', label: 'Start Focus Mode on the next task', hint: 'F', icon: 'bolt', run: () => { close(); const t = useStore.getState().tasks.filter((x) => x.date === today && x.status !== 'done' && !x.deletedAt && x.status !== 'skipped' && x.status !== 'moved').sort((a, b) => a.start.localeCompare(b.start))[0]; if (t) ui.setFocus({ taskId: t.id, mode: 'free', workMin: st.settings.focusWork, breakMin: st.settings.focusBreak, phase: 'work', running: true, elapsed: 0, round: 1, interruptions: 0, banked: 0, totalWork: 0 }); else ui.toast('Nothing left to focus on today. Nice.'); } },
      { id: 'motion', group: 'Actions', label: st.settings.motion === 'full' ? 'Reduce motion' : 'Enable full motion', icon: 'wind', run: () => { st.set({ motion: st.settings.motion === 'full' ? 'reduced' : 'full' }); close(); } },
      { id: 'keys', group: 'Actions', label: 'Show keyboard shortcuts', hint: '?', icon: 'command', run: () => { close(); ui.setShortcuts(true); } },
      ...[['Today', '/app', 'today'], ['Plan', '/app/plan', 'plan'], ['Calendar', '/app/calendar', 'calendar'], ['Progress', '/app/progress', 'chart'], ['Routines & Timetable', '/app/routines', 'repeat'], ['Habits & Goals', '/app/habits', 'target'], ['Quests', '/app/quests', 'gift'], ['Achievements & Apex', '/app/achievements', 'trophy'], ['Reviews', '/app/reviews', 'book'], ['Trash & History', '/app/trash', 'trash'], ['Settings', '/app/settings', 'sliders']].map(([l, p, ic]) => ({ id: 'go' + p, group: 'Go to', label: l, icon: ic, run: go(p) })),
      ...THEMES.map((t) => ({ id: 'th' + t.id, group: 'Theme', label: `Theme: ${t.name}`, icon: 'sparkle', run: () => { st.set({ theme: t.id }); close(); } })),
      ...st.routines.map((r) => ({ id: 'rt' + r.id, group: 'Apply routine to tomorrow', label: r.name, icon: r.icon, run: () => { const n = st.applyRoutine(r.id, addDays(today, 1)); ui.toast(`Added ${n} tasks from “${r.name}” to tomorrow`, { kind: 'good' }); close(); } })),
    ];
    const s = q.trim().toLowerCase();
    if (!s) return acts.filter((a) => a.group !== 'Theme' && !a.group.startsWith('Apply'));
    const res: Item[] = [];
    const parsed = parseQuick(q, today, st.categories);
    if (parsed.title.length > 1) res.push({ id: 'qa', group: 'Quick-add', label: `Add “${parsed.title}”${parsed.start ? ' at ' + fmtTime(parsed.start, st.settings.hour12) : ''}${parsed.dur ? ' · ' + parsed.dur + 'm' : ''}${parsed.date ? ' · ' + fmtDate(parsed.date, today) : ''}`, icon: 'plus', hint: 'Enter', run: () => { close(); ui.openEditor({ defaults: { title: parsed.title, date: parsed.date ?? today, start: parsed.start ?? '09:00', dur: parsed.dur ?? 30, priority: parsed.priority, categoryId: parsed.categoryId, tags: parsed.tags, fixed: parsed.fixed } }); } });
    res.push(...acts.filter((a) => (a.label + ' ' + a.group).toLowerCase().includes(s)));
    st.tasks.filter((t) => !t.deletedAt && t.status !== 'moved' && (t.title + ' ' + (t.notes ?? '') + ' ' + t.tags.join(' ')).toLowerCase().includes(s)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
      .forEach((t) => res.push({ id: 't' + t.id, group: 'Tasks', label: t.title, hint: `${fmtDate(t.date, today)} ${fmtTime(t.start, st.settings.hour12)}`, icon: t.status === 'done' ? 'check' : 'clock', run: () => { close(); ui.openEditor({ id: t.id }); } }));
    st.inbox.filter((x) => x.text.toLowerCase().includes(s)).slice(0, 4).forEach((x) => res.push({ id: 'i' + x.id, group: 'Inbox', label: x.text, icon: 'inbox', run: () => { close(); nav('/app/plan'); } }));
    return res;
  }, [q, st.tasks, st.inbox, st.routines, st.settings.motion, st.settings.hour12]); // eslint-disable-line

  useEffect(() => setI(0), [q]);
  useEffect(() => { listRef.current?.querySelector('[data-on="true"]')?.scrollIntoView({ block: 'nearest' }); }, [i]);
  let last = '';
  return (
    <motion.div className="overlay top" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <motion.div className="palette" role="dialog" aria-label="Command palette" initial={{ y: -16, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ type: 'spring', stiffness: 460, damping: 34 }}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks, run a command, or type “DSA 6pm 90m tomorrow”" aria-label="Search or command"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(items.length - 1, x + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
            else if (e.key === 'Enter') { e.preventDefault(); items[i]?.run(); }
            else if (e.key === 'Escape') close();
          }} />
        <div className="palette-list" ref={listRef} role="listbox">
          {items.length === 0 && <div className="empty"><p>No results for “{q}”. Try fewer words.</p></div>}
          {items.map((it, idx) => {
            const head = it.group !== last ? <div className="palette-group">{it.group}</div> : null; last = it.group;
            return <div key={it.id}>{head}<div role="option" aria-selected={idx === i} data-on={idx === i} className={`palette-item${idx === i ? ' on' : ''}`} onMouseEnter={() => setI(idx)} onClick={it.run}>
              <Icon name={it.icon} size={18} /><span className="grow ellipsis">{it.label}</span>{it.hint && <span className="kbd">{it.hint}</span>}</div></div>;
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
