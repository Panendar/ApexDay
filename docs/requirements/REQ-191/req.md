# User can create a routine and apply it to a date with a preview

## Story
As a user, I can create a named routine of timed tasks with a recurrence and apply it to a date or range after seeing a preview.

## Purpose
Routines make planning a day take seconds.

Serves intent goal: G1

## Behaviour and acceptance criteria
- A routine has a name, timed tasks and a recurrence: daily, chosen weekdays, every N days or by day order
- Applying to a date or range shows a preview before confirming
- A starter library offers College day, Exam week, Deep work, Morning reset, Evening wind-down and Weekend reset
- Conflicts across routines on one day are flagged, never merged silently

## Order
Order: 8 of 70
Group: 1. Foundation
Depends on: User can add a timed task to the day timeline

## Source documents
- docs/project/requirements.md, section(s) 5.1, 6.1
- docs/project/intent.md

## Open questions
- Day-order recurrence depends on the timetable story (37).
