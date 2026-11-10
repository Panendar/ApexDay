import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { Ring } from './Ring';
import { useStore, tasksOn } from '../store/useStore';
import { useUI } from '../store/useUI';
import { useNowMin, useProgressMeta, useToday } from '../lib/hooks';
import { completeWithFx } from '../store/actions';
import { dayStats, isActive } from '../lib/progress';
import { toMin, todayISO } from '../lib/time';
import { resolveTheme } from '../lib/themes';
import { Onboarding } from '../pages/Onboarding';
import { startSync, syncState, onSync } from '../lib/sync';
import { questOfDay, questProgress } from '../lib/quests';
import { burst } from '../lib/fx';

const NAV: { to: string; label: string; icon: string; end?: boolean; key?: string }[] = [
  { to: '/app', label: 'Today', icon: 'today', end: true, key: 'T' },
  { to: '/app/plan', label: 'Plan', icon: 'plan' },
  { to: '/app/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/app/progress', label: 'Progress', icon: 'chart' },
  { to: '/app/routines', label: 'Routines', icon: 'repeat' },
  { to: '/app/habits', label: 'Habits & Goals', icon: 'target' },
  { to: '/app/quests', label: 'Quests', icon: 'gift' },
  { to: '/app/achievements', label: 'Apex & Badges', icon: 'trophy' },
  { to: '/app/reviews', label: 'Reviews', icon: 'book' },
  { to: '/app/trash', label: 'Trash & History', icon: 'history' },
  { to: '/app/settings', label: 'Settings', icon: 'sliders' },
];
const TABS = [NAV[0], NAV[1], NAV[2], NAV[3]];

function useGlobalEffects() {
  const settings = useStore((s) => s.settings);
  useEffect(() => {
    const el = document.documentElement;
    const apply = () => {
      const th = resolveTheme(settings.theme);
      el.dataset.theme = th;
      el.dataset.density = settings.density;
      el.dataset.motion = settings.motion;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(el).getPropertyValue('--bg').trim() || '#0b0b0c');
    };
    apply();
    if (settings.theme === 'auto') { const m = matchMedia('(prefers-color-scheme: light)'); m.addEventListener('change', apply); return () => m.removeEventListener('change', apply); }
  }, [settings.theme, settings.density, settings.motion]);
  useEffect(() => { useStore.getState().ensureHorizon(); useStore.getState().checkAchievements(); return startSync(); }, []);
}

/** Tab title + favicon show the current task and a progress ring so the day stays visible in a background tab. */
function useTabPresence() {
  const today = useToday();
  const now = useNowMin(30000);
  const tasks = useStore((s) => s.tasks);
  const settings = useStore((s) => s.settings);
  const focus = useUI((s) => s.focus);
  useEffect(() => {
    const list = tasks.filter((t) => t.date === today && isActive(t));
    const st = dayStats(list, settings);
    const cur = list.find((t) => t.status !== 'done' && t.status !== 'skipped' && toMin(t.start) <= now && now < toMin(t.start) + t.dur);
    document.title = focus ? `● Focus · ${list.find((t) => t.id === focus.taskId)?.title ?? 'ApexDay'}` : cur ? `${st.pct}% · ${cur.title}` : `${st.pct}% · ApexDay`;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c6f432';
    g.fillStyle = '#0b0b0c'; g.beginPath(); g.roundRect(0, 0, 64, 64, 16); g.fill();
    g.lineWidth = 8; g.strokeStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(32, 32, 20, 0, 7); g.stroke();
    g.strokeStyle = accent; g.lineCap = 'round'; g.beginPath(); g.arc(32, 32, 20, -Math.PI / 2, -Math.PI / 2 + (st.pct / 100) * Math.PI * 2); g.stroke();
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.type = 'image/png'; link.href = c.toDataURL('image/png');
  }, [tasks, today, now, focus, settings.w25, settings.w50, settings.theme]);
}

/** Watches today's accepted quest and rewards it the moment its goal is met. */
function useQuestWatcher() {
  useEffect(() => {
    const check = () => {
      const s = useStore.getState();
      const today = todayISO(s.settings.dayStartHour);
      const e = s.quests?.[today];
      if (!e?.accepted || e.doneAt || e.dropped) return;
      const def = questOfDay(today);
      if (!questProgress(s, def, today, e).done) return;
      const xp = s.completeQuest(today);
      if (!xp) return;
      burst({ x: innerWidth / 2, y: innerHeight / 3, big: true });
      useUI.getState().toast(`Quest complete: ${def.title}. +${xp} XP`, { kind: 'good', ttl: 7000 });
    };
    check();
    return useStore.subscribe(check);
  }, []);
}

