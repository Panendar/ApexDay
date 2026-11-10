import { useStore, type Data } from '../store/useStore';
import { useUI } from '../store/useUI';
import type { Goal, Habit, InboxItem, Task } from './types';
import { questByCode } from './quests';

/**
 * Offline-first sync with the ApexDay API.
 * - Rows are derived from app state in the server's table shape (docs/project/db_design.md).
 * - Only fields that changed since the last successful push are sent, each stamped with its own time,
 *   so two devices editing different fields of one task both win (per-field last-writer-wins).
 * - Removed rows are sent as soft deletes (deleted_at), never hard deletes.
 */
type Row = Record<string, unknown>;
const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
const SNAP_KEY = 'apexday-sync-snapshot';
export type SyncState = { status: 'off' | 'idle' | 'syncing' | 'offline' | 'error'; at?: number; message?: string; pending: number };
export const syncState: SyncState = { status: 'off', pending: 0 };
const listeners = new Set<() => void>();
export const onSync = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const set = (p: Partial<SyncState>) => { Object.assign(syncState, p); listeners.forEach((l) => l()); };

const PRI = { low: 'low', med: 'medium', high: 'high' } as const;
const PRI_BACK = { low: 'low', medium: 'med', high: 'high' } as const;
const iso = (t?: number) => (t ? new Date(t).toISOString() : null);

// Legacy local ids ('study', 'h1', 'r1'...) are the same on every device and every user, so on the server they are
// namespaced per user. UUID ids (everything created now) pass through untouched.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
const uidOf = () => useStore.getState().auth?.userId ?? 'local';
const ns = (id: string) => (UUID.test(id) ? id : `${uidOf()}-${id}`);
const N = (id?: string | null) => (id ? ns(id) : null);
const un = (id: string) => (id.startsWith(uidOf() + '-') ? id.slice(uidOf().length + 1) : id);
const unN = (id?: unknown) => (typeof id === 'string' ? un(id) : undefined);

// quest_defs are server reference data (UUID ids). We remember code -> id so results can reference them.
const QD_KEY = 'apexday-quest-defs';
const questDefs = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(QD_KEY) ?? '{}'); } catch { return {}; } };
const rememberQuestDefs = (rows?: Row[]) => { if (rows?.length) { const m = questDefs(); rows.forEach((r) => { m[r.code as string] = r.id as string; }); try { localStorage.setItem(QD_KEY, JSON.stringify(m)); } catch { /* quota */ } } };

