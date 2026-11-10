import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { type DB, nowISO, uuidv7 } from './db.ts';
import { limiter, loadSecret, loginUser, registerUser, requireAuth, signJwt, USERNAME_RE } from './auth.ts';
import { exportAll, pull, purge, push, type Change } from './sync.ts';

export function createApp(db: DB, opts: { secret?: string; authAttemptsPerMin?: number } = {}) {
  const secret = opts.secret ?? loadSecret();
  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
  app.use(express.json({ limit: '4mb' }));
  const auth = requireAuth(secret, db);
  const authLimit = limiter(opts.authAttemptsPerMin ?? 10, 60_000);

  app.get('/api/health', (_req, res) => res.json({ ok: true, time: nowISO(), sqlite: (db.prepare('select sqlite_version() v').get() as { v: string }).v }));

  // ---- auth: unique username + password ----
  const USER_COLS = 'id, name, username, email, timezone, week_start, day_start_hour, theme';
  const session = (userId: string) => ({ accessToken: signJwt({ sub: userId }, secret), user: db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).get(userId) });
  const cred = (req: express.Request) => ({ username: String(req.body?.username ?? '').trim().toLowerCase(), password: String(req.body?.password ?? '') });
  app.get('/api/auth/username-available', (req, res) => {
    const u = String(req.query.username ?? '').trim().toLowerCase();
    res.json({ valid: USERNAME_RE.test(u), available: USERNAME_RE.test(u) && !db.prepare('SELECT 1 FROM users WHERE lower(username) = ?').get(u) });
  });
  app.post('/api/auth/register', (req, res) => {
    const { username, password } = cred(req);
    if (!USERNAME_RE.test(username)) return void res.status(400).json({ error: 'Username must be 3-24 characters: letters, numbers, dot, dash or underscore.' });
    if (password.length < 8 || password.length > 200) return void res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (!authLimit(`reg|${req.ip}`)) return void res.status(429).json({ error: 'Too many attempts, try again in a minute.' });
    const id = registerUser(db, username, password);
    if (!id) return void res.status(409).json({ error: 'That username is taken. Pick another.' });
    res.status(201).json(session(id));
  });
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = cred(req);
    if (!authLimit(`login|${req.ip}|${username}`)) return void res.status(429).json({ error: 'Too many attempts, try again in a minute.' });
    const id = loginUser(db, username, password);
    if (!id) return void res.status(401).json({ error: 'Wrong username or password.' });
    res.json(session(id));
  });

  // ---- account ----
  app.get('/api/me', auth, (req, res) => res.json(db.prepare('SELECT id, name, username, email, timezone, week_start, day_start_hour, theme, deletion_requested_at FROM users WHERE id = ?').get(req.userId)));
  app.post('/api/account/delete', auth, (req, res) => {
    db.prepare('UPDATE users SET deletion_requested_at = ? WHERE id = ?').run(nowISO(), req.userId);
    res.json({ ok: true, message: 'All server data will be removed within 30 days. Cancel by calling /api/account/cancel-delete.' });
  });
  app.post('/api/account/cancel-delete', auth, (req, res) => { db.prepare('UPDATE users SET deletion_requested_at = NULL WHERE id = ?').run(req.userId); res.json({ ok: true }); });
  app.get('/api/export', auth, (req, res) => { res.setHeader('Content-Disposition', 'attachment; filename="apexday-export.json"'); res.json(exportAll(db, req.userId!)); });

  // ---- sync ----
  app.post('/api/sync/push', auth, (req, res) => {
    const changes = req.body?.changes as Change[] | undefined;
    if (!Array.isArray(changes) || changes.length > 5000) return void res.status(400).json({ error: 'changes must be an array of at most 5000 rows' });
    res.json(push(db, req.userId!, req.deviceId, changes));
  });
  app.get('/api/sync/pull', auth, (req, res) => {
    const since = typeof req.query.since === 'string' && req.query.since ? req.query.since : undefined;
    res.json(pull(db, req.userId!, since));
  });

  // ---- search runs on the server only for synced accounts; guests search on-device ----
  app.get('/api/search', auth, (req, res) => {
    const q = String(req.query.q ?? '').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
    if (!q) return void res.json([]);
    const match = q.split(/\s+/).map((w) => `${w}*`).join(' ');
    res.json(db.prepare(`SELECT t.id, t.title, t.date, t.start_time, t.status FROM tasks_fts f JOIN tasks t ON t.rowid = f.rowid
      WHERE tasks_fts MATCH ? AND t.user_id = ? AND t.deleted_at IS NULL ORDER BY rank LIMIT 25`).all(match, req.userId));
  });

  // ---- reference content ----
  app.get('/api/tips', (req, res) => {
    const ctx = typeof req.query.context === 'string' ? req.query.context : null;
    res.json(db.prepare(`SELECT id, text, context, tone FROM tips WHERE is_active = 1 ${ctx ? 'AND context = ?' : ''} ORDER BY random() LIMIT 20`).all(...(ctx ? [ctx] : [])));
  });
  app.get('/api/holidays', (req, res) => {
    const country = String(req.query.country ?? 'IN').toUpperCase();
    res.json(db.prepare('SELECT d.date, d.title, c.name AS calendar FROM holiday_dates d JOIN holiday_calendars c ON c.id = d.holiday_calendar_id WHERE c.country = ? ORDER BY d.date').all(country));
  });

  // ---- operations ----
  app.post('/api/admin/purge', (req, res) => { // local maintenance only; protect with ADMIN_TOKEN in production
    if (process.env.ADMIN_TOKEN && req.header('x-admin-token') !== process.env.ADMIN_TOKEN) return void res.status(403).json({ error: 'forbidden' });
    res.json({ purged: purge(db) });
  });
  void uuidv7;

  // Production: serve the built web app from the same process (npm start).
  const dist = fileURLToPath(new URL('../../web/dist', import.meta.url));
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(`${dist}/index.html`));
  }

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => { console.error(err); res.status(500).json({ error: 'internal error' }); });
  return app;
}
