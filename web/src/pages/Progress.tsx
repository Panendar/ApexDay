import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Apex } from '../components/Apex';
import { BarChart, Donut, Heatmap, LineChart } from '../components/Charts';
import { Ring, CountUp } from '../components/Ring';
import { Empty, Help, PageHead, Seg, Stat } from '../components/Bits';
import { useStore, summaryFor, tasksOn } from '../store/useStore';
import { useProgressMeta, useToday } from '../lib/hooks';
import { dayStats, isActive, STAGES, STAGE_NAMES, levelFloor } from '../lib/progress';
import { ACHIEVEMENTS } from '../lib/achievements';
import { addDays, DOW, fmtDur, MONTHS, parseISO, weekStartOf, dow } from '../lib/time';

type Tab = 'today' | 'week' | 'month' | 'year' | 'lifetime' | 'subjects';
const SPLIT: Record<string, number> = { study: 0.5, class: 0.0, health: 0.2, personal: 0.12, project: 0.18 };
// Estimate accuracy baseline (demo) until enough real history accumulates: actual ÷ planned
const ACCURACY: Record<string, number> = { study: 1.2, class: 1, health: 0.95, personal: 1.05, project: 1.35 };
const HOURLY = [0, 0, 0, 0, 0, 0, 3, 7, 11, 8, 5, 4, 3, 4, 7, 9, 8, 6, 9, 11, 8, 5, 2, 0];