// ---------- state -> rows ----------
function rowsOf(s: Data) {
  const uid = s.auth?.userId;
  const t: Record<string, Row[]> = {};
  t.users = uid ? [{ id: uid, name: s.settings.name, theme: s.settings.theme, week_start: s.settings.weekStart === 0 ? 7 : 1, day_start_hour: s.settings.dayStartHour }] : [];
  t.user_settings = uid ? [{
    user_id: uid, density: s.settings.density, time_format: s.settings.hour12 ? '12h' : '24h', snap_grid_min: s.settings.snap, overload_limit_min: s.settings.overloadHours * 60,
    onboarding_done_at: s.onboardedAt ? iso(s.onboardedAt) : null, streak_threshold_pct: s.settings.streakThreshold, streak_freezes_per_month: s.settings.freezesPerMonth, partial_credit1: s.settings.w25, partial_credit2: s.settings.w50,
    reduced_motion: s.settings.motion === 'reduced' ? 'on' : 'system', sound_enabled: s.settings.sound ? 1 : 0, tone: s.settings.tone, tips_enabled: s.settings.tips ? 1 : 0,
    nudges_enabled: s.settings.nudges ? 1 : 0, nudge_delay_min: s.settings.nudgeDelay, nudge_daily_cap: s.settings.nudgeCap, focus_work_min: s.settings.focusWork, focus_break_min: s.settings.focusBreak,
  }] : [];
  t.categories = s.categories.map((c, i) => ({ id: ns(c.id), name: c.name, color: c.color, icon: c.icon, weekly_goal_min: c.weeklyGoalMin, sort_order: i }));
  t.routines = s.routines.map((r) => ({ id: ns(r.id), name: r.name, color: r.color, icon: r.icon, category_id: N(r.categoryId), recurrence_rule: r.recurrence, active_from: '2026-01-01', archived_at: r.active ? null : '2026-01-01T00:00:00.000Z' }));
  t.routine_tasks = s.routines.flatMap((r) => r.tasks.map((x, i) => ({ id: `${ns(r.id)}:${i}`, routine_id: ns(r.id), title: x.title, start_time: x.start, duration_min: x.dur, sort_order: i })));
  const qd = questDefs();
  t.user_quests = uid ? Object.entries(s.quests ?? {}).filter(([, e]) => e.doneAt && qd[e.code]).map(([d, e]) => ({ id: `quest-${uid}-${d}`, date: d, quest_id: qd[e.code], completed_at: iso(e.doneAt), xp_awarded: questByCode(e.code)?.xp ?? 0 })) : [];
  t.goals = s.goals.map((g) => ({ id: ns(g.id), title: g.title, category_id: N(g.categoryId), target_type: g.targetType, target_value: g.targetValue, due_date: g.due || null }));
  t.habits = s.habits.map((h) => ({ id: ns(h.id), name: h.name, icon: h.icon, color: h.color, cadence: h.cadence, target_count: h.target, unit: h.unit }));
  t.inbox_items = s.inbox.map((i) => ({ id: ns(i.id), text: i.text, archived_at: i.archived ? iso(i.createdAt) : null }));
  t.tasks = s.tasks.map((x) => ({
    id: ns(x.id), title: x.title, notes: x.notes ?? null, category_id: N(x.categoryId), priority: PRI[x.priority], energy: PRI[x.energy], date: x.date, start_time: x.start, duration_min: x.dur,
    is_fixed: x.fixed ? 1 : 0, is_top3: x.top3 ? 1 : 0, source: x.source, status: x.status, skip_reason: x.skipReason ?? null, routine_task_id: x.routineKey ? (() => { const i = x.routineKey.lastIndexOf(':'); return `${ns(x.routineKey.slice(0, i))}${x.routineKey.slice(i)}`; })() : null, deleted_at: iso(x.deletedAt),
  }));
  t.subtasks = s.tasks.flatMap((x) => x.subtasks.map((u, i) => ({ id: ns(u.id), task_id: ns(x.id), title: u.title, sort_order: i, is_done: u.done ? 1 : 0 })));
  const days = new Set([...Object.keys(s.dayTypes), ...Object.keys(s.intentions), ...Object.keys(s.locked).filter((d) => s.locked[d])]);
  t.day_plans = [...days].map((d) => ({ id: `day-${uid ?? 'local'}-${d}`, date: d, day_type: s.dayTypes[d] ?? (new Date(d + 'T00:00:00').getDay() === 0 ? 'rest' : 'normal'), intention: s.intentions[d] ?? null, is_locked: s.locked[d] ? 1 : 0 }));
  return t;
}

