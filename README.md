# ApexDay

Plan it. Run it. Shift it. Web app (`web/`, React + Vite) + API (`server/`, Express + SQLite).

## Run (one command)

    npm run setup     # once: installs root, server and web dependencies
    npm run dev       # starts API + web on the first free ports and prints the URL to open

Open the "Open the app" URL it prints (usually http://localhost:5173). If a port is busy it picks the next free one, so a leftover server can no longer break startup. Ctrl+C stops both. `npm start` builds the web app and serves everything from the API on http://localhost:4000 (single process).

## Use it
1. Landing page or Settings > Account & data: **Create account** with a unique username and a password (8+ characters), or **Sign in** on another device. Guest mode still works without an account; local tasks and routines move into the account when you sign up.
2. Onboarding: pick a goal and theme, add your first tasks. Leave "load a sample week" unticked for an empty start.
3. Plan: quick-add ("Chem lab 5pm 90m !high #study"), drag on the timeline, edit in the side panel.
4. Routines: create a routine (for example Daily 06:30 Stretch), Save. It schedules the next 14 days and keeps topping up as days pass.
5. Everything is stored in SQLite (`server/data/apexday.db`) and also cached on the device, so it works offline and syncs when you are back. Sign in on another browser and your plan is restored.

Tests: `npm test` (API, 10 tests). More in `server/README.md` and `web/README.md`.
