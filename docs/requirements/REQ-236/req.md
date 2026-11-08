# User can install the app and use it offline

## Story
As a user, I can install as a PWA and use all core features without a network.

## Purpose
Offline works for schedules that change anywhere.

Serves intent goal: G5

## Behaviour and acceptance criteria
- Manifest, icons and standalone window make it installable; it also works without install
- A service worker caches the app and a local database holds data
- All core features work offline and edits queue until online
- Today is interactive in under 1.5 s on repeat visits

## Order
Order: 58 of 70
Group: 5. Accounts, sync and data
Depends on: User can add a timed task to the day timeline

## Source documents
- docs/project/requirements.md, section(s) 2.2, 12
- docs/project/intent.md

## Open questions
- None beyond the stack choice recorded in the README (section 2.2).
