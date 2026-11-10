// Tiny effects bus: components call burst()/xpChip(); <Confetti/> and <XpLayer/> listen.
export interface BurstOpts { x: number; y: number; color?: string; big?: boolean }
export const burst = (o: BurstOpts) => window.dispatchEvent(new CustomEvent('apex:burst', { detail: o }));
export const xpChip = (o: { x: number; y: number; text: string }) => window.dispatchEvent(new CustomEvent('apex:xp', { detail: o }));
export const centerOf = (el?: Element | null) => {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 3 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

let ctx: AudioContext | null = null;
/** Optional, off-by-default chime. */
export function chime(freq = 660, enabled = false) {
  if (!enabled) return;
  try {
    ctx = ctx ?? new AudioContext();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.55);
  } catch { /* audio unavailable */ }
}
