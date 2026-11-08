# User can track habits with habit streaks

## Story
As a user, I can create untimed habits, log them and see per-habit streaks.

## Purpose
Habits keep discipline outside the timeline.

Serves intent goal: G3

## Behaviour and acceptance criteria
- A habit has name, cadence (daily, weekdays, n-per-week), target and unit
- Logging is append-only; a habit may optionally be scheduled as a task
- A habit logged on a holiday counts as a bonus; a missed habit on a holiday is neutral and paused habits never break a streak

## Order
Order: 41 of 70
Group: 4. Progress and motivation
Depends on: User can keep a fair streak with freezes

## Source documents
- docs/project/requirements.md, section(s) 4, 7, 11 #37, 13.4
- docs/project/intent.md

## Open questions
- None beyond the stack choice recorded in the README (section 2.2).