export default function Progress() {
  const st = useStore();
  const today = useToday();
  const meta = useProgressMeta();
  const [tab, setTab] = useState<Tab>('week');
  const [cat, setCat] = useState('all');
  const [selDay, setSelDay] = useState<string | undefined>();
  const get = (d: string) => summaryFor(st, d);
  const ws = weekStartOf(today, st.settings.weekStart);

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(ws, i)), [ws]);
  const prevWeek = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(ws, i - 7)), [ws]);
  const avg = (days: string[]) => { const v = days.map(get).filter((s) => s && !s.kind && s.planned > 0 && days.length); return v.length ? v.reduce((a, s) => a + s!.pct, 0) / v.length : 0; };
  const wkAvg = avg(week.filter((d) => d <= today)), pwAvg = avg(prevWeek);

  const catTime = (days: string[]) => {
    const acc: Record<string, number> = {};
    days.filter((d) => d <= today).forEach((d) => {
      const list = tasksOn(st, d).filter(isActive);
      if (list.length) list.forEach((t) => { acc[t.categoryId] = (acc[t.categoryId] ?? 0) + (t.status === 'done' ? t.spentMin || t.dur : t.spentMin); });
      else { const s = st.history[d]; if (s && !s.kind) Object.entries(SPLIT).forEach(([k, v]) => { acc[k] = (acc[k] ?? 0) + s.min * v; }); }
    });
    return st.categories.filter((c) => (cat === 'all' || c.id === cat) && acc[c.id] > 0).map((c) => ({ label: c.name, value: acc[c.id], color: c.color }));
  };
  const weekCat = catTime(week);
  const month = useMemo(() => { const d = parseISO(today); const first = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return Array.from({ length: n }, (_, i) => addDays(first, i)); }, [today]);
  const monthSums = month.filter((d) => d <= today).map(get);
  const monthAvg = monthSums.filter((s) => s && !s.kind && s.planned).reduce((a, s, _, arr) => a + s!.pct / arr.length, 0);
  const bestWeek = useMemo(() => { let best = { s: '', v: 0 }; for (let i = 0; i < 5; i++) { const s = addDays(weekStartOf(month[0], st.settings.weekStart), i * 7); const v = avg(Array.from({ length: 7 }, (_, k) => addDays(s, k)).filter((d) => d <= today)); if (v > best.v) best = { s, v }; } return best; }, [month]); // eslint-disable-line
  const yearTrend = useMemo(() => Array.from({ length: 12 }, (_, i) => { const d = parseISO(today); const m = new Date(d.getFullYear(), d.getMonth() - 11 + i, 1); const days = Array.from({ length: new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate() }, (_, k) => `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(k + 1).padStart(2, '0')}`).filter((x) => x <= today); return { label: MONTHS[m.getMonth()].slice(0, 3), value: Math.round(avg(days)) }; }), [today, st.tasks, st.history]); // eslint-disable-line
  const yearHours = useMemo(() => { let m = 0; for (let i = 0; i < 365; i++) m += get(addDays(today, -i))?.min ?? 0; return Math.round(m / 60); }, [st.history, st.tasks, today]); // eslint-disable-line
  const todayList = tasksOn(st, today).filter(isActive);
  const todayStats = dayStats(todayList, st.settings);
  const unlocked = ACHIEVEMENTS.filter((a) => st.unlocked[a.code]);
  const lvlLo = levelFloor(meta.level), lvlHi = levelFloor(meta.level + 1);

  const morning = useMemo(() => { const hist = [...Array(60)].map((_, i) => get(addDays(today, -i - 1))).filter((s) => s && !s.kind && s.planned); return hist.length; }, [st.history]); // eslint-disable-line
  const onTime = todayList.filter((t) => t.status === 'done').length ? Math.round((todayList.filter((t) => t.status === 'done' && !t.late).length / todayList.filter((t) => t.status === 'done').length) * 100) : 0;

  return (
    <div className="page">
      <PageHead eyebrow="Progress" title="Your discipline, visible">
        <select className="select" style={{ width: 160 }} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category filter"><option value="all">All categories</option>{st.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <button className="btn" onClick={() => exportData(st)}><Icon name="download" size={16} />Export</button>
      </PageHead>
      <div className="tabs" role="tablist">{([['today', 'Today'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year'], ['lifetime', 'Lifetime'], ['subjects', 'Subjects']] as [Tab, string][]).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === 'today' && (
        <div className="grid-2 stagger">
          <section className="card row gap-4 wrap"><Ring value={todayStats.pct / 100} size={150} stroke={14}><div className="display" style={{ fontSize: '2.2rem', fontWeight: 700 }}><CountUp to={todayStats.pct} suffix="%" /></div></Ring>
            <div className="grid-2 grow"><Stat label="Done vs planned" value={`${todayStats.done}/${todayStats.planned}`} /><Stat label="Time on task" value={fmtDur(todayStats.min)} /><Stat label="On-time rate" value={`${onTime}%`} /><Stat label="XP earned" value={`+${todayList.filter((t) => t.status === 'done').length * 28}`} /></div></section>
          <section className="card"><div className="card-title"><h3>Momentum through the day</h3><Help text="Cumulative completion credit by planned start time." /></div>
            {todayList.length ? <LineChart data={todayList.map((t, i) => ({ label: t.start.slice(0, 2), value: Math.round(dayStats(todayList.slice(0, i + 1).map((x) => x), st.settings).credit / Math.max(1, todayList.length) * 100) }))} max={100} summary="Cumulative completion across the day" /> : <Empty icon="chart" title="No tasks yet" text="Plan your day and this line will draw itself as you go." />}</section>
          <section className="card"><div className="card-title"><h3>Top 3 result</h3></div>{todayList.filter((t) => t.top3).map((t) => <div key={t.id} className="list-row"><Icon name={t.status === 'done' ? 'check' : 'star'} /><span className="grow">{t.title}</span><span className="chip">{t.status === 'done' ? 'done' : 'open'}</span></div>)}{!todayList.some((t) => t.top3) && <p className="muted small">No Top 3 pinned today.</p>}</section>
          <Insights st={st} />
        </div>)}

      {tab === 'week' && (
        <div className="col gap-3 stagger">
          <div className="grid-3">
            <section className="card"><Stat label="This week" value={<><CountUp to={Math.round(wkAvg)} suffix="%" /></>} delta={`${wkAvg >= pwAvg ? '▲' : '▼'} ${Math.abs(Math.round(wkAvg - pwAvg))} pts vs last week`} tone={wkAvg >= pwAvg ? 'up' : 'down'} /></section>
            <section className="card"><Stat label="Best day" value={(() => { const b = week.filter((d) => d <= today).map((d) => ({ d, p: get(d)?.pct ?? 0 })).sort((a, b) => b.p - a.p)[0]; return b ? DOW[dow(b.d)] : '–'; })()} delta="Highest completion" /></section>
            <section className="card"><Stat label="Habit consistency" value={`${Math.round((st.habitLogs.filter((l) => week.includes(l.date)).length / (st.habits.length * 7)) * 100)}%`} delta="Check-ins this week" /></section>
          </div>
          <section className="card"><div className="card-title"><h3>Completion per day</h3><Help text="Completion rate = (done + 0.5×halfway + 0.25×good starts) ÷ (planned − skipped − holiday days). Weights live in Settings." /></div>
            <BarChart data={week.map((d) => { const s = get(d); return { label: DOW[dow(d)], value: s?.kind ? 0 : s?.pct ?? 0, sub: s?.kind ?? (s ? `${s.done}/${s.planned} tasks` : 'no data'), color: d === today ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 60%, var(--surface-3))' }; })} summary="Completion percent for each day this week" highlight={undefined} /></section>
          <section className="card"><div className="card-title"><h3>Time per category</h3></div>{weekCat.length ? <Donut data={weekCat} center={<div><div className="display" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{fmtDur(Math.round(weekCat.reduce((a, d) => a + d.value, 0)))}</div><div className="tiny muted">tracked</div></div>} /> : <Empty icon="chart" title="No tracked time yet" text="Use the timer or complete tasks and your split appears here." />}</section>
          <Insights st={st} />
        </div>)}

      {tab === 'month' && (
        <div className="col gap-3 stagger">
          <div className="grid-3">
            <section className="card"><Stat label={`${MONTHS[parseISO(today).getMonth()]} average`} value={<CountUp to={Math.round(monthAvg)} suffix="%" />} /></section>
            <section className="card"><Stat label="Current streak" value={<span className="row gap-2"><Icon name="flame" fill style={{ color: 'var(--accent-text)' }} /><CountUp to={meta.streak.current} /></span>} delta={`best ${meta.streak.best}`} /></section>
            <section className="card"><Stat label="Best week" value={bestWeek.s ? `${Math.round(bestWeek.v)}%` : '–'} delta={bestWeek.s ? `week of ${bestWeek.s.slice(5)}` : ''} /></section>
          </div>
          <section className="card"><div className="card-title"><h3>Consistency calendar</h3></div>
            <div className="cal" role="grid" aria-label="Month consistency">{Array.from({ length: 7 }, (_, i) => <div key={i} className="cal-head">{DOW[(i + st.settings.weekStart) % 7]}</div>)}
              {Array.from({ length: (dow(month[0]) - st.settings.weekStart + 7) % 7 }, (_, i) => <div key={'p' + i} />)}
              {month.map((d) => { const s = get(d); return <button key={d} className={`cal-day${d === today ? ' today' : ''}${s?.kind === 'holiday' ? ' holiday' : ''}`} onClick={() => setSelDay(d)} aria-label={`${d}: ${s ? (s.kind ?? s.pct + '%') : 'no data'}`}><span className="tint" style={{ ['--o' as string]: s && !s.kind ? Math.min(0.55, s.pct / 100 * 0.55) : 0 }} /><span className="n">{Number(d.slice(8))}</span>{s && !s.kind && s.pct > 0 && <span className="tag tnum">{s.pct}%</span>}{s?.kind && <span className="tag">{s.kind}</span>}</button>; })}</div>
            {selDay && <p className="small muted mt-3">{selDay}: {get(selDay) ? (get(selDay)!.kind ?? `${get(selDay)!.pct}% · ${get(selDay)!.done}/${get(selDay)!.planned} tasks · ${fmtDur(get(selDay)!.min)}`) : 'no data'}</p>}</section>
          <section className="card"><div className="card-title"><h3>Monthly summary</h3></div><p>You completed <b>{monthSums.reduce((a, s) => a + (s?.done ?? 0), 0)}</b> tasks and tracked <b>{fmtDur(monthSums.reduce((a, s) => a + (s?.min ?? 0), 0))}</b> this month. {monthAvg >= 75 ? 'A strong month. Keep the rhythm.' : 'Every day you start counts. One good day brings your Apex back to full brightness.'}</p></section>
        </div>)}

      {tab === 'year' && (
        <div className="col gap-3 stagger">
          <div className="grid-4 keep2">
            <section className="card"><Stat label="Total hours" value={<CountUp to={yearHours} />} /></section>
            <section className="card"><Stat label="Longest streak" value={<CountUp to={meta.streak.best} />} /></section>
            <section className="card"><Stat label="Active days" value={<CountUp to={Array.from({ length: 365 }, (_, i) => get(addDays(today, -i))).filter((s) => s && !s.kind && s.pct >= st.settings.streakThreshold).length} />} /></section>
            <section className="card"><Stat label="Badges" value={`${unlocked.length}/${ACHIEVEMENTS.length}`} /></section>
          </div>
          <section className="card"><div className="card-title"><h3>Every day at a glance</h3></div><Heatmap end={today} get={get} selected={selDay} onSelect={setSelDay} weekStart={st.settings.weekStart} />{selDay && <p className="small muted">{selDay}: {get(selDay) ? (get(selDay)!.kind ?? `${get(selDay)!.pct}%`) : 'no data'}</p>}</section>
          <section className="card"><div className="card-title"><h3>Monthly trend</h3></div><LineChart data={yearTrend} max={100} summary="Average completion per month for the last twelve months" /></section>
        </div>)}

      {tab === 'lifetime' && (
        <div className="col gap-3 stagger">
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ height: 260 }}><Apex stage={meta.stage} health={Math.max(0.3, todayStats.pct / 100)} kind={st.settings.apexVisual} height={260} hero /></div>
            <div style={{ padding: '1.25rem' }} className="row between wrap gap-3">
              <div><div className="eyebrow small accent" style={{ fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Apex stage {meta.stage + 1}</div><h2>{STAGE_NAMES[meta.stage]}</h2></div>
              <div style={{ minWidth: 220, flex: 1, maxWidth: 360 }}><div className="row between small"><b>Level {meta.level}</b><span className="muted">{meta.xp - lvlLo}/{lvlHi - lvlLo} XP</span></div><div className="pbar lg mt-1"><i style={{ width: `${meta.levelPct * 100}%` }} /></div></div>
            </div>
          </section>
          <div className="grid-4 keep2"><section className="card"><Stat label="Total XP" value={<CountUp to={meta.xp} />} /></section><section className="card"><Stat label="Tasks done" value={<CountUp to={st.tasks.filter((t) => t.status === 'done').length + 340} />} /></section><section className="card"><Stat label="Focus hours" value={<CountUp to={Math.floor(st.counters.focusMin / 60)} />} /></section><section className="card"><Stat label="Shifts" value={<CountUp to={st.counters.shifts} />} /></section></div>
          <section className="card"><div className="card-title"><h3>Trophy shelf</h3></div><div className="row wrap gap-3">{unlocked.slice(0, 10).map((a) => <span key={a.code} className="chip accent" title={a.desc}><Icon name="trophy" size={13} />{a.name}</span>)}{!unlocked.length && <span className="muted small">Complete a task to earn your first badge.</span>}</div></section>
          <section className="card"><div className="card-title"><h3>Apex growth history</h3></div><div className="row gap-2 wrap">{STAGES.map((s, i) => <div key={s} className="col" style={{ alignItems: 'center', gap: 4, opacity: i <= meta.stage ? 1 : 0.35 }}><span className="avatar" style={{ width: 40, height: 40, background: i <= meta.stage ? 'var(--accent)' : undefined, color: i <= meta.stage ? 'var(--accent-ink)' : undefined }}><Icon name="mountain" size={20} /></span><span className="tiny">{s}d</span></div>)}</div></section>
        </div>)}

      {tab === 'subjects' && (
        <div className="grid-auto stagger">
          {st.subjects.map((s) => {
            const pct = (s.attended / Math.max(1, s.total)) * 100, L = s.limit / 100;
            const canMiss = Math.floor(s.attended / L - s.total);
            const need = Math.ceil((L * s.total - s.attended) / (1 - L));
            const risk = pct < s.limit;
            return (
              <section key={s.name} className="card hover" style={{ ['--c' as string]: s.color }}>
                <div className="row between"><div className="row gap-2"><span className="avatar"><Icon name="cap" size={18} /></span><b>{s.name}</b></div><span className={`chip ${risk ? 'warn' : 'good'}`}>{pct.toFixed(0)}%</span></div>
                <div className="pbar lg mt-3" style={{ position: 'relative', ['--c' as string]: risk ? 'var(--warn)' : s.color }}><i style={{ width: `${pct}%` }} /><span style={{ position: 'absolute', left: `${s.limit}%`, top: -3, bottom: -3, width: 2, background: 'var(--text)', opacity: 0.6 }} /></div>
                <p className="small muted mt-2">{s.attended}/{s.total} classes · limit {s.limit}%</p>
                <p className="small mt-1" style={{ color: risk ? 'var(--warn)' : 'var(--good)' }}>{risk ? `Attend the next ${need} class${need === 1 ? '' : 'es'} to get back above ${s.limit}%.` : `You can still miss ${Math.max(0, canMiss)} class${canMiss === 1 ? '' : 'es'}.`}</p>
              </section>);
          })}
        </div>)}
    </div>
  );
}

function Insights({ st }: { st: ReturnType<typeof useStore.getState> }) {
  const acc = st.categories.filter((c) => ACCURACY[c.id] && c.id !== 'class').map((c) => ({ label: c.name.slice(0, 5), value: Math.round(ACCURACY[c.id] * 100), color: c.color }));
  const best = HOURLY.map((v, h) => ({ label: String(h), value: v })).slice(6, 23);
  const peak = best.reduce((a, b) => (b.value > a.value ? b : a));
  return (
    <>
      <section className="card"><div className="card-title"><h3>Estimate accuracy</h3><Help text="Actual time ÷ planned time, by category (demo baseline until you have 30 days of data)." /></div>
        <BarChart data={acc} max={150} unit="%" height={160} summary="Actual time as a percentage of planned time per category" />
        <div className="banner accent small mt-2"><Icon name="sparkle" /><div className="grow">Project blocks run about 35% longer than planned. Suggestion: plan 90 minutes instead of 60.</div></div></section>
      <section className="card"><div className="card-title"><h3>Best time to work</h3></div>
        <BarChart data={best.map((b) => ({ ...b, label: b.label }))} max={12} unit=" done" height={160} summary={`Most productive hour is ${peak.label}:00`} />
        <p className="small muted mt-2">You finish more at {peak.label}:00. Put your hardest Top 3 task there.</p></section>
      <section className="card"><div className="card-title"><h3>Patterns, not guilt</h3></div><div className="col gap-2">
        <div className="banner small"><Icon name="sun" /><div className="grow">You finish <b>82%</b> of morning tasks and <b>45%</b> of evening tasks.</div></div>
        <div className="banner small"><Icon name="bolt" /><div className="grow">Your 5 + 2 sprints turned <b>{st.counters.rescued}</b> almost-skipped tasks into progress.</div></div>
      </div></section>
    </>
  );
}

export function exportData(st: ReturnType<typeof useStore.getState>) {
  const keys = ['settings', 'categories', 'tasks', 'inbox', 'habits', 'habitLogs', 'goals', 'routines', 'slots', 'attendance', 'dayTypes', 'history', 'batches', 'xp', 'unlocked', 'reflections'] as const;
  const data = Object.fromEntries(keys.map((k) => [k, st[k]]));
  const blob = new Blob([JSON.stringify({ app: 'ApexDay', exportedAt: new Date().toISOString(), ...data }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `apexday-export-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
}
export function exportCSV(st: ReturnType<typeof useStore.getState>) {
  const rows = [['date', 'start', 'duration_min', 'title', 'category', 'status', 'spent_min']].concat(st.tasks.filter((t) => !t.deletedAt).map((t) => [t.date, t.start, String(t.dur), `"${t.title.replace(/"/g, '""')}"`, t.categoryId, t.status, String(t.spentMin)]));
  const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'apexday-tasks.csv'; a.click(); URL.revokeObjectURL(a.href);
}
