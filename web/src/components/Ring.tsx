import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

export interface Seg { value: number; color: string }

/** Animated progress ring. `value` 0..1, optional category segments (day ring). */
export function Ring({ value, size = 120, stroke = 10, color, segments, children, warm, label }: { value: number; size?: number; stroke?: number; color?: string; segments?: Seg[]; children?: ReactNode; warm?: boolean; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const [shown, setShown] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => setShown(v)); return () => cancelAnimationFrame(t); }, [v]);
  const col = warm ? 'var(--warn)' : color ?? 'var(--accent)';
  let acc = 0;
  return (
    <div className="ring-wrap" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v * 100)} percent`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        {segments && segments.length ? (
          segments.map((s, i) => {
            const len = Math.max(0, Math.min(1, s.value)) * c;
            const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke={s.color} strokeLinecap="butt" strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-acc * c} style={{ transition: 'stroke-dasharray 900ms var(--ease-out)' }} />;
            acc += Math.max(0, Math.min(1, s.value));
            return el;
          })
        ) : (
          <circle className="ring-fill" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke={col} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - shown)} />
        )}
      </svg>
      {children && <div className="ring-center">{children}</div>}
    </div>
  );
}

/** Count-up number for stats. */
export function CountUp({ to, ms = 900, suffix = '' }: { to: number; ms?: number; suffix?: string }) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now(), a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(a + (to - a) * e));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <span className="tnum">{v}{suffix}</span>;
}
