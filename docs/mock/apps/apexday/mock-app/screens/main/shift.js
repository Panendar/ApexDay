import { pageHead, badge, esc } from '../../shared/components.js?v=1';
import { button, select, radios } from '../../shared/form.js?v=1';

export const meta = { code: 'S03', name: 'Shift dialog', side: 'main', icon: 'activity', nav: 'Shift', roles: ['student'] };

export function render({ data }) {
  const s = data.shift;
  if (s.applied === 1) {
    return `${pageHead('Shift applied')}
      <div class="card" style="border-color:var(--good)"><strong>Plan reshuffled. ${esc(s.moved)} tasks moved, nothing lost.</strong>
        <div style="margin-top:8px">${button('Undo', { action: 'undo-shift' })} ${button('Back to Today', { primary: true, action: 'back-today', goto: 'S02' })}</div></div>
      <div class="card"><small>The whole shift was stored as one batch, so Undo removes it in one step. The routine itself is unchanged.</small></div>`;
  }
  return `${pageHead(`Shift: ${s.operation} · ${s.dateLabel}`)}
    ${select('Operation', ['Mark holiday', 'Push day forward', 'Pull back', 'Swap days', 'Set day order', 'Shift times', 'Compress the rest', 'Reset my day'], s.operation, { toast: 'Choosing an operation would rebuild the preview.' })}
    ${radios('Scope', 'scope', ['Today only', 'This week', 'Until a date', 'Until routine ends'], s.scope, { toast: 'Scope would update the preview.' })}
    <div class="card"><strong>Before → After</strong><br><small>Before: ${esc(s.before)}<br>After: ${esc(s.after)}</small></div>
    <div class="card">${badge(`Moved ${s.moved}`, 'good')} ${badge(`Skipped ${s.skipped}`)} ${badge(`Overflow ${s.overflow}`)} ${badge(`Fixed ${s.fixed}`, 'warn')}
      <br><small>Fixed items do not shift. Days before today are untouched.</small></div>
    ${button('Cancel', { action: 'cancel-shift', goto: 'S02' })} ${button('Apply', { primary: true, action: 'apply-shift' })}
    ${button('Overflow choices', { notDefined: 'The spec says tasks that do not fit appear in an overflow list with choices, but does not list the choices.' })}`;
}
