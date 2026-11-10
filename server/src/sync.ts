import { type DB, META, TABLES, type TableMeta, nowISO, uuidv7 } from './db.ts';

type Row = Record<string, unknown>;
export interface Change { table: string; row: Row }
export interface RowResult { table: string; id: string; status: 'inserted' | 'merged' | 'ignored' | 'rejected'; error?: string; conflicts?: number }

/** Tables the server writes itself; clients can never push them. */
const SERVER_ONLY = new Set(['login_tokens', 'auth_identities', 'conflict_log', 'devices', 'notification_log']);
const NO_PULL = new Set(['login_tokens', 'auth_identities']);
const FIXED = new Set(['id', 'user_id', 'created_at', 'updated_at', 'field_versions_json']);
const CLOCK_SKEW_MS = 5 * 60_000;

// ---- ownership graph (derived from the schema's foreign keys) ----
const owned = new Map<string, boolean>();
function isOwned(name: string, seen = new Set<string>()): boolean {
  if (owned.has(name)) return owned.get(name)!;
  const t = META.get(name)!;
  if (name === 'users' || t.userOwned) { owned.set(name, true); return true; }
  if (seen.has(name)) return false;
  seen.add(name);
  const r = t.fks.some((f) => isOwned(f.ref, seen));
  owned.set(name, r);
  return r;
}
/** FK columns that point (directly or transitively) at a user-owned table. */
const ownedFks = (t: TableMeta) => t.fks.filter((f) => isOwned(f.ref));

function ownsId(db: DB, table: string, id: unknown, userId: string): boolean {
  if (id == null) return true;
  const t = META.get(table)!;
  if (table === 'users') return id === userId;
  const pk = t.pk.length === 1 ? t.pk[0] : null;
  if (!pk) return false;
  const row = db.prepare(`SELECT * FROM ${table} WHERE ${pk} = ?`).get(id) as Row | undefined;
  if (!row) return true; // dangling parent is a FK error handled by SQLite itself
  if (t.userOwned) return row.user_id === userId || (table === 'user_settings' && row.user_id === userId);
  return ownedFks(t).every((f) => ownsId(db, f.ref, row[f.col], userId)) && ownedFks(t).some((f) => row[f.col] != null);
}

const TS = (t: TableMeta) => (t.cols.includes('updated_at') ? 'updated_at' : 'created_at');
const JSON_COLS = (t: TableMeta) => t.cols.filter((c) => c.endsWith('_json'));
const coerce = (t: TableMeta, col: string, v: unknown) => {
  if (v === undefined) return undefined;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  void t; void col;
  return v;
};
const parseVersions = (s: unknown): Record<string, string> => { try { return typeof s === 'string' ? JSON.parse(s) : (s as Record<string, string>) ?? {}; } catch { return {}; } };

// Users sync only their profile fields; email is changed through auth, never through sync.
const USER_FIELDS = new Set(['name', 'timezone', 'week_start', 'day_start_hour', 'theme']);

