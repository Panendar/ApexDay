import { useId, useState, type ReactNode } from 'react';
import { addDays, dow, parseISO } from '../lib/time';
import type { DaySummary } from '../lib/types';

function useTip() {
  const [tip, setTip] = useState<{ x: number; y: number; t: ReactNode } | null>(null);
  const on = (t: ReactNode) => ({
    onMouseEnter: (e: React.MouseEvent) => setTip({ x: e.clientX, y: e.clientY, t }),
    onMouseMove: (e: React.MouseEvent) => setTip({ x: e.clientX, y: e.clientY, t }),
    onMouseLeave: () => setTip(null),
    onFocus: (e: React.FocusEvent) => { const r = (e.currentTarget as Element).getBoundingClientRect(); setTip({ x: r.left + r.width / 2, y: r.top, t }); },
    onBlur: () => setTip(null),
  });
  const el = tip ? <div className="tooltip" role="tooltip" style={{ left: tip.x, top: tip.y }}>{tip.t}</div> : null;
  return { on, el };
}

export interface Bar { label: string; value: number; color?: string; tip?: ReactNode; sub?: string }

export function BarChart({ data, max = 100, height = 190, unit = '%', summary, highlight }: { data: Bar[]; max?: number; height?: number; unit?: string; summary?: string; highlight?: number }) {
  const { on, el } = useTip();
  const W = 760, pad = { l: 30, r: 8, t: 12, b: 26 };
  const bw = (W - pad.l - pad.r) / data.length;
  const ih = height - pad.t - pad.b;
  const best = data.reduce((a, b, i, arr) => (b.value > arr[a].value ? i : a), 0);
  return (
    <figure style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label={summary ?? `Bar chart, best ${data[best]?.label}`} style={{ display: 'block', overflow: 'visible' }}>
        <g className="grid">{[0, 0.5, 1].map((p) => <g key={p}><line x1={pad.l} x2={W - pad.r} y1={pad.t + ih * (1 - p)} y2={pad.t + ih * (1 - p)} strokeDasharray={p ? '3 5' : undefined} /><text x={pad.l - 6} y={pad.t + ih * (1 - p) + 4} textAnchor="end">{Math.round(max * p)}</text></g>)}</g>
        {data.map((d, i) => {
          const h = Math.max(d.value ? 3 : 0, (Math.min(d.value, max) / max) * ih);
          const x = pad.l + i * bw + bw * 0.16, w = bw * 0.68;
          return (
            <g key={i} tabIndex={0} role="listitem" aria-label={`${d.label}: ${Math.round(d.value)}${unit}`} {...on(<><b>{d.label}</b> · {Math.round(d.value)}{unit}{d.sub ? ` · ${d.sub}` : ''}</>)} style={{ outline: 'none' }}>
              <rect className="bar-rect" x={x} y={pad.t + ih - h} width={w} height={h} rx={Math.min(8, w / 2)} fill={d.color ?? 'var(--accent)'} opacity={highlight !== undefined && highlight !== i ? 0.45 : i === best ? 1 : 0.82} style={{ animationDelay: `${i * 40}ms` }} />
              <text x={x + w / 2} y={height - 8} textAnchor="middle">{d.label}</text>
            </g>);
        })}
      </svg>
      <figcaption className="sr-only">{summary ?? data.map((d) => `${d.label} ${Math.round(d.value)}${unit}`).join(', ')}</figcaption>
      {el}
    </figure>
  );
}

export function Donut({ data, size = 170, center }: { data: { label: string; value: number; color: string }[]; size?: number; center?: ReactNode }) {
  const { on, el } = useTip();
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = size / 2 - 14, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="row gap-4 wrap">
      <div className="ring-wrap" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} role="img" aria-label={data.map((d) => `${d.label} ${Math.round((d.value / total) * 100)}%`).join(', ')}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={22} />
          {data.map((d, i) => { const len = (d.value / total) * c; const o = -acc; acc += len; return (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={22} strokeDasharray={`${Math.max(0, len - 3)} ${c}`} strokeDashoffset={o} tabIndex={0} aria-label={`${d.label}`}
              style={{ transition: 'stroke-width .2s', animation: `fadeIn .8s ${i * 90}ms both` }} {...on(<><b>{d.label}</b> · {Math.round((d.value / total) * 100)}%</>)} />); })}
        </svg>
        <div className="ring-center">{center}</div>
      </div>
      <div className="col gap-1">{data.map((d) => <div key={d.label} className="row gap-2 small"><i className="dot" style={{ ['--c' as string]: d.color }} /><span className="grow">{d.label}</span><b className="tnum">{Math.round((d.value / total) * 100)}%</b></div>)}</div>
      {el}
    </div>
  );
}

