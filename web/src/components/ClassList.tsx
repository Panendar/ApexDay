import { Icon } from './Icon';
import { useStore, orderFor } from '../store/useStore';
import { fmtTime } from '../lib/time';

/** Classes for a date from the day-order timetable, with attendance. Cancelled classes free their time. */
export function ClassList({ date }: { date: string }) {
  const st = useStore();
  const order = orderFor(st, date);
  const slots = order ? st.slots.filter((s) => s.order === order) : [];
  if (!order || slots.length === 0) return null;
  const sub = (name: string) => st.subjects.find((x) => x.name === name);
  return (
    <section className="card">
      <div className="card-title"><h3>Classes</h3><span className="chip info">Day Order {order}</span></div>
      <div className="col gap-1">
        {slots.map((s) => {
          const a = st.attendance.find((x) => x.slotId === s.id && x.date === date)?.status;
          const sj = sub(s.subject);
          return (
            <div key={s.id} className="list-row" style={{ padding: '0.55rem 0', opacity: a === 'cancelled' ? 0.5 : 1 }}>
              <div className="avatar" style={{ ['--c' as string]: sj?.color, width: 32, height: 32, borderRadius: 10 }}><Icon name="cap" size={16} /></div>
              <div className="grow" style={{ minWidth: 0 }}><div className="small ellipsis" style={{ fontWeight: 600, textDecoration: a === 'cancelled' ? 'line-through' : 'none' }}>{s.subject}</div><div className="tiny muted">{fmtTime(s.start, st.settings.hour12)}–{fmtTime(s.end, st.settings.hour12)} · {s.room}</div></div>
              <div className="row gap-1">
                {(['attended', 'absent', 'cancelled'] as const).map((k) => (
                  <button key={k} className={`btn btn-icon btn-sm ${a === k ? (k === 'attended' ? 'btn-primary' : k === 'absent' ? 'btn-danger' : 'btn-soft') : 'btn-ghost'}`} aria-pressed={a === k} aria-label={`${k}: ${s.subject}`} title={k} onClick={() => st.markAttendance(s.id, date, k)}>
                    <Icon name={k === 'attended' ? 'check' : k === 'absent' ? 'x' : 'minus'} size={14} /></button>))}
              </div>
            </div>);
        })}
      </div>
    </section>
  );
}