export function applyChange(db: DB, userId: string, deviceId: string | undefined, ch: Change): RowResult {
  const t = META.get(ch.table);
  const id = String(ch.row?.id ?? t?.pk.map((k) => ch.row?.[k]).join('|') ?? '?');
  const rej = (error: string): RowResult => ({ table: ch.table, id, status: 'rejected', error });
  if (!t) return rej('unknown table');
  if (SERVER_ONLY.has(t.name)) return rej('server-managed table');
  if (!isOwned(t.name)) return rej('read-only reference table');
  const row = { ...ch.row };
  const now = nowISO();

  if (t.name === 'users') { if (row.id !== userId) return rej('not your user'); }
  else if (t.userOwned) row.user_id = userId;
  if (t.name === 'user_settings') row.user_id = userId;
  for (const f of ownedFks(t)) if (!ownsId(db, f.ref, row[f.col], userId)) return rej(`forbidden reference ${f.col}`);
  if (!t.userOwned && t.name !== 'users' && !ownedFks(t).some((f) => row[f.col] != null)) return rej('missing owner reference');
  for (const k of t.pk) if (row[k] == null) return rej(`missing ${k}`);

  const versions = parseVersions(row.field_versions_json);
  for (const [k, v] of Object.entries(versions)) if (Date.parse(v) > Date.now() + CLOCK_SKEW_MS) return rej(`clock_skew: ${k} is in the future, check your device time`);
  const claimed = typeof row.updated_at === 'string' ? row.updated_at : now;
  if (Date.parse(claimed) > Date.now() + CLOCK_SKEW_MS) return rej('clock_skew: check your device time');

  const where = t.pk.map((k) => `${k} = ?`).join(' AND ');
  const pkVals = t.pk.map((k) => row[k]);
  const sp = `sp_${Math.random().toString(36).slice(2)}`;
  db.exec(`SAVEPOINT ${sp}`);
  try {
    const existing = db.prepare(`SELECT * FROM ${t.name} WHERE ${where}`).get(...pkVals) as Row | undefined;
    // Ownership of an EXISTING row must match too (prevents id-guessing takeovers).
    if (existing && t.userOwned && t.name !== 'users' && existing.user_id !== userId) { db.exec(`ROLLBACK TO ${sp}; RELEASE ${sp}`); return rej('forbidden'); }

    if (!t.editable) { // append-only: union merge, first write wins, server assigns created_at for cursoring
      const cols = t.cols.filter((c) => row[c] !== undefined && c !== 'created_at');
      const info = db.prepare(`INSERT OR IGNORE INTO ${t.name} (${[...cols, 'created_at'].join(',')}) VALUES (${[...cols, 'created_at'].map(() => '?').join(',')})`).run(...cols.map((c) => coerce(t, c, row[c])), now);
      db.exec(`RELEASE ${sp}`);
      return { table: t.name, id, status: info.changes ? 'inserted' : 'ignored' };
    }

    const allowed = (c: string) => !FIXED.has(c) && !t.pk.includes(c) && (t.name !== 'users' || USER_FIELDS.has(c));
    const fields = t.cols.filter((c) => allowed(c) && row[c] !== undefined);
    const fv = (c: string) => versions[c] ?? claimed;

    if (!existing) {
      const nv: Record<string, string> = {};
      fields.forEach((c) => { nv[c] = fv(c); });
      const cols = [...t.pk, ...(t.userOwned && !t.pk.includes('user_id') ? ['user_id'] : []), ...fields, 'updated_at', 'field_versions_json'];
      const vals = [...t.pk.map((k) => row[k]), ...(t.userOwned && !t.pk.includes('user_id') ? [userId] : []), ...fields.map((c) => coerce(t, c, row[c])), now, JSON.stringify(nv)];
      if (typeof row.created_at === 'string' && t.cols.includes('created_at')) { cols.push('created_at'); vals.push(row.created_at); }
      db.prepare(`INSERT INTO ${t.name} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...vals);
      db.exec(`RELEASE ${sp}`);
      return { table: t.name, id, status: 'inserted' };
    }

    // Per-field last-writer-wins.
    const cur = parseVersions(existing.field_versions_json);
    const next = { ...cur };
    const sets: string[] = [], vals: unknown[] = [];
    let conflicts = 0;
    for (const c of fields) {
      const incoming = coerce(t, c, row[c]);
      const theirs = fv(c);
      const mine = cur[c] ?? ''; // never-versioned field: any real write wins
      const same = JSON.stringify(incoming ?? null) === JSON.stringify(existing[c] ?? null);
      if (theirs > mine) {
        if (!same) {
          if (cur[c]) { logConflict(db, userId, t.name, id, c, incoming, existing[c], deviceId, undefined); conflicts++; }
          sets.push(`${c} = ?`); vals.push(incoming);
        }
        next[c] = theirs;
      } else if (!same) { logConflict(db, userId, t.name, id, c, existing[c], incoming, undefined, deviceId); conflicts++; }
    }
    if (sets.length) {
      db.prepare(`UPDATE ${t.name} SET ${sets.join(', ')}, updated_at = ?, field_versions_json = ? WHERE ${where}`).run(...vals, now, JSON.stringify(next), ...pkVals);
    }
    db.exec(`RELEASE ${sp}`);
    return { table: t.name, id, status: sets.length ? 'merged' : 'ignored', conflicts };
  } catch (e) {
    db.exec(`ROLLBACK TO ${sp}; RELEASE ${sp}`);
    return rej((e as Error).message);
  }
}

function logConflict(db: DB, userId: string, table: string, id: string, field: string, kept: unknown, discarded: unknown, keptDev?: string, discDev?: string) {
  const fk = (d?: string) => (d ? (db.prepare('SELECT id FROM devices WHERE id = ?').get(d) ? d : null) : null);
  db.prepare('INSERT INTO conflict_log (id, user_id, entity_table, entity_id, field, kept_value_json, discarded_value_json, kept_device_id, discarded_device_id) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(uuidv7(), userId, table, id, field, JSON.stringify(kept ?? null), JSON.stringify(discarded ?? null), fk(keptDev), fk(discDev));
}

export function push(db: DB, userId: string, deviceId: string | undefined, changes: Change[]) {
  const results: RowResult[] = [];
  // Parents before children so a fresh offline batch never trips foreign keys.
  const order = new Map(TABLES.map((t, i) => [t.name, depth(t.name, i)]));
  const sorted = [...changes].sort((a, b) => (order.get(a.table) ?? 99) - (order.get(b.table) ?? 99));
  db.transaction(() => { for (const c of sorted) results.push(applyChange(db, userId, deviceId, c)); })();
  if (deviceId) db.prepare('UPDATE devices SET last_sync_at = ? WHERE id = ? AND user_id = ?').run(nowISO(), deviceId, userId);
  return { serverTime: nowISO(), results, rejected: results.filter((r) => r.status === 'rejected') };
}
function depth(name: string, _i: number, seen = new Set<string>()): number {
  if (seen.has(name)) return 0;
  seen.add(name);
  const t = META.get(name);
  return t ? 1 + Math.max(0, ...t.fks.filter((f) => f.ref !== name).map((f) => depth(f.ref, _i, seen))) : 0;
}

/** SQL fragment + params restricting `alias` rows of `table` to the user's data. */
function scope(table: string, userId: string): { from: string; where: string; params: unknown[] } | null {
  const t = META.get(table)!;
  if (table === 'users') return { from: 'users t', where: 't.id = ?', params: [userId] };
  if (t.userOwned) return { from: `${table} t`, where: 't.user_id = ?', params: [userId] };
  const f = ownedFks(t)[0];
  if (!f) return null;
  const parent = scope(f.ref, userId);
  if (!parent) return null;
  const pk = META.get(f.ref)!.pk[0];
  return { from: `${table} t JOIN (SELECT ${pk} FROM ${parent.from} WHERE ${parent.where}) p ON p.${pk} = t.${f.col}`, where: '1=1', params: parent.params };
}

export function pull(db: DB, userId: string, since?: string, limit = 5000) {
  const serverTime = nowISO();
  const tables: Record<string, Row[]> = {};
  let more = false;
  for (const t of TABLES) {
    if (NO_PULL.has(t.name)) continue;
    const col = TS(t);
    if (!isOwned(t.name)) {
      const rows = db.prepare(`SELECT * FROM ${t.name} ${since ? `WHERE ${col} >= ?` : ''} LIMIT ?`).all(...(since ? [since] : []), limit) as Row[];
      if (rows.length) tables[t.name] = rows;
      continue;
    }
    const s = scope(t.name, userId);
    if (!s) continue;
    const rows = db.prepare(`SELECT t.* FROM ${s.from} WHERE ${s.where}${since ? ` AND t.${col} >= ?` : ''} ORDER BY t.${col} LIMIT ?`).all(...s.params, ...(since ? [since] : []), limit + 1) as Row[];
    if (rows.length > limit) { more = true; rows.pop(); }
    if (rows.length) tables[t.name] = t.name === 'users' ? rows.map(({ password_hash: _h, ...r }) => r) : rows;
  }
  return { serverTime, more, tables };
}

export function exportAll(db: DB, userId: string) {
  const out: Record<string, Row[]> = {};
  for (const t of TABLES) {
    if (NO_PULL.has(t.name) || !isOwned(t.name)) continue;
    const s = scope(t.name, userId);
    if (!s) continue;
    out[t.name] = db.prepare(`SELECT t.* FROM ${s.from} WHERE ${s.where}`).all(...s.params) as Row[];
  }
  return { app: 'ApexDay', exportedAt: nowISO(), schema: 'db_design.md', tables: out };
}

/** Trash keeps 30 days, then purge. Accounts requested for deletion are removed after 30 days. */
export function purge(db: DB, now = Date.now()) {
  const cutoff = new Date(now - 30 * 86400_000).toISOString();
  let purged = 0;
  db.pragma('foreign_keys = OFF'); // PRAGMA is a no-op inside a transaction
  try { db.transaction(() => {
    const doomed = db.prepare('SELECT id FROM users WHERE deletion_requested_at IS NOT NULL AND deletion_requested_at < ?').all(cutoff) as { id: string }[];
    db.pragma('foreign_keys = OFF');
    for (const u of doomed) {
      for (const t of [...TABLES].reverse()) {
        if (NO_PULL.has(t.name) && t.name !== 'login_tokens' && t.name !== 'auth_identities') continue;
        if (!isOwned(t.name) || t.name === 'users') continue;
        const s = scope(t.name, u.id);
        if (!s) continue;
        const pk = t.pk.length === 1 ? t.pk[0] : 'rowid';
        purged += db.prepare(`DELETE FROM ${t.name} WHERE ${pk} IN (SELECT t.${pk} FROM ${s.from} WHERE ${s.where})`).run(...s.params).changes;
      }
      db.prepare('DELETE FROM login_tokens WHERE user_id = ?').run(u.id);
      db.prepare('DELETE FROM auth_identities WHERE user_id = ?').run(u.id);
      db.prepare('DELETE FROM devices WHERE user_id = ?').run(u.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(u.id);
      purged++;
    }
    for (const t of TABLES.filter((x) => x.softDelete && x.userOwned)) purged += db.prepare(`DELETE FROM ${t.name} WHERE deleted_at IS NOT NULL AND deleted_at < ?`).run(cutoff).changes;
    for (const t of TABLES.filter((x) => x.softDelete && !x.userOwned && isOwned(x.name))) purged += db.prepare(`DELETE FROM ${t.name} WHERE deleted_at IS NOT NULL AND deleted_at < ?`).run(cutoff).changes;
    // children of purged parents: remove orphans
    for (const t of TABLES) {
      if (t.userOwned || t.name === 'users' || !isOwned(t.name)) continue;
      for (const f of ownedFks(t)) { const pk = META.get(f.ref)!.pk[0]; if (pk) purged += db.prepare(`DELETE FROM ${t.name} WHERE ${f.col} IS NOT NULL AND ${f.col} NOT IN (SELECT ${pk} FROM ${f.ref})`).run().changes; }
    }
  })(); } finally { db.pragma('foreign_keys = ON'); }
  return purged;
}

void JSON_COLS;