export function LineChart({ data, height = 170, unit = '%', max, summary }: { data: { label: string; value: number }[]; height?: number; unit?: string; max?: number; summary?: string }) {
  const id = useId().replace(/:/g, '');
  const { on, el } = useTip();
  const W = 760, pad = { l: 30, r: 12, t: 14, b: 24 };
  const m = max ?? Math.max(10, ...data.map((d) => d.value));
  const ih = height - pad.t - pad.b, iw = W - pad.l - pad.r;
  const pts = data.map((d, i) => [pad.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw), pad.t + ih * (1 - d.value / m)] as const);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <figure style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label={summary ?? 'Trend line'} style={{ display: 'block', overflow: 'visible' }}>
        <defs><linearGradient id={`lg${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".35" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
        <g className="grid">{[0, 0.5, 1].map((p) => <g key={p}><line x1={pad.l} x2={W - pad.r} y1={pad.t + ih * (1 - p)} y2={pad.t + ih * (1 - p)} strokeDasharray={p ? '3 5' : undefined} /><text x={pad.l - 6} y={pad.t + ih * (1 - p) + 4} textAnchor="end">{Math.round(m * p)}</text></g>)}</g>
        <path d={`${path} L${pts[pts.length - 1][0]} ${pad.t + ih} L${pts[0][0]} ${pad.t + ih}Z`} fill={`url(#lg${id})`} style={{ animation: 'fadeIn 1s .3s both' }} />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} style={{ animation: 'lineDraw 1.2s var(--ease-out) both', filter: 'drop-shadow(0 0 6px var(--accent-glow))' }} />
        {pts.map((p, i) => <g key={i} tabIndex={0} aria-label={`${data[i].label} ${Math.round(data[i].value)}${unit}`} {...on(<><b>{data[i].label}</b> · {Math.round(data[i].value)}{unit}</>)} style={{ outline: 'none' }}><circle cx={p[0]} cy={p[1]} r={14} fill="transparent" /><circle cx={p[0]} cy={p[1]} r={3.6} fill="var(--bg)" stroke="var(--accent)" strokeWidth={2} /><text x={p[0]} y={height - 6} textAnchor="middle">{data[i].label}</text></g>)}
      </svg>
      <style>{`@keyframes lineDraw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }`}</style>
      {el}
    </figure>
  );
}

export function Heatmap({ end, weeks = 53, get, onSelect, selected, weekStart = 1 }: { end: string; weeks?: number; get: (d: string) => DaySummary | undefined; onSelect?: (d: string) => void; selected?: string; weekStart?: 0 | 1 }) {
  const { on, el } = useTip();
  // start on the week's first day, `weeks` columns back
  const endDow = (dow(end) - weekStart + 7) % 7;
  const start = addDays(end, -(weeks - 1) * 7 - endDow);
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const level = (s?: DaySummary) => (!s || s.kind ? 0 : s.pct >= 90 ? 4 : s.pct >= 70 ? 3 : s.pct >= 40 ? 2 : s.pct > 0 ? 1 : 0);
  const months: { i: number; l: string }[] = [];
  cols.forEach((c, i) => { const m = parseISO(c[0]).getMonth(); if (i === 0 || m !== parseISO(cols[i - 1][0]).getMonth()) months.push({ i, l: parseISO(c[0]).toLocaleString('en', { month: 'short' }) }); });
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ position: 'relative', height: 16, marginBottom: 4, minWidth: weeks * 16 }}>{months.map((m) => <span key={m.i} className="tiny muted" style={{ position: 'absolute', left: m.i * 16 }}>{m.l}</span>)}</div>
      <div className="heat" role="grid" aria-label="Consistency heatmap" style={{ minWidth: weeks * 16 }}>
        {cols.map((c, ci) => (
          <div key={ci} className="heat-col" role="row">
            {c.map((d) => {
              const s = get(d); const fut = d > end;
              const cls = `heat-cell${s?.kind === 'holiday' || s?.kind === 'rest' || s?.kind === 'exam' ? ' hol' : ''}${s?.kind === 'frozen' ? ' frozen' : ''}${fut ? ' future' : ''}`;
              return <div key={d} role="gridcell" tabIndex={-1} className={cls} data-l={level(s)} aria-label={`${d}: ${s ? (s.kind ?? s.pct + '%') : 'no data'}`} style={selected === d ? { outline: '2px solid var(--text)' } : undefined}
                onClick={() => onSelect?.(d)} {...on(<><b>{d}</b> · {s ? (s.kind ? s.kind : `${s.pct}% · ${s.done}/${s.planned} tasks`) : 'no data'}</>)} />;
            })}
          </div>))}
      </div>
      <div className="row gap-2 tiny muted mt-2" aria-hidden="true">Less{[0, 1, 2, 3, 4].map((l) => <i key={l} className="heat-cell" data-l={l} />)}More<span className="end row gap-1"><i className="heat-cell hol" />holiday / rest</span><span className="row gap-1"><i className="heat-cell frozen" />freeze</span></div>
      {el}
    </div>
  );
}