// ---------- rows -> state ----------
function applyRows(tables: Record<string, Row[]>) {
  useStore.setState((s) => {
    const patch: Partial<Data> = {};
    const cats = tables.categories;
    if (cats?.length) {
      const m = new Map(s.categories.map((c) => [c.id, c]));
      cats.filter((r) => !r.deleted_at).forEach((r) => m.set(un(r.id as string), { id: un(r.id as string), name: r.name as string, color: r.color as string, icon: (r.icon as string) ?? 'book', weeklyGoalMin: (r.weekly_goal_min as number) ?? 0 }));
      patch.categories = [...m.values()];
    }
    if (tables.tasks?.length || tables.subtasks?.length) {
      const m = new Map(s.tasks.map((t) => [t.id, t]));
      for (const r of tables.tasks ?? []) {
        const old = m.get(un(r.id as string));
        const task: Task = {
          id: un(r.id as string), title: r.title as string, notes: (r.notes as string) ?? undefined, categoryId: unN(r.category_id) ?? old?.categoryId ?? 'study', tags: old?.tags ?? [],
          priority: PRI_BACK[r.priority as keyof typeof PRI_BACK] ?? 'med', energy: PRI_BACK[r.energy as keyof typeof PRI_BACK] ?? 'med', date: r.date as string, start: r.start_time as string, dur: r.duration_min as number,
          fixed: !!r.is_fixed, top3: !!r.is_top3, source: (r.source as Task['source']) ?? 'manual', status: r.status as Task['status'], skipReason: (r.skip_reason as string) ?? undefined,
          routineKey: r.routine_task_id ? (() => { const v = r.routine_task_id as string; const i = v.lastIndexOf(':'); return `${un(v.slice(0, i))}${v.slice(i)}`; })() : old?.routineKey, subtasks: old?.subtasks ?? [], spentMin: old?.spentMin ?? 0, doneAt: old?.doneAt, late: old?.late, movedFrom: old?.movedFrom, goalId: old?.goalId, deletedAt: r.deleted_at ? Date.parse(r.deleted_at as string) : undefined,
        };
        m.set(task.id, task);
      }
      for (const r of tables.subtasks ?? []) {
        const t = m.get(un(r.task_id as string)); if (!t) continue;
        const subs = t.subtasks.filter((x) => x.id !== un(r.id as string));
        if (!r.deleted_at) subs.push({ id: un(r.id as string), title: r.title as string, done: !!r.is_done });
        m.set(t.id, { ...t, subtasks: subs });
      }
      patch.tasks = [...m.values()];
    }
    if (tables.routines?.length || tables.routine_tasks?.length) {
      const m = new Map(s.routines.map((r) => [r.id, r]));
      for (const r of tables.routines ?? []) {
        const rid = un(r.id as string);
        if (r.deleted_at) { m.delete(rid); continue; }
        const old = m.get(rid);
        m.set(rid, { id: rid, name: r.name as string, color: (r.color as string) ?? '#c6f432', icon: (r.icon as string) ?? 'repeat', recurrence: r.recurrence_rule as string, categoryId: unN(r.category_id) ?? 'study', active: !r.archived_at, tasks: old?.tasks ?? [] });
      }
      const byR = new Map<string, Row[]>();
      for (const rt of tables.routine_tasks ?? []) { const k = un(rt.routine_id as string); const l = byR.get(k) ?? []; l.push(rt); byR.set(k, l); }
      for (const [rid, rows] of byR) {
        const r = m.get(rid); if (!r) continue;
        const slots = new Map(r.tasks.map((x, i) => [i, x]));
        for (const rt of rows) { const i = Number(String(rt.id).split(':').pop()); if (rt.deleted_at) slots.delete(i); else slots.set(i, { title: rt.title as string, start: rt.start_time as string, dur: rt.duration_min as number }); }
        m.set(rid, { ...r, tasks: [...slots.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]) });
      }
      patch.routines = [...m.values()];
    }
    if (tables.user_quests?.length) {
      const byId = Object.fromEntries(Object.entries(questDefs()).map(([c, i]) => [i, c]));
      const quests = { ...s.quests };
      tables.user_quests.forEach((r) => { const code = byId[r.quest_id as string]; const d = r.date as string; if (code && r.completed_at && !quests[d]?.doneAt) quests[d] = { code, accepted: true, base: s.counters.sprints, doneAt: Date.parse(r.completed_at as string) }; });
      patch.quests = quests;
    }
    if (tables.inbox_items?.length) {
      const m = new Map<string, InboxItem>(s.inbox.map((i) => [i.id, i]));
      tables.inbox_items.forEach((r) => { const id = un(r.id as string); if (r.deleted_at || r.archived_at) m.delete(id); else m.set(id, { id, text: r.text as string, createdAt: m.get(id)?.createdAt ?? Date.parse(r.created_at as string) }); });
      patch.inbox = [...m.values()].sort((a, b) => b.createdAt - a.createdAt);
    }
    if (tables.habits?.length) {
      const m = new Map<string, Habit>(s.habits.map((h) => [h.id, h]));
      tables.habits.forEach((r) => { const id = un(r.id as string); if (r.deleted_at) m.delete(id); else m.set(id, { ...(m.get(id) ?? { paused: false }), id, name: r.name as string, icon: (r.icon as string) ?? 'heart', color: (r.color as string) ?? '#c6f432', cadence: (r.cadence as Habit['cadence']) === 'weekdays' ? 'weekdays' : 'daily', target: (r.target_count as number) ?? 1, unit: (r.unit as string) ?? '' }); });
      patch.habits = [...m.values()];
    }
    if (tables.goals?.length) {
      const m = new Map<string, Goal>(s.goals.map((g) => [g.id, g]));
      tables.goals.forEach((r) => { const id = un(r.id as string); if (r.deleted_at) m.delete(id); else m.set(id, { id, title: r.title as string, categoryId: unN(r.category_id) ?? 'study', targetType: (r.target_type as Goal['targetType']) === 'tasks' ? 'tasks' : 'hours', targetValue: r.target_value as number, progress: m.get(id)?.progress ?? 0, due: (r.due_date as string) ?? '' }); });
      patch.goals = [...m.values()];
    }
    if (tables.day_plans?.length) {
      const dayTypes = { ...s.dayTypes }, intentions = { ...s.intentions }, locked = { ...s.locked };
      tables.day_plans.forEach((r) => { const d = r.date as string; if (r.day_type === 'normal') delete dayTypes[d]; else if (r.day_type !== 'rest' || new Date(d + 'T00:00:00').getDay() !== 0) dayTypes[d] = r.day_type as never; if (r.intention) intentions[d] = r.intention as string; locked[d] = !!r.is_locked; });
      Object.assign(patch, { dayTypes, intentions, locked });
    }
    const u = tables.users?.[0], us = tables.user_settings?.[0];
    if (u || us) {
      const st = { ...s.settings };
      if (u) Object.assign(st, { name: u.name ?? st.name, theme: u.theme ?? st.theme, weekStart: u.week_start === 7 ? 0 : 1, dayStartHour: (u.day_start_hour as number) ?? st.dayStartHour });
      if (us) Object.assign(st, { density: us.density, hour12: us.time_format === '12h', snap: us.snap_grid_min, overloadHours: (us.overload_limit_min as number) / 60, streakThreshold: us.streak_threshold_pct, freezesPerMonth: us.streak_freezes_per_month, w25: us.partial_credit1, w50: us.partial_credit2, motion: us.reduced_motion === 'on' ? 'reduced' : 'full', sound: !!us.sound_enabled, tone: us.tone, tips: !!us.tips_enabled, nudges: !!us.nudges_enabled, nudgeDelay: us.nudge_delay_min, nudgeCap: us.nudge_daily_cap, focusWork: us.focus_work_min, focusBreak: us.focus_break_min });
      patch.settings = st;
    }
    return patch;
  });
}

