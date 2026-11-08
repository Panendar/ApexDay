# User can get a calm Start nudge when a task has not started

## Story
As a user, I can see a non-blocking card with Start now, Tiny Start, Break it down, Move later or Not today.

## Purpose
Most plans fail at the start, not in the middle.

Serves intent goal: G4

## Behaviour and acceptance criteria
- A nudge appears once the start time has passed by a user-set delay (default 5 minutes) with no timer started
- It offers Start now, Tiny Start, Break it down, Move later, Not today and shows one tip
- At most one nudge per task, a daily cap (default 5), quiet hours respected, and it can be turned off globally or per category
- After two dismissals of the same kind, that style is muted
- It never uses guilt language and never mentions streaks

## Order
Order: 25 of 70
Group: 2. Start support
Depends on: User can start a task with a Tiny Start; User can break a task into small subtasks

## Source documents
- docs/project/requirements.md, section(s) 5.5 A, 11 #41
- docs/project/intent.md

## Open questions
- None beyond the stack choice recorded in the README (section 2.2).
