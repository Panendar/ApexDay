export const pad = (n: number) => String(n).padStart(2, '0');
export const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const fromMin = (m: number) => { const x = Math.max(0, Math.min(1439, Math.round(m))); return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`; };
export const endOf = (start: string, dur: number) => fromMin(toMin(start) + dur);

export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
export const diffDays = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
export const dow = (s: string) => parseISO(s).getDay();

/** "Today" honours day_start_hour: 1 a.m. work belongs to the previous day. */
export const todayISO = (dayStartHour = 4) => { const d = new Date(); if (d.getHours() < dayStartHour) d.setDate(d.getDate() - 1); return iso(d); };
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const nowHHMM = () => fromMin(nowMin());

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthShort = (s: string) => MONTHS[parseISO(s).getMonth()].slice(0, 3);

export function fmtTime(t: string, hour12 = false) {
  if (!hour12) return t;
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'am' : 'pm'}`;
}
export function fmtDur(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
export function fmtDate(s: string, today?: string) {
  if (today) {
    const d = diffDays(today, s);
    if (d === 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    if (d === -1) return 'Yesterday';
  }
  const d = parseISO(s);
  return `${DOW[d.getDay()]}, ${d.getDate()} ${monthShort(s)}`;
}
export function fmtLong(s: string) { const d = parseISO(s); return `${DOW_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`; }
export function clock(sec: number) { const s = Math.max(0, Math.floor(sec)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return `${h ? h + ':' + pad(m) : pad(m)}:${pad(s % 60)}`; }
export const weekStartOf = (s: string, weekStart: 0 | 1) => { const d = dow(s); return addDays(s, -((d - weekStart + 7) % 7)); };
export const uid = () => {
  const b = crypto.getRandomValues(new Uint8Array(16));
  const ms = Date.now();
  for (let i = 0; i < 6; i++) b[i] = Math.floor(ms / 2 ** (40 - 8 * i)) & 0xff;
  b[6] = (b[6] & 0x0f) | 0x70; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
export const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
export const snapTo = (m: number, g: number) => Math.round(m / g) * g;
