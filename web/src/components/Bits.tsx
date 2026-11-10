import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { Category } from '../lib/types';

export function Empty({ icon = 'sparkle', title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <svg className="art" viewBox="0 0 120 90" aria-hidden="true">
        <ellipse cx="60" cy="80" rx="46" ry="6" fill="var(--surface-3)" />
        <path d="M18 76 52 24l16 24 12-16 22 44Z" fill="var(--surface-2)" stroke="var(--line-2)" />
        <path d="M52 24l-9 14 6-3 5 6 5-6 6 4Z" fill="#fff" opacity=".85" />
        <circle cx="92" cy="22" r="8" fill="var(--accent)" opacity=".85" style={{ animation: 'floaty 3.6s ease-in-out infinite' }} />
      </svg>
      <div style={{ color: 'var(--accent-text)' }}><Icon name={icon} size={22} /></div>
      <h3>{title}</h3>
      {text && <p className="small" style={{ maxWidth: 360 }}>{text}</p>}
      {action}
    </div>
  );
}

export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head reveal">
      <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1></div>
      {children && <div className="row wrap">{children}</div>}
    </header>
  );
}

export function CatChip({ cat }: { cat?: Category }) {
  if (!cat) return null;
  return <span className="row gap-1" style={{ ['--c' as string]: cat.color }}><i className="dot" />{cat.name}</span>;
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className="switch" onClick={() => onChange(!on)} />;
}

export function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; l: ReactNode }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => <button key={String(o.v)} type="button" className={o.v === value ? 'on' : ''} aria-pressed={o.v === value} onClick={() => onChange(o.v)}>{o.l}</button>)}
    </div>
  );
}

export function Help({ text }: { text: string }) { return <span className="help" title={text} aria-label={text} role="img">?</span>; }

export function Stat({ label, value, delta, tone }: { label: string; value: ReactNode; delta?: string; tone?: 'up' | 'down' }) {
  return <div className="stat"><span className="l">{label}</span><span className="v">{value}</span>{delta && <span className={`d ${tone ?? ''}`}>{delta}</span>}</div>;
}
