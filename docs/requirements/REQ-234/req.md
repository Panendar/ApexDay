# User can sync across devices including offline edits

## Story
As a user, I can see the same data on every browser and device, with offline edits merged.

## Purpose
Multi-device use is expected.

Serves intent goal: G5

## Behaviour and acceptance criteria
- Data syncs across browsers and devices; each field carries a timestamp, conflicts resolve last-writer-wins per field, completions merge by union
- Two devices stay consistent through offline edits and sync resumes automatically
- A completion in one tab updates another within a second
- Cloud restore on a new device shows a preview before overwrite

## Order
Order: 57 of 70
Group: 5. Accounts, sync and data
Depends on: User can use guest mode and then sign in without losing data; Developer can merge edits from two offline copies without losing data

## Source documents
- docs/project/requirements.md, section(s) 10.1, 11 #16, #27, #30, 13.2
- docs/project/intent.md

## Open questions
- None beyond the stack choice recorded in the README (section 2.2).
