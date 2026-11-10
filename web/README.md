# ApexDay web (UI-first)

Plan it. Run it. Shift it. React 18 + Vite + TypeScript, Zustand (persisted to localStorage), Framer Motion, hand-written CSS design system (tokens in `src/styles/base.css`; default palette `#0b0b0c` / `#ffffff` / `#c6f432`, plus 8 more themes).

    npm install
    npm run dev        # http://localhost:5173  (landing at /, app at /app)
    npm run build

## What is built
Landing, first-run onboarding (guest mode), Today (day ring, Top 3, Now card, Needs attention, start nudges, Focus Mode with free/countdown/sprint/Tiny Start, End of Day), Plan (draggable timeline, week board, agenda, Inbox, quick-add parser, load meter, lock day), Calendar (day types, day order), Progress (day/week/month/year/lifetime/subjects), Routines & timetable, Habits & Goals, Achievements & Apex (42 badges), Reviews (weekly ritual, recap, share image), Trash & history, Settings, command palette, keyboard shortcuts, PWA manifest + service worker.

Shift engine (`src/lib/shift.ts`): push, pull, swap, set day order, holiday, shift times, compress, reset my day. Each previews counts, protects fixed items, never drops work, applies as one batch, undoes as one action.

## Decisions / notes
- Stack follows the module registry (React+Vite, Zustand) but styling is custom CSS instead of Chakra, for full control of tokens, themes and motion. Backend (Express/SQLite/Drizzle, JWT) is not wired yet: data is local, sync/accounts/email are UI stubs.
- Insight charts for estimate accuracy and best-time use a demo baseline until real history accumulates.
- Partial-credit weights (0.25 / 0.5, tiers 20% / 50%) default per requirements 5.5; editable in Settings.

## Backend and sync
Run the API in `../server` (`npm run dev`, port 4000); the web dev server proxies `/api` to it. Create an account (unique username + password) or sign in from Settings > Account & data. Guest data migrates to the account; edits sync automatically, queue offline, and merge per field across devices. Synced: profile, settings, categories, goals, habits, inbox, tasks, subtasks, routines (+ their tasks), day plans. Still local-only: habit logs, completions/XP, shift batches, attendance and the timetable (the server tables exist; client mapping is next).
