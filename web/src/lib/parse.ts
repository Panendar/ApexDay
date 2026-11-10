import type { Category, Priority } from './types';
import { addDays, DOW, fromMin, toMin } from './time';

export interface Parsed { title: string; start?: string; dur?: number; date?: string; priority?: Priority; categoryId?: string; tags: string[]; fixed?: boolean }

/** Natural quick-add: "DSA 6pm 90m tomorrow !high #study @exam fixed". Fills fields for review. */
export function parseQuick(input: string, today: string, cats: Category[]): Parsed {
  let s = ' ' + input.trim() + ' ';
  const out: Parsed = { title: '', tags: [] };
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => { const m = s.match(re); if (m) { fn(m); s = s.replace(re, ' '); } };

  take(/\s!(high|med|low|urgent)\b/i, (m) => { out.priority = (m[1].toLowerCase() === 'urgent' ? 'high' : m[1].toLowerCase()) as Priority; });
  take(/\s#(\w[\w-]*)/, (m) => { const c = cats.find((c) => c.name.toLowerCase().startsWith(m[1].toLowerCase())); if (c) out.categoryId = c.id; });
  for (let i = 0; i < 6; i++) take(/\s@(\w[\w-]*)/, (m) => out.tags.push(m[1]));
  take(/\s(fixed|pinned)\b/i, () => { out.fixed = true; });
  take(/\s(?:for\s+)?(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minutes)\b/i, (m) => { const n = parseFloat(m[1]); out.dur = /^h/i.test(m[2]) ? Math.round(n * 60) : Math.round(n); });
  take(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, (m) => {
    let h = parseInt(m[1], 10) % 12; if (/pm/i.test(m[3])) h += 12;
    out.start = fromMin(h * 60 + (m[2] ? parseInt(m[2], 10) : 0));
  });
  if (!out.start) take(/\s(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/, (m) => { out.start = fromMin(toMin(`${m[1]}:${m[2]}`)); });
  take(/\s(today|tomorrow|tmrw|tonight)\b/i, (m) => { out.date = /^to(day|night)$/i.test(m[1]) ? today : addDays(today, 1); });
  if (!out.date) take(/\s(?:on\s+)?(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i, (m) => {
    const target = DOW.findIndex((d) => d.toLowerCase() === m[1].toLowerCase());
    const cur = new Date(today + 'T00:00:00').getDay();
    out.date = addDays(today, ((target - cur + 7) % 7) || 7);
  });
  out.title = s.replace(/\s+/g, ' ').trim();
  return out;
}