function useShortcuts() {
  const nav = useNavigate();
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const ui = useUI.getState();
      const el = e.target as HTMLElement;
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ui.setPalette(!ui.palette); return; }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (ui.palette || ui.editor || ui.shift.open || ui.focus || ui.quickAdd || ui.capture || ui.shortcuts) return;
      const st = useStore.getState();
      const k = e.key;
      const sel = ui.selected ? st.tasks.find((t) => t.id === ui.selected) : undefined;
      const dateNow = (() => { const d = new Date(); if (d.getHours() < st.settings.dayStartHour) d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
      const cur = sel ?? tasksOn(st, dateNow).filter((t) => t.status !== 'done' && isActive(t)).find((t) => toMin(t.start) + t.dur > new Date().getHours() * 60 + new Date().getMinutes());
      if (k === '/') { e.preventDefault(); ui.setPalette(true); }
      else if (k === '?') ui.setShortcuts(true);
      else if (k.toLowerCase() === 'n') { e.preventDefault(); ui.openEditor({ defaults: ui.viewDate ? { date: ui.viewDate } : undefined }); }
      else if (k.toLowerCase() === 'i') { e.preventDefault(); ui.setCapture(true); }
      else if (k.toLowerCase() === 's') ui.openShift(undefined, ui.viewDate ?? undefined);
      else if (k.toLowerCase() === 't') { ui.setViewDate(null); nav('/app'); }
      else if (k === ' ' && cur && cur.status !== 'done') { e.preventDefault(); completeWithFx(cur.id, document.querySelector('.tcard.selected .check') ?? undefined); }
      else if (k.toLowerCase() === 'f' && cur) ui.setFocus({ taskId: cur.id, mode: 'free', workMin: st.settings.focusWork, breakMin: st.settings.focusBreak, phase: 'work', running: true, elapsed: 0, round: 1, interruptions: 0, banked: 0, totalWork: 0 });
      else if (k === 'ArrowDown' || k === 'ArrowUp') {
        const list = [...document.querySelectorAll<HTMLElement>('.tcard')];
        if (!list.length) return; e.preventDefault();
        const i = list.findIndex((x) => x.classList.contains('selected'));
        const n = list[Math.max(0, Math.min(list.length - 1, i + (k === 'ArrowDown' ? 1 : -1)))];
        n.focus(); n.click();
      }
    };
    addEventListener('keydown', h);
    return () => removeEventListener('keydown', h);
  }, [nav]);
}

