import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { openDb, uuidv7 } from '../src/db.ts';
import { createApp } from '../src/app.ts';
import { purge } from '../src/sync.ts';

const db = openDb(':memory:');
const server = createApp(db, { secret: 'test-secret', authAttemptsPerMin: 1000 }).listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
test.after(() => { server.closeAllConnections(); server.close(); });

async function call(path: string, opts: { method?: string; token?: string; body?: unknown; device?: string } = {}) {
  const r = await fetch(base + path, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}), ...(opts.device ? { 'x-device-id': opts.device } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { status: r.status, json: (await r.json().catch(() => null)) as any };
}
async function login(name: string) {
  const username = name.split('@')[0];
  const v = await call('/auth/register', { body: { username, password: 'correct horse' } });
  return { token: v.json.accessToken as string, id: v.json.user.id as string };
}
const iso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();
const task = (over: Record<string, unknown> = {}) => ({ id: uuidv7(), title: 'Revise DSA', date: '2026-11-10', start_time: '07:30', duration_min: 60, ...over });

test('schema matches the design: 56 tables, reference data seeded', () => {
  const n = (db.prepare("SELECT COUNT(*) c FROM sqlite_master WHERE type='table' AND name NOT LIKE '%_fts%' AND name NOT LIKE 'sqlite_%'").get() as { c: number }).c;
  assert.equal(n, 56);
  assert.ok((db.prepare('SELECT COUNT(*) c FROM tips').get() as { c: number }).c >= 50, 'at least 50 tips');
  assert.ok((db.prepare('SELECT COUNT(*) c FROM motivation_lines').get() as { c: number }).c >= 200, 'at least 200 motivation lines');
  assert.equal((db.prepare('SELECT COUNT(*) c FROM achievement_defs').get() as { c: number }).c, 42);
  assert.equal((db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }).foreign_keys, 1);
});

test('auth: unique username + password, API needs a token', async () => {
  assert.equal((await call('/health')).status, 200);
  assert.equal((await call('/me')).status, 401);
  assert.equal((await call('/auth/register', { body: { username: 'a b', password: 'longenough' } })).status, 400, 'bad username');
  assert.equal((await call('/auth/register', { body: { username: 'asha', password: 'short' } })).status, 400, 'short password');
  const r = await call('/auth/register', { body: { username: 'Asha_01', password: 'longenough' } });
  assert.equal(r.status, 201);
  assert.equal(r.json.user.username, 'asha_01');
  assert.equal(r.json.user.password_hash, undefined);
  assert.equal((await call('/auth/register', { body: { username: 'ASHA_01', password: 'another-pass' } })).status, 409, 'username unique, case-insensitive');
  assert.equal((await call('/auth/username-available?username=asha_01')).json.available, false);
  assert.equal((await call('/auth/username-available?username=fresh_one')).json.available, true);
  assert.equal((await call('/auth/login', { body: { username: 'asha_01', password: 'wrong-pass!' } })).status, 401);
  assert.equal((await call('/auth/login', { body: { username: 'nobody', password: 'longenough' } })).status, 401);
  const v = await call('/auth/login', { body: { username: 'Asha_01', password: 'longenough' } });
  assert.equal(v.status, 200);
  assert.equal((await call('/me', { token: v.json.accessToken })).json.username, 'asha_01');
  assert.equal((await call('/me', { token: v.json.accessToken + 'x' })).status, 401);
  const pulled = JSON.stringify((await call('/sync/pull', { token: v.json.accessToken })).json);
  assert.ok(!pulled.includes('password_hash') && !pulled.includes('scrypt$'), 'hash never leaves the server');
});

