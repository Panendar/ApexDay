import { Icon } from '../components/Icon';
import { PageHead, Stat } from '../components/Bits';
import { CountUp } from '../components/Ring';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { useToday } from '../lib/hooks';
import { QUESTS, questByCode, questOfDay, questProgress, questStats, RANKS, type QuestDef } from '../lib/quests';
import { addDays, fmtDate } from '../lib/time';

export default function Quests() {
  const st = useStore();
  const today = useToday();
  const ui = useUI.getState();
  const entry = st.quests?.[today];
  const featured = questOfDay(today);
  const active = entry?.accepted && !entry.dropped && !entry.doneAt ? questByCode(entry.code) : undefined;
  const doneToday = !!entry?.doneAt;
  const stats = questStats(st.quests, today);
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const history = Object.entries(st.quests ?? {}).filter(([, e]) => e.accepted || e.doneAt).sort(([a], [b]) => b.localeCompare(a)).slice(0, 20);

  const take = (q: QuestDef) => {
    if (doneToday) return ui.toast('You already completed today’s quest. A new one is waiting tomorrow.', { kind: 'info' });
    st.acceptQuest(today, q.code);
    ui.toast(`Quest taken: ${q.text.replace(/\.$/, '')}. Do the steps below and it completes by itself.`, { kind: 'good', ttl: 6000 });
  };

  return (
    <div className="page">
      <PageHead eyebrow="Quests" title="Take a quest. Finish it. Level up.">
        <span className="chip accent"><Icon name="trophy" size={13} />{stats.rank.name}</span>
      </PageHead>

      <div className="banner info small" style={{ marginBottom: '1rem' }}><Icon name="info" />
        <div><b>How it works:</b> pick one quest a day (you can switch until you finish it). Do the steps and it completes automatically, adding XP. Quests are optional, reward XP only, and a day you skip is never a failure.</div></div>

      {/* today's quest */}
      <section className="card reveal" aria-label="Today's quest" style={doneToday ? { borderColor: 'color-mix(in srgb, var(--good) 50%, transparent)' } : active ? { borderColor: 'color-mix(in srgb, var(--accent) 50%, transparent)' } : undefined}>
        <div className="row between wrap gap-2"><h2>Today’s quest</h2><span className="small muted">{fmtDate(today, today)}</span></div>
        {doneToday && entry && (() => { const d = questByCode(entry.code)!; return (
          <div className="row gap-3 mt-3 wrap"><span className="avatar" style={{ width: 52, height: 52, background: 'var(--good-soft)', color: 'var(--good)' }}><Icon name="check" size={26} stroke={3} /></span>
            <div className="grow"><b className="big">{d.title} complete</b><p className="muted small">{d.text} · <b style={{ color: 'var(--good)' }}>+{d.xp} XP earned</b>. A new quest unlocks tomorrow.</p></div></div>); })()}
        {active && <ActiveQuest def={active} today={today} />}
        {!active && !doneToday && <p className="muted mt-2">You haven’t taken a quest today. Pick one from the board below; the featured one is a good start.</p>}
      </section>

      {/* quest board */}
      <h3 style={{ margin: '1.5rem 0 0.75rem' }}>Quest board</h3>
      <div className="grid-auto stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {QUESTS.map((q) => {
          const isActive = active?.code === q.code;
          const isDoneToday = doneToday && entry?.code === q.code;
          return (
            <section key={q.code} className="card hover" style={isActive ? { borderColor: 'var(--accent)' } : isDoneToday ? { borderColor: 'var(--good)' } : undefined} aria-label={q.title}>
              <div className="row between gap-2"><span className="avatar"><Icon name={q.icon} size={18} /></span>
                <div className="row gap-1">{q.code === featured.code && <span className="chip accent">Featured today</span>}<span className="chip">+{q.xp} XP</span></div></div>
              <h3 className="mt-2">{q.title}</h3>
              <p className="small mt-1" style={{ fontWeight: 600 }}>{q.text}</p>
              <ol className="small muted mt-2" style={{ paddingLeft: '1.1rem', margin: '0.5rem 0 0', display: 'grid', gap: 3 }}>{q.how.map((h) => <li key={h}>{h}</li>)}</ol>
              <div className="row gap-2 mt-3">
                {isDoneToday ? <span className="chip good"><Icon name="check" size={12} />Completed today</span>
                  : isActive ? <><span className="chip accent">In progress</span><button className="btn btn-sm btn-ghost" onClick={() => { st.dropQuest(today); ui.toast('Quest dropped. No penalty.'); }}>Drop</button></>
                    : <button className={`btn btn-sm ${active || doneToday ? '' : 'btn-primary'}`} disabled={doneToday} onClick={() => take(q)}>{active ? 'Switch to this' : 'Take this quest'}</button>}
              </div>
            </section>);
        })}
      </div>

      {/* improvement */}
      <h3 style={{ margin: '1.75rem 0 0.75rem' }}>Your progress</h3>
      <div className="grid-4 keep2">
        <section className="card"><Stat label="Quests completed" value={<CountUp to={stats.completed} />} /></section>
        <section className="card"><Stat label="XP from quests" value={<CountUp to={stats.xp} />} /></section>
        <section className="card"><Stat label="Quest-day streak" value={<span className="row gap-2"><Icon name="flame" fill style={{ color: 'var(--accent-text)' }} />{stats.streak}</span>} /></section>
        <section className="card"><Stat label="Rank" value={stats.rank.name} /></section>
      </div>
      <section className="card mt-3">
        <div className="row between small"><b>{stats.rank.name}</b><span className="muted">{stats.next ? `${stats.toNext} more quest${stats.toNext === 1 ? '' : 's'} to ${stats.next.name}` : 'Top rank reached'}</span></div>
        <div className="pbar lg mt-2 striped"><i style={{ width: `${stats.rankPct}%` }} /></div>
        <div className="row between tiny faint mt-1">{RANKS.map((r) => <span key={r.name}>{r.name} · {r.at}</span>)}</div>
        <div className="mt-3 small muted">Last 14 days</div>
        <div className="row gap-1 mt-1" role="img" aria-label="Last 14 days of quests">{last14.map((d) => <i key={d} title={`${d}${stats.dates.has(d) ? ': completed' : ''}`} style={{ flex: 1, height: 26, borderRadius: 7, background: stats.dates.has(d) ? 'var(--accent)' : 'var(--surface-3)', outline: d === today ? '2px solid var(--text)' : undefined, boxShadow: stats.dates.has(d) ? '0 0 10px var(--accent-glow)' : undefined }} />)}</div>
      </section>

      <section className="card mt-3" aria-label="Quest results">
        <div className="card-title"><h3>Results</h3><span className="chip accent">{stats.completed} completed · +{stats.xp} XP</span></div>
        {history.length === 0 ? <p className="small muted">No quests yet. Take one above and your results appear here.</p> : history.map(([d, e]) => {
          const def = questByCode(e.code); if (!def) return null;
          const finished = !!e.doneAt, open = d === today && !finished && !e.dropped;
          return (
            <div key={d} className="list-row">
              <span className="avatar" style={{ width: 34, height: 34 }}><Icon name={finished ? 'check' : def.icon} size={16} /></span>
              <div className="grow"><b className="small">{def.title}</b><div className="tiny muted">{def.text} · {fmtDate(d, today)}</div></div>
              <span className={`chip ${finished ? 'good' : ''}`}>{finished ? `Completed +${def.xp} XP` : open ? 'In progress' : e.dropped ? 'Dropped' : 'Not this time'}</span>
            </div>);
        })}
      </section>
    </div>
  );
}

function ActiveQuest({ def, today }: { def: QuestDef; today: string }) {
  const st = useStore();
  const prog = questProgress(st, def, today, st.quests?.[today]);
  return (
    <div className="mt-3">
      <div className="row gap-3 wrap" style={{ alignItems: 'flex-start' }}>
        <span className="avatar" style={{ width: 52, height: 52 }}><Icon name={def.icon} size={24} /></span>
        <div className="grow" style={{ minWidth: 220 }}><b className="big">{def.title}</b><p className="muted small">{def.text} · <b className="accent">+{def.xp} XP</b></p>
          <ol className="small mt-2" style={{ paddingLeft: '1.1rem', margin: '0.4rem 0 0', display: 'grid', gap: 3 }}>{def.how.map((h) => <li key={h}>{h}</li>)}</ol></div>
      </div>
      <div className="row between small mt-3"><span><b>{prog.value}/{prog.target}</b> {def.unit}</span><span className="muted">{prog.pct}%</span></div>
      <div className="pbar lg mt-1" role="progressbar" aria-valuenow={prog.value} aria-valuemax={prog.target}><i style={{ width: `${prog.pct}%` }} /></div>
    </div>
  );
}
