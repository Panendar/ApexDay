# Developer can merge edits from two offline copies without losing data

## Story
As a user, I can run a data layer where every field has a timestamp, tasks resolve last-writer-wins per field, and completions merge by union.

## Purpose
Offline-first with accounts is the hardest engineering piece and the document says to prototype it in Phase 1 data design, not Phase 4 (13.3 risk 7).

Serves intent goal: G6

## Behaviour and acceptance criteria
- Two copies of the same data edited offline merge with per-field last-writer-wins
- Completion and HabitLog rows merge by union so no completion is lost
- A randomised test of concurrent edits ends with no task lost or duplicated
- Conflicts are written to a conflict log

## Order
Order: 2 of 70
Group: 1. Foundation
Depends on: User can add a timed task to the day timeline

## Source documents
- docs/project/requirements.md, section(s) 10.1, 11 #16, 13.3 risk 7
- docs/project/intent.md

## Open questions
- Conflict log format and where the user sees it are not specified.