// ---------- snapshot of what the server already has (to send only deltas) ----------
type Snap = Record<string, Record<string, Row>>;
const loadSnap = (): Snap => { try { return JSON.parse(localStorage.getItem(SNAP_KEY) ?? '{}'); } catch { return {}; } };
const saveSnap = (s: Snap) => { try { localStorage.setItem(SNAP_KEY, JSON.stringify(s)); } catch { /* quota */ } };
const key = (r: Row) => String(r.id ?? r.user_id);
const PUSH_ORDER = ['users', 'user_settings', 'categories', 'routines', 'routine_tasks', 'goals', 'habits', 'inbox_items', 'tasks', 'subtasks', 'day_plans', 'user_quests'];
const SOFT = new Set(['categories', 'routines', 'routine_tasks', 'goals', 'habits', 'inbox_items', 'tasks', 'subtasks']);

export function diff(rows: Record<string, Row[]>, snap: Snap, now = new Date().toISOString()) {
  const changes: { table: string; row: Row }[] = [];
  for (const table of PUSH_ORDER) {
    const prev = snap[table] ?? {};
    const seen = new Set<string>();
    for (const r of rows[table] ?? []) {
      const k = key(r); seen.add(k);
      const p = prev[k];
      if (!p) { changes.push({ table, row: { ...r, field_versions_json: Object.fromEntries(Object.keys(r).map((c) => [c, now])) } }); continue; }
      const ch = Object.keys(r).filter((c) => JSON.stringify(r[c] ?? null) !== JSON.stringify(p[c] ?? null));
      if (ch.length) changes.push({ table, row: { id: r.id, user_id: r.user_id, ...(table === 'subtasks' ? { task_id: r.task_id } : {}), ...(table === 'day_plans' ? { date: r.date } : {}), ...Object.fromEntries(ch.map((c) => [c, r[c]])), field_versions_json: Object.fromEntries(ch.map((c) => [c, now])) } });
    }
    if (SOFT.has(table)) for (const [k, p] of Object.entries(prev)) if (!seen.has(k) && !p.deleted_at) changes.push({ table, row: { id: k, ...(table === 'subtasks' ? { task_id: p.task_id } : {}), deleted_at: now, field_versions_json: { deleted_at: now } } });
  }
  return changes;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const a = useStore.getState().auth;
  const r = await fetch(API + path, { ...init, headers: { 'content-type': 'application/json', 'x-device-id': useStore.getState().deviceId, ...(a ? { authorization: `Bearer ${a.token}` } : {}), ...init?.headers } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((body as { error?: string }).error ?? `HTTP ${r.status}`), { status: r.status });
  return body as T;
}

let running: Promise<void> | null = null;
/** Push local changes, then pull remote ones. Safe to call any time; coalesces concurrent calls. */
export function syncNow(): Promise<void> {
  if (running) return running;
  running = (async () => {
    const auth = useStore.getState().auth;
    if (!auth) { set({ status: 'off', pending: 0 }); return; }
    if (useStore.getState().onboarded && !useStore.getState().onboardedAt) useStore.setState({ onboardedAt: Date.now() });
    if (!useStore.getState().onboarded) { set({ status: 'idle', pending: 0 }); return; } // never upload sample data before the user chose how to start
    if (!navigator.onLine) { set({ status: 'offline' }); return; }
    set({ status: 'syncing' });
    try {
      const snap = loadSnap();
      const rows = rowsOf(useStore.getState());
      const changes = diff(rows, snap);
      if (changes.length) {
        for (let i = 0; i < changes.length; i += 1000) {
          const res = await api<{ rejected: { table: string; id: string; error: string }[] }>('/sync/push', { method: 'POST', body: JSON.stringify({ changes: changes.slice(i, i + 1000) }) });
          const bad = new Set(res.rejected.map((x) => `${x.table}:${x.id}`));
          res.rejected.forEach((x) => { if (/clock_skew/.test(x.error)) useUI.getState().toast('Check your device time: ' + x.error.replace(/^clock_skew: /, ''), { kind: 'warn', ttl: 6000 }); });
          for (const c of changes.slice(i, i + 1000)) {
            const id = String(c.row.id ?? c.row.user_id);
            if (bad.has(`${c.table}:${id}`)) continue;
            const full = (rows[c.table] ?? []).find((r) => key(r) === id);
            (snap[c.table] ??= {})[id] = full ?? { ...(snap[c.table]?.[id] ?? {}), deleted_at: 'x' };
          }
        }
        // rows that vanished are now deleted on the server: forget them
        for (const t of SOFT) for (const k of Object.keys(snap[t] ?? {})) if (!(rows[t] ?? []).some((r) => key(r) === k)) delete snap[t][k];
        saveSnap(snap);
      }
      const since = useStore.getState().lastPull;
      const pulled = await api<{ serverTime: string; tables: Record<string, Row[]> }>(`/sync/pull${since ? `?since=${encodeURIComponent(since)}` : ''}`);
      rememberQuestDefs(pulled.tables.quest_defs);
      // never overwrite a row that was edited locally while the request was in flight
      const pendingNow = new Set(diff(rowsOf(useStore.getState()), snap).map((c) => `${c.table}:${String(c.row.id ?? c.row.user_id)}`));
      const mine: Record<string, Row[]> = Object.fromEntries(Object.entries(pulled.tables).map(([t, rs]) => [t, rs.filter((r) => !pendingNow.has(`${t}:${key(r)}`))]));
      applyRows(mine);
      // what we just received is now known to the server: record it so we never echo it back
      const after = rowsOf(useStore.getState());
      for (const t of PUSH_ORDER) for (const r of mine[t] ?? []) { const row = (after[t] ?? []).find((x) => key(x) === key(r)); if (row) (snap[t] ??= {})[key(r)] = row; }
      saveSnap(snap);
      useStore.setState({ lastPull: pulled.serverTime });
      set({ status: 'idle', at: Date.now(), pending: 0, message: undefined });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) { useStore.setState({ auth: null }); set({ status: 'off', message: 'Session expired. Sign in again.' }); }
      else if (err instanceof TypeError) set({ status: 'offline', message: 'Offline. Changes are queued and will sync when you are back.' });
      else set({ status: 'error', message: err.message });
    }
  })().finally(() => { running = null; });
  return running;
}

