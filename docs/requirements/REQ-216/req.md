# College student can define a day-order timetable and re-align later dates

## Story
As a college student, I can define a weekly or Day 1-N cycle with timed class slots and click Today is Day Order X to re-align every later date after a preview.

## Purpose
Colleges change the day order unexpectedly and personal tasks must stay put.

Serves intent goal: G2

## Behaviour and acceptance criteria
- A cycle is weekly (Mon-Sat) or day order (N from 2 to 10) with class slots (subject, start, end, room, teacher)
- By default the order advances one position per working day; Today is Day Order X re-aligns later dates after a preview
- When the order changes classes swap in, personal tasks stay, and study blocks flagged around classes re-fit free gaps
- A holiday or special day is handled by the same action

## Order
Order: 37 of 70
Group: 3. Shift engine
Depends on: User can push a day forward or pull it back

## Source documents
- docs/project/requirements.md, section(s) 6.3, 11 #3
- docs/project/intent.md

## Open questions
- None beyond the stack choice recorded in the README (section 2.2).
