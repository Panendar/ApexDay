# User can add tasks by typing natural text

## Story
As a user, I can type text such as "DSA 6pm 90m tomorrow !high #study @exam" and review the filled fields before saving.

## Purpose
Planning must take under 2 minutes; quick-add and the command palette are launch-critical (13.3 risk 4).

Serves intent goal: G1

## Behaviour and acceptance criteria
- "DSA 6pm 90m tomorrow" fills title, time, duration and date for review
- !high, #category, @tag and "every weekday" are understood
- Ctrl/Cmd+K opens a command palette to add a task, jump to a date, apply a routine, search tasks or start a shift
- Nothing is saved until the user confirms the parsed fields

## Order
Order: 3 of 70
Group: 1. Foundation
Depends on: User can add a timed task to the day timeline

## Source documents
- docs/project/requirements.md, section(s) 5.1
- docs/project/intent.md

## Open questions
- The full quick-add grammar beyond the listed tokens is not defined.
