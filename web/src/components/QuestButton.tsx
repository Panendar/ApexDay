import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { useStore } from '../store/useStore';
import { useToday } from '../lib/hooks';
import { questByCode, questOfDay, questProgress } from '../lib/quests';

/** Small header button on Today: shows quest state at a glance and opens the Quests page. */
export function QuestButton() {
  const st = useStore();
  const nav = useNavigate();
  const today = useToday();
  const e = st.quests?.[today];
  const def = e?.accepted && !e.dropped ? questByCode(e.code) : undefined;
  const prog = def ? questProgress(st, def, today, e) : null;
  const done = !!e?.doneAt;
  const label = done ? 'Quest done' : prog ? `Quest ${prog.value}/${prog.target}` : 'Take a quest';
  return (
    <button className={`btn ${done ? 'btn-soft' : prog ? '' : 'btn-soft'}`} onClick={() => nav('/app/quests')} title={def ? def.text : `Today’s featured quest: ${questOfDay(today).text}`} aria-label={`Quests: ${label}`}>
      <Icon name={done ? 'check' : 'gift'} size={16} />{label}
      {!done && !prog && <span className="chip accent" style={{ padding: '0 6px' }}>1 new</span>}
    </button>
  );
}
