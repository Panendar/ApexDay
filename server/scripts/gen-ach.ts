import { ACHIEVEMENTS } from '../../web/src/lib/achievements.ts';
import { writeFileSync } from 'node:fs';
const cat: Record<string, string> = { Consistency: 'consistency', Timing: 'timing', Comeback: 'comeback', Focus: 'focus', 'Shifting well': 'shifting', Habits: 'habits', Goals: 'goals', Attendance: 'attendance', Mastery: 'mastery' };
writeFileSync(new URL('../src/achievements.json', import.meta.url), JSON.stringify(ACHIEVEMENTS.map((a) => ({ code: a.code.replace(/-/g, '_'), name: a.name, description: a.desc, category: cat[a.group] })), null, 1));
console.log(ACHIEVEMENTS.length);
