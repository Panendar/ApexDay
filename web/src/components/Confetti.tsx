import { useEffect, useRef, useState } from 'react';
import type { BurstOpts } from '../lib/fx';
import { useStore } from '../store/useStore';

interface P { x: number; y: number; vx: number; vy: number; r: number; rot: number; vr: number; c: string; life: number; max: number; shape: number }

/** Canvas particle bursts (micro on every completion, big on a perfect day) + floating XP chips. */
export function FxLayer() {
  const ref = useRef<HTMLCanvasElement>(null);
  const parts = useRef<P[]>([]);
  const raf = useRef(0);
  const [chips, setChips] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const reduced = useStore((s) => s.settings.motion === 'reduced');

  useEffect(() => {
    const cvs = ref.current!;
    const ctx = cvs.getContext('2d')!;
    const fit = () => { const d = window.devicePixelRatio || 1; cvs.width = innerWidth * d; cvs.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    fit(); addEventListener('resize', fit);
    const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c6f432';
    const loop = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.current = parts.current.filter((p) => p.life < p.max);
      for (const p of parts.current) {
        p.life++; p.vy += 0.16; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        if (p.shape === 0) ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); else { ctx.beginPath(); ctx.arc(0, 0, p.r * 0.7, 0, 7); ctx.fill(); }
        ctx.restore();
      }
      raf.current = parts.current.length ? requestAnimationFrame(loop) : 0;
    };
    const onBurst = (e: Event) => {
      const o = (e as CustomEvent<BurstOpts>).detail;
      const n = reduced ? 0 : o.big ? 140 : 26;
      const cols = [o.color ?? accent(), accent(), '#ffffff', o.color ?? '#c6f432'];
      for (let i = 0; i < n; i++) {
        const a = o.big ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
        const sp = (o.big ? 4 + Math.random() * 9 : 2 + Math.random() * 5);
        parts.current.push({ x: o.x, y: o.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.big ? 3 : 1), r: 3 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length], life: 0, max: o.big ? 110 + Math.random() * 60 : 42 + Math.random() * 26, shape: i % 3 === 0 ? 1 : 0 });
      }
      if (!raf.current && n) raf.current = requestAnimationFrame(loop);
    };
    const onXp = (e: Event) => {
      const d = (e as CustomEvent<{ x: number; y: number; text: string }>).detail;
      const id = Math.random();
      setChips((c) => [...c.slice(-4), { id, ...d }]);
      setTimeout(() => setChips((c) => c.filter((x) => x.id !== id)), 1100);
    };
    addEventListener('apex:burst', onBurst); addEventListener('apex:xp', onXp);
    return () => { removeEventListener('apex:burst', onBurst); removeEventListener('apex:xp', onXp); removeEventListener('resize', fit); cancelAnimationFrame(raf.current); };
  }, [reduced]);

  return (
    <>
      <canvas ref={ref} className="fx-canvas" aria-hidden="true" />
      {chips.map((c) => (
        <div key={c.id} className="xp-chip" style={{ left: c.x, top: c.y, animation: reduced ? 'fadeIn 200ms both' : 'xpFloat 1.1s var(--ease-out) forwards' }}>{c.text}</div>
      ))}
      <style>{`@keyframes xpFloat { 0% { opacity: 0; transform: translate(-50%, -30%) scale(.6); } 20% { opacity: 1; transform: translate(-50%, -80%) scale(1.1); } 100% { opacity: 0; transform: translate(40vw, -42vh) scale(.7); } }`}</style>
    </>
  );
}
