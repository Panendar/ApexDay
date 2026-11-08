# User can start a task with a Tiny Start

## Story
As a user, I can start with just 2 minutes, or a 5 minute round then a 2 minute break, and choose another round, keep going or stop.

## Purpose
If a person cannot finish a task, they should do some of it.

Serves intent goal: G4

## Behaviour and acceptance criteria
- Tiny Start runs 5 minutes of work then a 2-minute break with a gentle prompt, then offers another round, keep going or stop
- Just 2 minutes can be chosen first; after each round the app offers a step up (5, 10, 25) but never forces it
- Work and break lengths are editable (defaults 5 and 2)
- Every round is a real FocusSession and counts toward progress
- Tiny Start is hidden for tasks under 10 minutes

## Order
Order: 23 of 70
Group: 2. Start support
Depends on: User can set a task's time window and run a timer inside it

## Source documents
- docs/project/requirements.md, section(s) 5.5 B, 11 #42, #43
- docs/project/intent.md

## Open questions
- None beyond the stack choice recorded in the README (section 2.2).
