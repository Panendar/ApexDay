# User can receive in-tab alerts and web push

## Story
As a user, I can get alerts for task start, ending and needs attention, rescheduled after every shift.

## Purpose
Reminders support the plan.

Serves intent goal: G1

## Behaviour and acceptance criteria
- In-tab alerts and a title badge are always available while a tab is open
- Web Push works when the tab is closed after permission; Safari needs the installed web app and the app explains status plainly
- All reminders reschedule after every shift
- Permission is asked only after the first completed task; if denied, in-tab alerts remain with a banner

## Order
Order: 59 of 70
Group: 5. Accounts, sync and data
Depends on: User can preview, apply and undo a shift as one batch

## Source documents
- docs/project/requirements.md, section(s) 10.2, 2.3, 5.4, 11 #24
- docs/project/intent.md

## Open questions
- None beyond the stack choice recorded in the README (section 2.2).
