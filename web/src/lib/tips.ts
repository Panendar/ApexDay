import type { Settings } from './types';

export const TIPS: { text: string; ctx: 'big' | 'boring' | 'tired' | 'slump' | 'missed' | 'general' }[] = [
  { text: "Just open the file — that's the whole task.", ctx: 'general' },
  { text: 'Start with the easiest 5 minutes.', ctx: 'big' },
  { text: 'Put your phone in another room for one round.', ctx: 'general' },
  { text: 'Decide the very first action, in one sentence.', ctx: 'big' },
  { text: 'Eat the frog: do the hardest task first.', ctx: 'big' },
  { text: 'Pair it with something you enjoy — music, tea, a good playlist.', ctx: 'boring' },
  { text: 'Two minutes is a real start. Momentum does the rest.', ctx: 'missed' },
  { text: 'Stand up, drink water, breathe — then one round.', ctx: 'tired' },
  { text: "You don't have to finish. You only have to begin.", ctx: 'missed' },
  { text: 'Shrink the task until it feels almost silly, then do that.', ctx: 'big' },
  { text: 'Boring? Race the timer and beat your last round.', ctx: 'boring' },
  { text: 'A short walk, then start. Your brain warms up moving.', ctx: 'slump' },
  { text: 'Set a 5-minute timer. When it rings, you may stop.', ctx: 'general' },
  { text: 'Write the first sentence badly. Edit later.', ctx: 'big' },
  { text: 'Tidy only your desk, then open the task.', ctx: 'slump' },
  { text: 'Low energy? Pick the lightest task and bank a win.', ctx: 'tired' },
  { text: 'Partial progress counts. 20% is a good start.', ctx: 'missed' },
  { text: 'Tell someone what you are about to do. Then do it.', ctx: 'general' },
];
export const tipFor = (ctx?: string) => {
  const pool = TIPS.filter((t) => !ctx || t.ctx === ctx || t.ctx === 'general');
  return pool[Math.floor(Math.random() * pool.length)].text;
};

const L: Record<string, Record<Settings['tone'], string[]>> = {
  morning: { calm: ['A calm start. One task at a time.', 'Your plan is ready when you are.'], energetic: ['Rise and climb! Your first win is minutes away.', "Let's go — the day is yours."], tough: ["The day won't plan itself. Start the first one.", 'No negotiating. Open the first task.'] },
  behind: { calm: ['Running behind is normal. One Shift fixes it.', 'Breathe. Reset the day and carry on.'], energetic: ['Plot twist! Shift the plan and keep moving.', 'Still plenty of day left — compress and go.'], tough: ['Behind? Cut the fluff and do the next task.', 'Stop apologising to the clock. Start.'] },
  done: { calm: ['Nicely done. Rest a breath.', 'Settled. That counts.'], energetic: ['Boom! Next one!', 'Another one down — feel that momentum.'], tough: ['Good. Next.', 'Done is done. Keep going.'] },
  comeback: { calm: ['Welcome back. A clean day is waiting.', 'No guilt here — just a fresh start.'], energetic: ['You are back! Let us make today count.', 'Comeback mode: ON.'], tough: ['You returned. Now show up today.', 'Yesterday is gone. Today is a task list.'] },
  focus: { calm: ['One thing. Slow and steady.', 'Breathe in, work, breathe out.'], energetic: ['Lock in — you got this!', 'Full focus. Make it count.'], tough: ['No phone. No excuses.', 'Sit. Work. Finish the round.'] },
  shift: { calm: ['Plan reshuffled. Nothing lost.', 'All moved safely. Undo is right there.'], energetic: ['Reshuffled in a flash. Nothing lost!', 'New plan, same you. Go!'], tough: ['Plan adjusted. Now execute it.', 'Shifted. No excuses left.'] },
  perfect: { calm: ['A perfect day. Rest well.', 'Everything done. Be proud.'], energetic: ['PERFECT DAY! Look at that ring!', 'You climbed the whole mountain!'], tough: ['Perfect day. Do it again tomorrow.', 'Good. Repeat.'] },
};
export function line(kind: keyof typeof L, tone: Settings['tone']) {
  const a = L[kind][tone];
  return a[Math.floor(Math.random() * a.length)];
}
export function greeting(h: number) {
  return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