export async function checkUsername(username: string): Promise<{ valid: boolean; available: boolean }> {
  return api('/auth/username-available?username=' + encodeURIComponent(username.trim()));
}

/** Create an account (mode 'register') or sign in (mode 'login') with a unique username + password. Guest data on this device migrates to the account. */
export async function authenticate(mode: 'register' | 'login', username: string, password: string): Promise<{ replaced: boolean }> {
  const v = await api<{ accessToken: string; user: { id: string; username: string } }>('/auth/' + mode, { method: 'POST', body: JSON.stringify({ username, password }) });
  useStore.setState({ auth: { token: v.accessToken, userId: v.user.id, username: v.user.username } });
  // New device with cloud data? Offer to use it instead of merging the local demo data into it.
  const remote = await api<{ tables: Record<string, Row[]> }>('/sync/pull');
  let replaced = false;
  const cur = useStore.getState();
  const returning = !!(remote.tables.user_settings?.[0] as Row | undefined)?.onboarding_done_at;
  const localReal = cur.onboarded && !cur.demo && cur.tasks.length > 0; // real data already on this device
  if (returning && !localReal) {
    // Existing account on a fresh device: restore it, no onboarding, no sample data.
    useStore.setState({ tasks: [], inbox: [], habits: [], goals: [], routines: [], onboarded: true, onboardedAt: Date.parse(String((remote.tables.user_settings[0] as Row).onboarding_done_at)), demo: false, quests: {} });
    applyRows(remote.tables); rememberQuestDefs(remote.tables.quest_defs);
    applyRows({ user_quests: remote.tables.user_quests ?? [] });
    saveSnap({}); useStore.setState({ lastPull: '' });
    replaced = true;
  } else if ((remote.tables.tasks?.length ?? 0) > 0 && confirm('We found your plan in the cloud. Use it on this device? (Cancel merges this device\'s data into your account instead.)')) {
    useStore.setState({ tasks: [], inbox: [], habits: [], goals: [] });
    applyRows(remote.tables);
    saveSnap({}); useStore.setState({ lastPull: '' });
    replaced = true;
    useStore.setState({ onboarded: true, demo: false });
  }
  await syncNow();
  return { replaced };
}

export function signOut() { useStore.setState({ auth: null, lastPull: '' }); saveSnap({}); set({ status: 'off', pending: 0 }); }
export async function deleteAccount() { await api('/account/delete', { method: 'POST', body: '{}' }); signOut(); }

/** Start background sync: debounce after edits, retry when back online, poll for other devices. */
export function startSync() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(() => void syncNow(), 1500); };
  const unsub = useStore.subscribe((s, p) => { if (s.auth && (s.tasks !== p.tasks || s.inbox !== p.inbox || s.habits !== p.habits || s.goals !== p.goals || s.quests !== p.quests || s.routines !== p.routines || s.settings !== p.settings || s.dayTypes !== p.dayTypes || s.intentions !== p.intentions || s.locked !== p.locked || s.categories !== p.categories)) { set({ pending: 1 }); schedule(); } });
  const online = () => void syncNow();
  addEventListener('online', online);
  const poll = setInterval(() => { if (document.visibilityState === 'visible') void syncNow(); }, 30_000);
  void syncNow();
  return () => { unsub(); removeEventListener('online', online); clearInterval(poll); clearTimeout(timer); };
}
