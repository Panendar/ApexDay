import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { QuickAddBar } from './QuickAdd';
import { useUI } from '../store/useUI';

/** The whole product loop in one card: add -> run -> shift. Shown when today is empty. */
export function Workflow({ date }: { date: string }) {
  const nav = useNavigate();
  const ui = useUI.getState();
  const steps = [
    { icon: 'plus', t: 'Add tasks', d: 'Type naturally in the box below (for example “Read ch.4 3pm 45m”), or press N. No time given? We pick the next free slot, never one that has already passed.' },
    { icon: 'play', t: 'Run the day', d: 'Press Start for Focus Mode, or tick a task done. Even 20% of the time counts as progress. Late tasks wait in “Needs attention”: nothing is ever lost.' },
    { icon: 'shift', t: 'Shift when life changes', d: 'Holiday, overrun, bad morning? Press Shift or Reset my day. You always see a preview first, and Undo is one click.' },
    { icon: 'repeat', t: 'Automate with a routine', d: 'Make a routine (for example Daily 06:30 Stretch) and it schedules itself for the next two weeks.' },
  ];
  return (
    <section className="card reveal" aria-label="How ApexDay works">
      <div className="row between wrap gap-2"><div><h2>Plan your day in four steps</h2><p className="muted small mt-1">Today is empty. Start with one task; everything else follows.</p></div></div>
      <div className="mt-3"><QuickAddBar date={date} placeholder="Add your first task: Read ch.4 3pm 45m" /></div>
      <ol className="grid-2 mt-4" style={{ listStyle: 'none', padding: 0, margin: '1.25rem 0 0' }}>
        {steps.map((s, i) => (
          <li key={s.t} className="row gap-3" style={{ alignItems: 'flex-start' }}>
            <span className="avatar" style={{ flex: 'none' }}><Icon name={s.icon} /></span>
            <div><b>{i + 1}. {s.t}</b><p className="small muted mt-1">{s.d}</p></div>
          </li>))}
      </ol>
      <div className="row wrap gap-2 mt-4">
        <button className="btn btn-primary" onClick={() => ui.openEditor({ defaults: { date } })}><Icon name="plus" size={16} />New task</button>
        <button className="btn" onClick={() => nav('/app/routines')}><Icon name="repeat" size={16} />Create a routine</button>
        <button className="btn" onClick={() => nav('/app/plan')}><Icon name="plan" size={16} />Open planner</button>
        <button className="btn btn-ghost" onClick={() => ui.setShortcuts(true)}><Icon name="command" size={16} />Shortcuts</button>
      </div>
    </section>
  );
}
