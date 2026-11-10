// One command to run API + web. Picks free ports so a leftover process can never break startup.
import { spawn, execSync } from 'node:child_process';
import net from 'node:net';

// A port counts as taken if anything answers on IPv4 or IPv6 localhost, or if we cannot bind it.
const answers = (port, host) => new Promise((res) => { const c = net.connect({ port, host, timeout: 400 }); c.once('connect', () => { c.destroy(); res(true); }); c.once('timeout', () => { c.destroy(); res(false); }); c.once('error', () => res(false)); });
const canBind = (port) => new Promise((res) => { const s = net.createServer(); s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port); });
const free = async (start) => { for (let p = start; p < start + 50; p++) if (!(await answers(p, '127.0.0.1')) && !(await answers(p, '::1')) && (await canBind(p))) return p; throw new Error('no free port'); };
const api = await free(Number(process.env.PORT ?? 4000));
const web = await free(5173);
const kids = [];
const run = (name, color, cmd, env) => {
  const c = spawn(cmd, { shell: true, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  const tag = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (s) => s.on('data', (d) => String(d).split(/\r?\n/).filter((l) => l.trim() && !/Port \d+ is in use/.test(l)).forEach((l) => console.log(tag + l)));
  pipe(c.stdout); pipe(c.stderr);
  c.on('exit', (code) => { if (code) { console.log(`${tag}stopped (exit ${code})`); stop(1); } });
  kids.push(c);
};
const stop = (code = 0) => {
  for (const c of kids) { try { if (process.platform === 'win32') execSync(`taskkill /pid ${c.pid} /T /F`, { stdio: 'ignore' }); else c.kill('SIGTERM'); } catch { /* already gone */ } }
  process.exit(code);
};
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());

run('api', '33', 'npm run dev --prefix server', { PORT: String(api) });
run('web', '36', `npm run dev --prefix web -- --port ${web} --strictPort`, { VITE_API_PROXY: `http://localhost:${api}` });
setTimeout(() => console.log(`\n  \x1b[1mApexDay is running\x1b[0m\n  Open the app:  \x1b[32mhttp://localhost:${web}\x1b[0m\n  API + SQLite:  http://localhost:${api}/api/health\n  Press Ctrl+C to stop both.\n`), 3500);
