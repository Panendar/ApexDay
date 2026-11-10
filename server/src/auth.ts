import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { NextFunction, Request, Response } from 'express';
import { type DB, nowISO, uuidv7 } from './db.ts';

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export function loadSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const f = 'data/jwt.secret';
  mkdirSync('data', { recursive: true });
  if (!existsSync(f)) writeFileSync(f, randomBytes(48).toString('hex'));
  return readFileSync(f, 'utf8');
}

/** Minimal HS256 JWT. */
export function signJwt(payload: Record<string, unknown>, secret: string, ttlSec = 30 * 86400) {
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttlSec };
  const data = `${b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64(JSON.stringify(body))}`;
  return `${data}.${createHmac('sha256', secret).update(data).digest('base64url')}`;
}
export function verifyJwt(token: string, secret: string): { sub: string } | null {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  const exp = createHmac('sha256', secret).update(`${h}.${p}`).digest();
  const got = Buffer.from(s, 'base64url');
  if (got.length !== exp.length || !timingSafeEqual(got, exp)) return null;
  const body = JSON.parse(Buffer.from(p, 'base64url').toString());
  return body.exp > Date.now() / 1000 ? body : null;
}

declare module 'express-serve-static-core' { interface Request { userId?: string; deviceId?: string } }

export function requireAuth(secret: string, db: DB) {
  return (req: Request, res: Response, next: NextFunction) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    const claims = m && verifyJwt(m[1], secret);
    if (!claims) return void res.status(401).json({ error: 'unauthorized' });
    const u = db.prepare('SELECT id FROM users WHERE id = ?').get(claims.sub);
    if (!u) return void res.status(401).json({ error: 'unknown user' });
    req.userId = claims.sub;
    const dev = req.header('x-device-id');
    if (dev && /^[0-9a-f-]{36}$/i.test(dev)) {
      req.deviceId = dev;
      const t = nowISO();
      db.prepare(`INSERT INTO devices (id, user_id, name, last_seen_at, created_at, updated_at) VALUES (?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at WHERE user_id = excluded.user_id`).run(dev, claims.sub, req.header('user-agent')?.slice(0, 80) ?? '', t, t, t);
    }
    next();
  };
}

/** Per-key sliding window limiter (login and register). */
export function limiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string) => {
    const now = Date.now();
    const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (list.length >= max) return false;
    list.push(now); hits.set(key, list);
    return true;
  };
}

// ---- username + password ----
export const USERNAME_RE = /^[a-z0-9_.-]{3,24}$/;
export function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64url')}$${scryptSync(pw, salt, 64).toString('base64url')}`;
}
export function checkPassword(pw: string, stored: string | null) {
  const [kind, salt, hash] = (stored ?? '').split('$');
  // Same work for unknown users, so response time does not reveal which usernames exist.
  const want = Buffer.from(hash ?? '', 'base64url');
  const got = scryptSync(pw, Buffer.from(salt ?? 'x', 'base64url'), 64);
  return kind === 'scrypt' && want.length === got.length && timingSafeEqual(want, got);
}
/** Returns the new user id, or null when the username is taken. */
export function registerUser(db: DB, username: string, password: string) {
  if (db.prepare('SELECT 1 FROM users WHERE lower(username) = ?').get(username)) return null;
  const id = uuidv7();
  db.transaction(() => {
    db.prepare('INSERT INTO users (id, name, username, password_hash) VALUES (?,?,?,?)').run(id, username, username, hashPassword(password));
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(id);
  })();
  return id;
}
export function loginUser(db: DB, username: string, password: string) {
  const row = db.prepare('SELECT id, password_hash FROM users WHERE lower(username) = ?').get(username) as { id: string; password_hash: string | null } | undefined;
  return checkPassword(password, row?.password_hash ?? null) && row ? row.id : null;
}

export function createMagicLink(db: DB, email: string) {
  const e = email.trim().toLowerCase();
  let user = db.prepare('SELECT id FROM users WHERE email = ?').get(e) as { id: string } | undefined;
  if (!user) {
    const id = uuidv7();
    db.prepare('INSERT INTO users (id, name, email) VALUES (?,?,?)').run(id, e.split('@')[0], e);
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(id);
    db.prepare('INSERT INTO auth_identities (id, user_id, provider, provider_subject) VALUES (?,?,?,?)').run(uuidv7(), id, 'email', e);
    user = { id };
  }
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO login_tokens (id, user_id, token_hash, expires_at) VALUES (?,?,?,?)').run(uuidv7(), user.id, sha256(token), new Date(Date.now() + 15 * 60_000).toISOString());
  return token;
}

export function consumeMagicLink(db: DB, token: string) {
  const row = db.prepare('SELECT id, user_id, expires_at, used_at FROM login_tokens WHERE token_hash = ?').get(sha256(token)) as { id: string; user_id: string; expires_at: string; used_at: string | null } | undefined;
  if (!row || row.used_at || row.expires_at < nowISO()) return null;
  db.prepare('UPDATE login_tokens SET used_at = ? WHERE id = ?').run(nowISO(), row.id);
  return row.user_id;
}