export function Shell() {
  useGlobalEffects();
  useTabPresence();
  useShortcuts();
  useQuestWatcher();
  const onboarded = useStore((s) => s.onboarded);
  const loc = useLocation();
  const meta = useProgressMeta();
  const [more, setMore] = useState(false);
  const setPalette = useUI((s) => s.setPalette);
  const setQuickAdd = useUI((s) => s.setQuickAdd);
  const openShift = useUI((s) => s.openShift);
  const name = useStore((s) => s.settings.name);
  const pct = meta.todaySummary?.pct ?? 0;
  useEffect(() => setMore(false), [loc.pathname]);
  useEffect(() => { document.querySelector('.main')?.scrollTo({ top: 0 }); }, [loc.pathname]);
  const isTab = (to: string) => (to === '/app' ? loc.pathname === '/app' : loc.pathname.startsWith(to));
  const moreActive = useMemo(() => !TABS.some((t) => isTab(t.to)), [loc.pathname]); // eslint-disable-line

  if (!onboarded) return <Onboarding />;

  return (
    <div className="app">
      <a href="#main" className="sr-only">Skip to content</a>
      <nav className="rail" aria-label="Main">
        <div className="brand"><span className="brand-mark"><Icon name="mountain" size={20} stroke={2.4} /></span><span className="brand-text">ApexDay</span></div>
        <button className="rail-link" onClick={() => setPalette(true)} style={{ background: 'var(--surface)', border: '1px solid var(--line)', marginBottom: 8 }} aria-label="Search or command palette"><Icon name="search" /><span>Search…</span><span className="kbd">Ctrl K</span></button>
        {NAV.slice(0, 8).map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `rail-link${isActive ? ' active' : ''}`} title={n.label}><Icon name={n.icon} /><span>{n.label}</span>{n.key && <span className="kbd">{n.key}</span>}</NavLink>)}
        <div className="rail-sep" />
        {NAV.slice(8).map((n) => <NavLink key={n.to} to={n.to} className={({ isActive }) => `rail-link${isActive ? ' active' : ''}`} title={n.label}><Icon name={n.icon} /><span>{n.label}</span></NavLink>)}
        <div className="rail-foot">
          <SyncChip />
          <button className="btn" onClick={() => setQuickAdd(true)} title="Quick add (N for full editor)"><Icon name="plus" size={18} /><span className="hide-sm">New task</span></button>
          <button className="btn btn-primary" onClick={() => openShift()} title="Shift (S)"><Icon name="shift" size={18} /><span className="hide-sm">Shift</span></button>
          <div className="card flat row gap-3 hide-sm" style={{ padding: '0.7rem' }}>
            <Ring value={pct / 100} size={46} stroke={5}><span className="tiny tnum" style={{ fontWeight: 700 }}>{pct}</span></Ring>
            <div className="grow"><div className="small" style={{ fontWeight: 600 }}>{name}</div><div className="tiny muted">Lv {meta.level} · {meta.xp.toLocaleString()} XP</div></div>
            <span className="streak" title="Current streak"><Icon name="flame" size={14} fill />{meta.streak.current}</span>
          </div>
        </div>
      </nav>

      <main className="main" id="main" tabIndex={-1}>
        <div className="topbar">
          <div className="brand" style={{ padding: 0 }}><span className="brand-mark" style={{ width: 30, height: 30 }}><Icon name="mountain" size={18} stroke={2.4} /></span>ApexDay</div>
          <div className="row gap-2">
            <span className="streak"><Icon name="flame" size={14} fill />{meta.streak.current}</span>
            <button className="btn btn-icon btn-sm" onClick={() => setPalette(true)} aria-label="Search"><Icon name="search" size={18} /></button>
            <button className="btn btn-icon btn-sm" onClick={() => openShift()} aria-label="Shift"><Icon name="shift" size={18} /></button>
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <button className="fab" onClick={() => setQuickAdd(true)} aria-label="Quick add task" title="Quick add"><Icon name="plus" size={28} stroke={2.6} /></button>
      <nav className="tabbar" aria-label="Primary">
        {TABS.map((t) => <NavLink key={t.to} to={t.to} end={t.end} className={`tab${isTab(t.to) ? ' active' : ''}`}><Icon name={t.icon} size={22} />{t.label}</NavLink>)}
        <button className={`tab${moreActive ? ' active' : ''}`} style={{ background: 'none', border: 0 }} onClick={() => setMore(true)} aria-label="More"><Icon name="menu" size={22} />More</button>
      </nav>
      <AnimatePresence>
        {more && (
          <Modal title="More" onClose={() => setMore(false)}>
            <div className="grid-2 keep2" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
              {NAV.slice(4).map((n) => <NavLink key={n.to} to={n.to} className="op-tile"><span className="row gap-2" style={{ color: 'var(--accent-text)' }}><Icon name={n.icon} /><b style={{ color: 'var(--text)' }}>{n.label}</b></span></NavLink>)}
            </div>
          </Modal>)}
      </AnimatePresence>
    </div>
  );
}

function SyncChip() {
  const auth = useStore((s) => s.auth);
  const [, force] = useState(0);
  useEffect(() => onSync(() => force((n) => n + 1)), []);
  const nav = useNavigate();
  const label = !auth ? 'Local only' : syncState.status === 'syncing' ? 'Syncing…' : syncState.status === 'offline' ? 'Offline · queued' : syncState.status === 'error' ? 'Sync error' : 'Synced';
  const tone = !auth ? '' : syncState.status === 'error' ? 'warn' : syncState.status === 'offline' ? 'info' : 'good';
  return <button className={`chip ${tone} hide-sm`} style={{ alignSelf: 'flex-start', cursor: 'pointer' }} onClick={() => nav('/app/settings')} title={syncState.message ?? (auth ? auth.username : 'Sign in to sync across devices')}><Icon name={auth ? 'wifi' : 'shield'} size={12} />{label}</button>;
}
