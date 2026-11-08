# User can shift times and compress the rest of today

## Story
As a user, I can move remaining tasks by plus or minus N minutes, or fit them into the time left by shortening durations.

## Purpose
A class starting late or a lost morning should not break the day.

Serves intent goal: G2

## Behaviour and acceptance criteria
- Shift times moves remaining tasks by +/- N minutes with a preview
- Compress the rest shortens durations proportionally to fit the time left
- Fixed items do not move and the preview shows counts
- Both are undoable as one batch

## Order
Order: 33 of 70
Group: 3. Shift engine
Depends on: User can have fixed items protected and see an overflow list

## Source documents
- docs/project/requirements.md, section(s) 6.2
- docs/project/intent.md

## Open questions
- Minimum duration a task may be compressed to is not specified.
