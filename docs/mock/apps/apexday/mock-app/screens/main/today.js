import { pageHead, badge, esc } from '../../shared/components.js?v=1';
import { button } from '../../shared/form.js?v=1';

export const meta = { code: 'S02', name: 'Today', side: 'main', icon: 'check', nav: 'Today', roles: ['student'] };

export function render({ data }) {
  const t = data.today;
  const done = t.dsaDone === 1;
  const shifted = data.shift.applied === 1;
  const list = t.tasks
    .map((x, i) => {
      const isDsa = i === 0;
      const state = isDsa && done ? 'Done' : x.state;
      return `<div class="card" data-toast="${esc(x.title)} card: quick actions (+10 min, +30 min, snooze, move to tomorrow) would show here." style="display:flex;justify-content:space-between;gap:8px;align-items:center${state === 'Done' ? ';background:var(--good-bg)' : ''}">
        <div><strong>${esc(x.time)}</strong> &nbsp; ${esc(x.title)}</div>${badge(state, state === 'Done' ? 'good' : 'neutral')}</div>`;
    })
    .join('');
  const now = done
    ? `<div class="card"><strong>Done. Nice work.</strong><br><small>${esc(t.tasks[0].title)} is complete.</small>
        <div style="margin-top:8px">${button('Undo (5s)', { toast: 'Undo would restore the task within 5 seconds.' })}</div></div>`
    : `<div class="card"><strong>NOW: ${esc(t.tasks[0].title)}</strong><br>${esc(t.timeLeft)} left
        <div style="margin-top:8px">${button('Start (Focus Mode)', { toast: 'Start would open Focus Mode for this task.' })}
        ${button('Complete', { primary: true, action: 'complete-task' })}</div></div>`;
  return `
    ${pageHead(`Today · ${t.dayLabel}`, button('Shift', { action: 'open-shift', goto: 'S03' }))}
    <div class="card"><strong>Day ring ${esc(done ? t.ringDone : t.ringStart)}%</strong> &nbsp; Top 3: ${done ? '[x]' : '[ ]'} [ ] [ ]
      <br><small>Intention: ${esc(t.intention)}</small></div>
    ${shifted ? `<div class="card" style="border-color:var(--good)">${badge('Plan reshuffled', 'good')} ${esc(data.shift.moved)} tasks moved to the next working day, nothing lost.</div>` : ''}
    ${now}
    <div class="card"><strong>Up next</strong><br>${esc(t.tasks[1].time)} ${esc(t.tasks[1].title)}</div>
    ${list}
    <div class="card"><small>Stats: ${esc(t.statsLine)}</small></div>
  `;
}