test('push inserts a task with subtasks; pull returns them; search finds them', async () => {
  const a = await login('push@x.dev');
  const cat = { id: uuidv7(), name: 'Study', color: '#c6f432' };
  const t = task({ category_id: cat.id, is_top3: true, priority: 'high' });
  const sub = { id: uuidv7(), task_id: t.id, title: 'BFS recap', sort_order: 0, is_done: false };
  // child listed BEFORE parent on purpose: server must order by dependency
  const r = await call('/sync/push', { token: a.token, body: { changes: [{ table: 'subtasks', row: sub }, { table: 'tasks', row: t }, { table: 'categories', row: cat }] } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.rejected, [], JSON.stringify(r.json.rejected));
  const p = await call('/sync/pull', { token: a.token });
  assert.equal(p.json.tables.tasks.length, 1);
  assert.equal(p.json.tables.tasks[0].is_top3, 1);
  assert.equal(p.json.tables.subtasks[0].title, 'BFS recap');
  assert.ok(p.json.tables.tips.length > 0, 'reference data included');
  const s = await call('/search?q=revi', { token: a.token });
  assert.equal(s.json[0].title, 'Revise DSA');
  // incremental pull: nothing new
  const again = await call(`/sync/pull?since=${encodeURIComponent(p.json.serverTime)}`, { token: a.token });
  assert.equal(again.json.tables.tasks, undefined);
});

test('per-field last-writer-wins: two devices edit different fields offline, both survive', async () => {
  const a = await login('lww@x.dev');
  const t = task();
  const t0 = iso(-60_000);
  await call('/sync/push', { token: a.token, body: { changes: [{ table: 'tasks', row: { ...t, field_versions_json: { title: t0, duration_min: t0, start_time: t0 } } }] } });
  // device 1 renames, device 2 changes duration (later), and ALSO an older start_time edit that must lose
  await call('/sync/push', { token: a.token, body: { changes: [{ table: 'tasks', row: { id: t.id, title: 'Renamed', field_versions_json: { title: iso(-30_000) } } }] } });
  const r = await call('/sync/push', { token: a.token, body: { changes: [{ table: 'tasks', row: { id: t.id, duration_min: 90, start_time: '05:00', field_versions_json: { duration_min: iso(-20_000), start_time: iso(-120_000) } } }] } });
  assert.equal(r.json.rejected.length, 0);
  const row = db.prepare('SELECT title, duration_min, start_time FROM tasks WHERE id = ?').get(t.id) as any;
  assert.deepEqual(row, { title: 'Renamed', duration_min: 90, start_time: '07:30' });
  const lost = db.prepare("SELECT field FROM conflict_log WHERE entity_id = ?").all(t.id) as { field: string }[];
  assert.ok(lost.some((c) => c.field === 'start_time'), 'losing edit is logged');
});

test('append-only tables merge by union (completions never lost, never duplicated)', async () => {
  const a = await login('union@x.dev');
  const t = task();
  const done = { id: uuidv7(), task_id: t.id, date: t.date, completed_at: iso(), actual_min: 55, on_time: true, xp: 24 };
  const body = { changes: [{ table: 'tasks', row: t }, { table: 'completions', row: done }] };
  const r1 = await call('/sync/push', { token: a.token, body });
  const r2 = await call('/sync/push', { token: a.token, body });
  assert.equal(r1.json.results.find((x: any) => x.table === 'completions').status, 'inserted');
  assert.equal(r2.json.results.find((x: any) => x.table === 'completions').status, 'ignored');
  assert.equal((db.prepare('SELECT COUNT(*) c FROM completions WHERE task_id = ?').get(t.id) as any).c, 1);
});

test('tenant isolation: cannot read, overwrite, or reference another user\'s data', async () => {
  const a = await login('alice@x.dev'), b = await login('bob@x.dev');
  const cat = { id: uuidv7(), name: 'Private', color: '#fff' };
  const t = task({ category_id: cat.id, title: 'Alice secret' });
  await call('/sync/push', { token: a.token, body: { changes: [{ table: 'categories', row: cat }, { table: 'tasks', row: t }] } });
  // B cannot overwrite A's task by id
  const hijack = await call('/sync/push', { token: b.token, body: { changes: [{ table: 'tasks', row: { id: t.id, title: 'pwned' } }] } });
  assert.equal(hijack.json.rejected.length, 1);
  assert.equal((db.prepare('SELECT title FROM tasks WHERE id = ?').get(t.id) as any).title, 'Alice secret');
  // B cannot attach their task to A's category
  const ref = await call('/sync/push', { token: b.token, body: { changes: [{ table: 'tasks', row: task({ category_id: cat.id }) }] } });
  assert.equal(ref.json.rejected.length, 1);
  // B cannot attach a subtask to A's task
  const sub = await call('/sync/push', { token: b.token, body: { changes: [{ table: 'subtasks', row: { id: uuidv7(), task_id: t.id, title: 'x' } }] } });
  assert.equal(sub.json.rejected.length, 1);
  // B's pull never contains A's rows; user_id in payload is ignored
  const spoof = await call('/sync/push', { token: b.token, body: { changes: [{ table: 'tasks', row: { ...task({ title: 'mine' }), user_id: a.id } }] } });
  assert.equal(spoof.json.rejected.length, 0);
  const pb = await call('/sync/pull', { token: b.token });
  assert.deepEqual(pb.json.tables.tasks.map((x: any) => x.title), ['mine']);
  assert.equal(pb.json.tables.tasks[0].user_id, b.id);
  // server-managed and reference tables are read-only
  const bad = await call('/sync/push', { token: b.token, body: { changes: [{ table: 'tips', row: { id: uuidv7(), text: 'x', context: 'big' } }, { table: 'login_tokens', row: { id: uuidv7() } }, { table: 'nope', row: { id: 'x' } }] } });
  assert.equal(bad.json.rejected.length, 3);
  assert.equal((await call('/export', { token: b.token })).json.tables.tasks.length, 1);
});

test('database constraints from the design are enforced (bad enum, bad time)', async () => {
  const a = await login('check@x.dev');
  const r = await call('/sync/push', { token: a.token, body: { changes: [{ table: 'tasks', row: task({ status: 'exploded' }) }, { table: 'tasks', row: task({ start_time: '7.30' }) }, { table: 'tasks', row: task({ duration_min: 0 }) }, { table: 'tasks', row: task() }] } });
  assert.equal(r.json.rejected.length, 3);
  assert.equal(r.json.results.filter((x: any) => x.status === 'inserted').length, 1, 'good rows in the same batch still land');
});

test('clock tampering is rejected (no future timestamps)', async () => {
  const a = await login('clock@x.dev');
  const r = await call('/sync/push', { token: a.token, body: { changes: [{ table: 'tasks', row: { ...task(), field_versions_json: { title: iso(3 * 3600_000) } } }] } });
  assert.match(r.json.rejected[0].error, /clock_skew/);
});

test('soft delete syncs; Trash purges after 30 days; account deletion removes everything', async () => {
  const a = await login('trash@x.dev');
  const t = task();
  await call('/sync/push', { token: a.token, body: { changes: [{ table: 'tasks', row: { ...t, field_versions_json: { title: iso(-5000) } } }] } });
  await call('/sync/push', { token: a.token, body: { changes: [{ table: 'tasks', row: { id: t.id, deleted_at: iso(), field_versions_json: { deleted_at: iso(-1000) } } }] } });
  assert.ok((db.prepare('SELECT deleted_at FROM tasks WHERE id = ?').get(t.id) as any).deleted_at);
  assert.equal(purge(db), 0, 'fresh trash is kept');
  db.prepare('UPDATE tasks SET deleted_at = ? WHERE id = ?').run(iso(-31 * 86400_000), t.id);
  purge(db);
  assert.equal(db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(t.id), undefined);
  // account deletion
  const sub = { id: uuidv7(), task_id: task().id, title: 's' };
  const t2 = task(); sub.task_id = t2.id;
  await call('/sync/push', { token: a.token, body: { changes: [{ table: 'tasks', row: t2 }, { table: 'subtasks', row: sub }] } });
  assert.equal((await call('/account/delete', { token: a.token, body: {} })).status, 200);
  db.prepare('UPDATE users SET deletion_requested_at = ? WHERE id = ?').run(iso(-31 * 86400_000), a.id);
  purge(db);
  assert.equal(db.prepare('SELECT 1 FROM users WHERE id = ?').get(a.id), undefined);
  assert.equal(db.prepare('SELECT 1 FROM subtasks WHERE id = ?').get(sub.id), undefined);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [], 'no orphans left');
});

