import { useId } from 'react';

/**
 * Apex: the growing visual. stage 0..8 follows streak milestones; `health` 0..1 is today's progress
 * (brightness / weather). A missed day dims it, never destroys it.
 */
export function Apex({ stage, health = 0.6, kind = 'mountain', height = 200, hero = false }: { stage: number; health?: number; kind?: 'mountain' | 'tree' | 'flame'; height?: number; hero?: boolean }) {
  const id = useId().replace(/:/g, '');
  const bright = 0.45 + health * 0.55;
  return (
    <svg viewBox="0 0 320 200" width="100%" height={height} role="img" aria-label={`Apex ${kind}, stage ${stage + 1} of 9`} preserveAspectRatio="xMidYMid slice" style={{ display: 'block', borderRadius: 'inherit' }}>
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`color-mix(in srgb, var(--accent) ${Math.round(8 + health * 22)}%, #0b0b0c)`} />
          <stop offset="1" stopColor="var(--surface-2)" />
        </linearGradient>
        <radialGradient id={`sun${id}`}><stop offset="0" stopColor="var(--accent)" stopOpacity="0.95" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></radialGradient>
        <linearGradient id={`peak${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="color-mix(in srgb, var(--accent) 16%, #3a3a40)" /><stop offset="1" stopColor="var(--surface)" /></linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#sky${id})`} />
      {stage >= 5 && [[30, 24], [80, 14], [140, 30], [250, 18], [290, 44], [200, 10]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.3} fill="#fff" style={{ animation: `twinkle ${2 + (i % 3)}s ${i * 0.3}s infinite` }} />)}
      {stage >= 6 && <path d="M0 40 Q80 10 160 36 T320 22 V0 H0Z" fill="var(--accent)" opacity={0.1 * bright} style={{ animation: 'drift 7s ease-in-out infinite alternate' }} />}
      <circle cx={stage >= 4 ? 258 : 250} cy={stage >= 4 ? 46 : 60} r={stage >= 4 ? 44 : 30} fill={`url(#sun${id})`} opacity={bright} />
      {stage >= 3 && <g opacity={0.5 * bright} style={{ animation: 'drift 9s ease-in-out infinite alternate' }}><ellipse cx="70" cy="50" rx="30" ry="7" fill="#fff" opacity="0.5" /><ellipse cx="92" cy="45" rx="20" ry="6" fill="#fff" opacity="0.5" /></g>}
      {kind === 'mountain' && <Mountain stage={stage} id={id} bright={bright} />}
      {kind === 'tree' && <Tree stage={stage} bright={bright} />}
      {kind === 'flame' && <Flame stage={stage} bright={bright} />}
      {stage >= 4 && kind === 'mountain' && [[110, 62], [128, 52], [96, 74]].map(([x, y], i) => <path key={i} d={`M${x} ${y} q4 -5 8 0 q4 -5 8 0`} stroke="var(--text)" strokeWidth="1.2" fill="none" opacity={0.6} style={{ animation: `floaty ${3 + i}s ease-in-out infinite` }} />)}
      {hero && <rect width="320" height="200" fill="url(#none)" />}
    </svg>
  );
}

function Mountain({ stage, id, bright }: { stage: number; id: string; bright: number }) {
  const px = 168, py = 124 - stage * 9;
  const far = `M-10 200 L60 ${Math.max(90, py + 50)} L110 ${py + 66} L150 ${py + 40} L230 ${py + 76} L330 ${py + 52} L330 200Z`;
  const main = `M10 200 L${px - 62} ${py + 62} L${px - 24} ${py + 40} L${px} ${py} L${px + 28} ${py + 44} L${px + 64} ${py + 70} L310 200Z`;
  return (
    <g>
      <path d={far} fill="color-mix(in srgb, var(--accent) 10%, #2a2a2f)" opacity={0.8} />
      <path d={main} fill={`url(#peak${id})`} stroke="var(--line-2)" strokeWidth="1" />
      <path d={`M${px} ${py} L${px + 28} ${py + 44} L${px + 64} ${py + 70} L${px + 20} 200 L${px - 4} 200Z`} fill="#000" opacity="0.2" />
      {stage >= 3 && <path d={`M${px} ${py} L${px - 22} ${py + 30} L${px - 11} ${py + 25} L${px - 3} ${py + 35} L${px + 8} ${py + 25} L${px + 20} ${py + 33} L${px + 24} ${py + 38}Z`} fill="#fff" opacity={0.9 * bright} />}
      {stage >= 1 && <path d={`M${px - 60} 200 Q${px - 30} ${py + 110} ${px} ${py + 70}`} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="2 5" fill="none" opacity={0.7} />}
      {stage >= 2 && (
        <g style={{ transformOrigin: `${px}px ${py}px`, animation: 'breathe 3s ease-in-out infinite' }}>
          <line x1={px} y1={py} x2={px} y2={py - 26} stroke="#fff" strokeWidth="1.8" />
          <path d={`M${px} ${py - 26} l20 6 l-20 7Z`} fill="var(--accent)" style={{ filter: 'drop-shadow(0 0 6px var(--accent-glow))' }} />
        </g>
      )}
      {stage >= 7 && <circle cx={px} cy={py - 14} r={34} fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.5" style={{ animation: 'pulseRing 2.4s infinite' }} />}
    </g>
  );
}

function Tree({ stage, bright }: { stage: number; bright: number }) {
  const s = 0.55 + stage * 0.07;
  return (
    <g transform={`translate(160 196) scale(${s}) translate(-160 -196)`}>
      <ellipse cx="160" cy="196" rx="120" ry="10" fill="var(--surface-3)" />
      <path d="M154 196 L158 120 L162 120 L166 196Z" fill="#8b6a4a" />
      {[[160, 112, 52], [130, 132, 36], [190, 132, 36], [160, 90, 38], [118, 106, 26], [202, 108, 26]].slice(0, 2 + Math.floor(stage * 0.6)).map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="var(--accent)" opacity={0.55 + 0.45 * bright} style={{ transformOrigin: `${x}px ${y}px`, animation: `breathe ${3 + i * 0.4}s ease-in-out infinite` }} />
      ))}
    </g>
  );
}

function Flame({ stage, bright }: { stage: number; bright: number }) {
  const s = 0.5 + stage * 0.09;
  return (
    <g transform={`translate(160 196) scale(${s}) translate(-160 -196)`} style={{ transformOrigin: '160px 196px', animation: 'flicker 1.8s ease-in-out infinite' }}>
      <ellipse cx="160" cy="196" rx="70" ry="8" fill="var(--surface-3)" />
      <path d="M160 40 C170 90 220 110 220 156 C220 184 194 196 160 196 C126 196 100 184 100 156 C100 126 126 114 134 80 C146 96 148 108 150 112 C154 90 154 66 160 40Z" fill="var(--accent)" opacity={0.5 + 0.5 * bright} style={{ filter: 'drop-shadow(0 0 18px var(--accent-glow))' }} />
      <path d="M160 100 C164 130 190 140 190 166 C190 184 176 192 160 192 C144 192 130 184 130 166 C130 146 150 138 160 100Z" fill="#fff" opacity={0.85} />
    </g>
  );
}
