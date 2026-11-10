import { openDb } from './db.ts';
import { createApp } from './app.ts';
import { purge } from './sync.ts';

const db = openDb();
const app = createApp(db);
const port = Number(process.env.PORT ?? 4000);
const srv = app.listen(port, () => console.log(`ApexDay API on http://localhost:${port}  (db: ${process.env.APEXDAY_DB ?? 'data/apexday.db'})`));
srv.on('error', (e: NodeJS.ErrnoException) => {
  if (e.code === 'EADDRINUSE') console.error(`
Port ${port} is already in use, probably another ApexDay server. Close it, or run on another port:  set PORT=${port + 1} && npm run dev
`);
  else console.error(e);
  process.exit(1);
});
// Nightly housekeeping: 30-day Trash and deferred account deletion.
purge(db);
setInterval(() => { try { purge(db); } catch (e) { console.error('purge failed', e); } }, 6 * 3600_000).unref();
