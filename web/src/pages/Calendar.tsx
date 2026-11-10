import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHead } from '../components/Bits';
import { useStore, dayTypeOf, orderFor, summaryFor, tasksOn } from '../store/useStore';
import { useUI } from '../store/useUI';
import { useToday } from '../lib/hooks';
import { isActive } from '../lib/progress';
import { addDays, DOW, dow, fmtDur, fmtLong, MONTHS, parseISO, iso } from '../lib/time';

export default function Calendar() {
  const st = useStore();
  const today = useToday();
  const nav = useNavigate();
  const ui = useUI.getState();
  const [cursor, setCursor] = useState(today.slice(0, 7));
  const [sel, setSel] = useState(today);
  const [y, m] = cursor.split('-').map(Number);
  const first = `${cursor}-01`;
  const days = useMemo(() => { const n = new Date(y, m, 0).getDate(); const lead = (dow(first) - st.settings.weekStart + 7) % 7; return [...Array.from({ length: lead }, (_, i) => addDays(first, i - lead)), ...Array.from({ length: n }, (_, i) => addDays(first, i))]; }, [cursor, st.settings.weekStart]); // eslint-disable-line
  const go = (d: number) => { const x = new Date(y, m - 1 + d, 1); setCursor(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`); };

  useEffect(() => {
    const k = (e: KeyboardEvent) => { const t = e.target as HTMLElement; if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || useUI.getState().editor || useUI.getState().shift.open) return;
      if (e.key === 'ArrowLeft') setSel((s) => addDays(s, -1)); if (e.key === 'ArrowRight') setSel((s) => addDays(s, 1)); if (e.key === 'ArrowUp') setSel((s) => addDays(s, -7)); if (e.key === 'ArrowDown') setSel((s) => addDays(s, 7)); };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, []);
  useEffect(() => { if (sel.slice(0, 7) !== cursor) setCursor(sel.slice(0, 7)); }, [sel]); // eslint-disable-line

  const selTasks = tasksOn(st, sel).filter(isActive);
  const selType = dayTypeOf(st, sel);
  const selOrder = orderFor(st, sel);
  const upcoming = Object.entries(st.dayTypes).filter(([d, t]) => d >= today && t !== 'normal').sort(([a], [b]) => a.localeCompare(b));

  const exportICS = () => {
    const stamp = (d: string, t: string) => d.replace(/-/g, '') + 'T' + t.replace(':', '') + '00';
    const ev = st.tasks.filter((t) => !t.deletedAt && t.status !== 'moved' && t.date >= today).map((t) => `BEGIN:VEVENT\nUID:${t.id}@apexday\nDTSTART:${stamp(t.date, t.start)}\nDTEND:${stamp(t.date, `${String(Math.floor((parseInt(t.start) * 60 + parseInt(t.start.slice(3)) + t.dur) / 60) % 24).padStart(2, '0')}:${String((parseInt(t.start.slice(3)) + t.dur) % 60).padStart(2, '0')}`)}\nSUMMARY:${t.title}\nEND:VEVENT`).join('\n');
    const blob = new Blob([`BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ApexDay//EN\n${ev}\nEND:VCALENDAR`], { type: 'text/calendar' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'apexday.ics'; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="page">
      <PageHead eyebrow="Calendar" title={`${MONTHS[m - 1]} ${y}`}>
        <div className="row gap-1"><button className="btn btn-icon" onClick={() => go(-1)} aria-label="Previous month"><Icon name="chevL" /></button><button className="btn" onClick={() => { setCursor(today.slice(0, 7)); setSel(today); }}>Today</button><button className="btn btn-icon" onClick={() => go(1)} aria-label="Next month"><Icon name="chevR" /></button></div>
        <button className="btn" onClick={exportICS}><Icon name="download" size={16} />ICS</button>
      </PageHead>
      <div className="layout-3">
        <section className="card">
          <div className="cal" role="grid" aria-label="Month">
            {Array.from({ length: 7 }, (_, i) => <div key={i} className="cal-head">{DOW[(i + st.settings.weekStart) % 7]}</div>)}
            {days.map((d) => {
              const t = dayTypeOf(st, d), o = orderFor(st, d), s = summaryFor(st, d);
              const out = d.slice(0, 7) !== cursor;
              return (
                <button key={d} role="gridcell" className={`cal-day${out ? ' out' : ''}${d === today ? ' today' : ''}${d === sel ? ' sel' : ''}${t === 'holiday' || t === 'exam' ? ' holiday' : ''}`} onClick={() => setSel(d)} onDoubleClick={() => { ui.setViewDate(d === today ? null : d); nav('/app/plan'); }} aria-label={`${fmtLong(d)}${o ? `, day order ${o}` : ''}${t !== 'normal' && t !== 'day_order' ? `, ${t}` : ''}${s && !s.kind ? `, ${s.pct}% complete` : ''}`}>
                  <span className="tint" style={{ ['--o' as string]: s && !s.kind && d <= today ? Math.min(0.5, (s.pct / 100) * 0.5) : 0 }} />
                  <span className="n">{Number(d.slice(8))}</span>
                  {t === 'holiday' ? <span className="tag" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>Holiday</span> : t === 'exam' ? <span className="tag" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>Exam</span> : o ? <span className="tag">DO {o}</span> : null}
                  {st.frozen.includes(d) && <span style={{ position: 'absolute', right: 6, top: 6, color: 'var(--info)' }} title="Streak freeze"><Icon name="shield" size={14} /></span>}
                </button>);
            })}
          </div>
          <div className="row wrap gap-3 small muted mt-3"><span className="row gap-1"><i className="dot" />completion tint</span><span className="row gap-1"><Icon name="layers" size={14} />DO = Day Order</span><span className="row gap-1"><Icon name="shield" size={14} />freeze</span><span>Double-click a day to plan it</span></div>
        </section>

        <aside className="side-col">
          <section className="card">
            <div className="card-title"><h3>{fmtLong(sel)}</h3>{selType !== 'normal' && <span className="chip info">{selType.replace('_', ' ')}</span>}</div>
            <div className="row wrap gap-2">{selOrder && <span className="chip accent">Day Order {selOrder}</span>}<span className="chip">{selTasks.length} tasks · {fmtDur(selTasks.reduce((a, t) => a + t.dur, 0))}</span></div>
            <div className="col gap-1 mt-3" style={{ maxHeight: 220, overflowY: 'auto' }}>{selTasks.slice(0, 8).map((t) => <div key={t.id} className="small row gap-2"><span className="tnum muted">{t.start}</span><span className="ellipsis">{t.title}</span></div>)}{selTasks.length === 0 && <p className="small muted">Unplanned, not failed.</p>}</div>
            <hr className="divider" />
            <div className="col gap-2">
              <button className="btn" onClick={() => { ui.setViewDate(sel === today ? null : sel); nav('/app/plan'); }}><Icon name="plan" size={16} />Open in planner</button>
              {sel >= today && selType !== 'holiday' && <button className="btn" onClick={() => ui.openShift('holiday', sel)}><Icon name="flag" size={16} />Mark as holiday…</button>}
              {sel >= today && selType === 'holiday' && <button className="btn" onClick={() => ui.openShift('pull', sel)}><Icon name="chevL" size={16} />Cancel holiday…</button>}
              {sel >= today && <button className="btn" onClick={() => ui.openShift('dayOrder', sel)}><Icon name="layers" size={16} />Today is Day Order…</button>}
              {sel >= today && <button className="btn btn-primary" onClick={() => ui.openShift('push', sel)}><Icon name="shift" size={16} />Shift from this day</button>}
              {sel < today && selType === 'normal' && !st.frozen.includes(sel) && <button className="btn" onClick={() => { const ok = st.useFreeze(sel); ui.toast(ok ? 'Streak freeze applied to this day.' : 'No freezes left this month.', { kind: ok ? 'good' : 'warn' }); }}><Icon name="shield" size={16} />Use a streak freeze</button>}
            </div>
          </section>
          <section className="card"><div className="card-title"><h3>Day types ahead</h3></div>
            {upcoming.length === 0 ? <p className="small muted">No holidays or exam days scheduled.</p> : upcoming.map(([d, t]) => <div key={d} className="list-row"><span className="chip info">{t.replace('_', ' ')}</span><span className="grow small">{fmtLong(d)}</span><button className="btn btn-ghost btn-sm" onClick={() => setSel(d)}>View</button></div>)}
            <button className="btn btn-ghost btn-sm mt-2" onClick={() => { const d = iso(parseISO(addDays(today, 6))); const lab = 'Exam'; st.set({}); useStore.setState((s) => ({ dayTypes: { ...s.dayTypes, [d]: 'exam' }, dayLabels: { ...s.dayLabels, [d]: lab } })); ui.toast('Added an exam day next week. Streak is neutral on exam days.', { kind: 'good' }); }}><Icon name="plus" size={14} />Add sample exam day</button>
          </section>
        </aside>
      </div>
    </div>
  );
}
