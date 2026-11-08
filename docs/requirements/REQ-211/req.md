# User can preview, apply and undo a shift as one batch

## Story
As a user, I can mark a holiday or move or skip a task, see a before-and-after preview and undo it as one action.

## Purpose
The shift engine is the reason ApexDay exists.

Serves intent goal: G2

## Behaviour and acceptance criteria
- Every shift shows a before and after preview with counts: tasks moved, skipped, overflowed and fixed items protected
- A shift is stored as overrides under one ShiftBatch; the routine is unchanged; Undo removes them
- Mark holiday asks what to do with its tasks
- Move or skip a single task works with Undo
- A shift never rewrites the past, and undo stays available at least 30 seconds then in history
- No task is lost or duplicated, shown by a randomised test of at least 100 cases

## Order
Order: 29 of 70
Group: 3. Shift engine
Depends on: User can create a routine and apply it to a date with a preview

## Source documents
- docs/project/requirements.md, section(s) 6.2, 12
- docs/project/intent.md

## Open questions
- The Shift dialog entry points (button, S key, right-click) are in 6.4; whether they come with this story is assumed yes.