test('device registration and reference endpoints', async () => {
  const a = await login('dev@x.dev');
  const dev = uuidv7();
  await call('/sync/push', { token: a.token, device: dev, body: { changes: [{ table: 'inbox_items', row: { id: uuidv7(), text: 'call home' } }] } });
  const d = db.prepare('SELECT user_id, last_sync_at FROM devices WHERE id = ?').get(dev) as any;
  assert.equal(d.user_id, a.id); assert.ok(d.last_sync_at);
  assert.ok((await call('/tips?context=big')).json.length > 0);
  assert.ok((await call('/holidays?country=IN')).json.length > 0);
});

test('quest results sync (one per user per day, per the design) and reference quest_defs are pulled', async () => {
  const a = await login('quest@x.dev');
  const defs = (await call('/sync/pull', { token: a.token })).json.tables.quest_defs as { id: string; code: string; xp: number }[];
  assert.ok(defs.length >= 5, 'quest definitions come from the server');
  const def = defs.find((d) => d.code === 'tiny_start')!;
  const row = { id: `quest-${a.id}-2026-11-10`, date: '2026-11-10', quest_id: def.id, completed_at: iso(), xp_awarded: def.xp };
  const r = await call('/sync/push', { token: a.token, body: { changes: [{ table: 'user_quests', row }] } });
  assert.deepEqual(r.json.rejected, []);
  // second quest on the same day is refused by the unique (user, date) rule
  const dup = await call('/sync/push', { token: a.token, body: { changes: [{ table: 'user_quests', row: { ...row, id: uuidv7(), quest_id: defs.find((d) => d.code === 'two_sprints')!.id } }] } });
  assert.equal(dup.json.rejected.length, 1);
  assert.equal((await call('/sync/pull', { token: a.token })).json.tables.user_quests.length, 1);
});
