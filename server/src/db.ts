import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import tables from './tables.json' with { type: 'json' };
import achievements from './achievements.json' with { type: 'json' };

export type DB = Database.Database;
export interface TableMeta { name: string; cols: string[]; pk: string[]; userOwned: boolean; editable: boolean; softDelete: boolean; fks: { col: string; ref: string }[]; appendOnly: boolean }
export const TABLES = tables as TableMeta[];
export const META = new Map(TABLES.map((t) => [t.name, t]));

/** UUID v7 (time-ordered) as TEXT. The client generates these too, so offline creation works. */
export function uuidv7(): string {
  const b = randomBytes(16);
  const ms = BigInt(Date.now());
  for (let i = 0; i < 6; i++) b[i] = Number((ms >> BigInt(40 - 8 * i)) & 0xffn);
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export const nowISO = () => new Date().toISOString();

export function openDb(file = process.env.APEXDAY_DB ?? 'data/apexday.db'): DB {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  migrateAuth(db);
  seedReference(db);
  return db;
}

/** Username + password sign-in lives on `users` (no extra table). Credentials never travel through sync (see pull()). */
function migrateAuth(db: DB) {
  const cols = (db.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes('username')) db.exec('ALTER TABLE users ADD COLUMN username TEXT');
  if (!cols.includes('password_hash')) db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON users (lower(username)) WHERE username IS NOT NULL');
}

// ---- reference data (global, read-only for users) ----
const TIP_STEMS: Record<string, string[]> = {
  big: ['Shrink it until it feels silly, then do that.', 'Decide the very first action in one sentence.', 'Eat the frog: hardest part first.', 'Start with the easiest 5 minutes.', 'Break it into 3 steps and only look at step one.', 'Write the ugliest first draft; edit later.', 'Set a 10-minute timer and stop when it rings.', 'Do the part you understand best first.'],
  boring: ['Pair it with music or tea you enjoy.', 'Race the timer and beat your last round.', 'Change the place: a new spot makes it feel new.', 'Make it a game: count what you finish in 10 minutes.', 'Promise yourself a small treat after one round.', 'Do it standing up for the first five minutes.', 'Explain it out loud as if teaching a friend.', 'Switch the order: do the middle part first.'],
  tired: ['Stand up, drink water, breathe, then one round.', 'Low energy? Pick the lightest task and bank a win.', 'Two minutes counts. Just two.', 'Wash your face or step outside for a minute first.', 'Do the easiest 5 minutes, then decide.', 'Swap with a lighter task now; the hard one can wait.', 'Stretch for 60 seconds before you start.', 'A short walk, then start.'],
  slump: ['Afternoon dip: a 10-minute walk beats another coffee.', 'Tidy only your desk, then open the task.', 'Switch to a hands-on task for a while.', 'Natural light for two minutes, then begin.', 'Try a 5 + 2 sprint; the dip passes.', 'Eat something light and start small.', 'Put on instrumental music and start the timer.', 'Do a quick win first to rebuild momentum.'],
  missed_start: ['Two minutes is a real start. Momentum does the rest.', "You don't have to finish. You only have to begin.", 'Late is fine. Start with five minutes now.', 'Partial progress counts: 20% is a good start.', 'Reschedule nothing yet. Just open the file.', 'The plan is a guide, not a judge. Begin where you are.', 'Pick a smaller version of the task and do that.', 'Start the timer before you feel ready.'],
  general: ["Just open the file; that's the whole task.", 'Put your phone in another room for one round.', 'Set a 5-minute timer. When it rings, you may stop.', 'Tell someone what you are about to do.', 'Close every tab you do not need.', 'Write the next action on paper and look only at it.', 'Make the first step so small it cannot fail.', 'Start before you check anything else.', 'Lay out what you need first, then begin.', 'Pick one task and give it your full attention.', 'Name the finish line before you start.', 'Begin with a timer, not with a feeling.'],
};
const TONES = ['calm', 'energetic', 'tough'] as const;
const LINES: Record<string, Record<string, string[]>> = {
  morning: { calm: ['A calm start. One task at a time.', 'Your plan is ready when you are.', 'Breathe in. Pick the first task.', 'Gentle morning. Begin small.'], energetic: ['Rise and climb! Your first win is minutes away.', "Let's go. The day is yours.", 'New day, new peak.', 'Fresh start. Make it count!'], tough: ["The day won't plan itself. Start the first one.", 'No negotiating. Open the first task.', 'Up. First task. Now.', 'Discipline starts with the first five minutes.'] },
  behind: { calm: ['Running behind is normal. One Shift fixes it.', 'Breathe. Reset the day and carry on.', 'It is okay. Compress and continue.', 'Plans change. You can too.'], energetic: ['Plot twist! Shift the plan and keep moving.', 'Plenty of day left. Compress and go!', 'Reset, refocus, rocket on.', 'Still in the game. Shift and surge!'], tough: ['Behind? Cut the fluff and do the next task.', 'Stop apologising to the clock. Start.', 'Reset the plan. Execute it.', 'Fewer excuses, next task.'] },
  comeback: { calm: ['Welcome back. A clean day is waiting.', 'No guilt here. Just a fresh start.', 'Glad you are here. One small step.', 'Pick up gently where you left off.'], energetic: ['You are back! Make today count.', 'Comeback mode: ON.', 'Good to see you. Let us climb!', 'New streak starts now.'], tough: ['You returned. Now show up today.', 'Yesterday is gone. Today is a task list.', 'Back at it. First task.', 'Start the comeback with one win.'] },
  milestone: { calm: ['A steady milestone. Well earned.', 'Look how far you have come.', 'Quiet progress adds up.', 'Another stage reached.'], energetic: ['Milestone unlocked! Look at that climb!', 'Streak power! Keep going!', 'You levelled up your habit!', 'Summit in sight!'], tough: ['Milestone hit. Now raise the bar.', 'Good. Do it again tomorrow.', 'Earned. Do not coast.', 'Stage cleared. Next.'] },
  focus: { calm: ['One thing. Slow and steady.', 'Breathe in, work, breathe out.', 'Single focus. Soft shoulders.', 'Let the timer carry you.'], energetic: ['Lock in. You got this!', 'Full focus. Make it count.', 'In the zone. Go go go!', 'Ride the sprint!'], tough: ['No phone. No excuses.', 'Sit. Work. Finish the round.', 'Eyes on the task.', 'Nothing else exists for 25 minutes.'] },
  start: { calm: ['Begin gently. Two minutes is enough.', 'Open the task. That is the start.', 'A small start is still a start.', 'No pressure. Just begin.'], energetic: ['Tiny Start time! 5 minutes, go!', 'Hit start and the rest follows!', 'Just 2 minutes. You will keep going!', 'Kick it off now!'], tough: ['Start now. Argue later.', 'Press start. Five minutes.', 'Begin. Judge it afterwards.', 'The timer is waiting.'] },
  shift: { calm: ['Plan reshuffled. Nothing lost.', 'All moved safely. Undo is right there.', 'The week adjusted calmly.', 'Reshuffled with care.'], energetic: ['Reshuffled in a flash. Nothing lost!', 'New plan, same you. Go!', 'Shifted smoothly. Onward!', 'Plan reset and ready!'], tough: ['Plan adjusted. Now execute it.', 'Shifted. No excuses left.', 'New plan. Follow it.', 'Reshuffled. Get to work.'] },
};
const QUESTS = [['first_before_10', 'Finish your first task before 10 a.m.', 40], ['three_top3', 'Complete all of your Top 3', 60], ['tiny_start', 'Do one Tiny Start round', 30], ['plan_tomorrow', 'Plan tomorrow before 10 p.m.', 30], ['two_sprints', 'Complete two focus sprints', 40]] as const;

function seedReference(db: DB) {
  if (db.prepare('SELECT COUNT(*) c FROM tips').get() && (db.prepare('SELECT COUNT(*) c FROM tips').get() as { c: number }).c > 0) return;
  const tx = db.transaction(() => {
    const tip = db.prepare('INSERT INTO tips (id, text, context, tone) VALUES (?,?,?,?)');
    let i = 0;
    for (const [ctx, list] of Object.entries(TIP_STEMS)) for (const t of list) tip.run(uuidv7(), t, ctx, TONES[i++ % 3]);
    const line = db.prepare('INSERT INTO motivation_lines (id, text, context, tone) VALUES (?,?,?,?)');
    for (const [ctx, byTone] of Object.entries(LINES)) for (const [tone, list] of Object.entries(byTone)) for (const t of list) { line.run(uuidv7(), t, ctx, tone); line.run(uuidv7(), t.replace(/[.!]$/, '') + ' — keep going.', ctx, tone); line.run(uuidv7(), 'Today: ' + t, ctx, tone); line.run(uuidv7(), t + ' You can undo any step.', ctx, tone); line.run(uuidv7(), t + ' Progress over perfection.', ctx, tone); line.run(uuidv7(), 'Remember: ' + t.charAt(0).toLowerCase() + t.slice(1), ctx, tone); line.run(uuidv7(), t + ' One step at a time.', ctx, tone); }
    const ach = db.prepare('INSERT OR IGNORE INTO achievement_defs (code, name, description, category) VALUES (?,?,?,?)');
    for (const a of achievements) ach.run(a.code, a.name, a.description, a.category);
    const q = db.prepare('INSERT OR IGNORE INTO quest_defs (id, code, text, xp) VALUES (?,?,?,?)');
    for (const [code, text, xp] of QUESTS) q.run(uuidv7(), code, text, xp);
    const ev = db.prepare('INSERT OR IGNORE INTO seasonal_events (id, code, name, start_date, end_date) VALUES (?,?,?,?,?)');
    ev.run(uuidv7(), 'exam_season_spring', 'Exam season', '2027-03-01', '2027-04-15');
    ev.run(uuidv7(), 'exam_season_autumn', 'Exam season', '2026-11-15', '2026-12-20');
    ev.run(uuidv7(), 'new_year', 'New year reset', '2026-12-30', '2027-01-05');
    const hc = db.prepare('INSERT OR IGNORE INTO holiday_calendars (id, country, region, name) VALUES (?,?,?,?)');
    const hd = db.prepare('INSERT OR IGNORE INTO holiday_dates (id, holiday_calendar_id, date, title) VALUES (?,?,?,?)');
    const cal = uuidv7();
    hc.run(cal, 'IN', 'TN', 'India · Tamil Nadu');
    for (const [d, t] of [['2026-11-08', 'Deepavali'], ['2026-12-25', 'Christmas'], ['2027-01-14', 'Pongal'], ['2027-01-26', 'Republic Day']]) hd.run(uuidv7(), cal, d, t);
    const cal2 = uuidv7();
    hc.run(cal2, 'US', '', 'United States');
    for (const [d, t] of [['2026-11-26', 'Thanksgiving'], ['2026-12-25', 'Christmas'], ['2027-01-01', "New Year's Day"]]) hd.run(uuidv7(), cal2, d, t);
  });
  tx();
}
