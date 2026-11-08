import { pageHead, badge, esc } from '../../shared/components.js?v=1';
import { button } from '../../shared/form.js?v=1';

export const meta = { code: 'S01', name: 'Plan', side: 'main', icon: 'home', nav: 'Plan', roles: ['student'] };

export function render({ data }) {
  const p = data.plan;
  const rows = p.tasks
    .map(
      (t) => `<div class="card" data-toast="${esc(t.title)} would open in the task panel." style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <div><strong>${esc(t.start)}</strong> &nbsp; ${esc(t.title)}<br><small>${esc(t.duration)} · ${esc(t.category)}</small></div>
        ${t.top3 ? badge('Top 3', 'good') : ''}${t.fixed ? badge('Fixed', 'warn') : ''}
      </div>`
    )
    .join('');
  return `
    ${pageHead(`Plan · ${p.dayLabel}`, button('Day', { toast: 'Day timeline view would show.' }) + button('Week', { toast: 'Week board would show.' }) + button('Agenda', { toast: 'Agenda list would show.' }))}
    <div class="card"><strong>Load meter</strong><br>${esc(p.plannedHours)} h planned of ${esc(p.limitHours)} h limit ${badge('Within limit', 'good')}</div>
    ${rows}
    <div class="card"><strong>Inbox</strong><br><small>${esc(p.inboxCount)} unscheduled thoughts</small>
      <div style="margin-top:8px">${button('Quick-add a task', { toast: 'Quick-add would parse text like "DSA 6pm 90m tomorrow" and fill the fields for review.' })}</div></div>
    <div class="card"><small>Planned time is a guide. Overlaps never block saving.</small></div>
    ${button('Lock the day (Start my day)', { primary: true, action: 'lock-day', goto: 'S02' })}
    ${button('Shift', { notDefined: 'The spec lists a Shift button on Today and the calendar, but not on the Plan screen.' })}
  `;
}
