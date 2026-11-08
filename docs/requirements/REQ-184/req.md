# User can add a timed task to the day timeline

## Story
As a user, I can add a task with a title, start time and duration to any day and see it on a vertical timeline.

## Purpose
Planning a day starts with timed tasks; this is the base of the whole product, stored locally so it works offline.

Serves intent goal: G1

## Behaviour and acceptance criteria
- A task with title, start time and duration is added in under 5 seconds and appears on the timeline
- A task can carry category, tags, priority, energy, notes, subtasks, links, a fixed flag and an optional reminder
- Task data survives closing and reopening the browser without a network
- Times are stored as local wall-clock plus IANA time zone; a task crossing midnight belongs to the day it starts in

## Order
Order: 1 of 70
Group: 1. Foundation
Depends on: none

## Source documents
- docs/project/requirements.md, section(s) 1, 4, 5.1, 13.5
- docs/project/intent.md

## Open questions
- Which framework, animation library and database? (Section 2.2: the team chooses and records it in the README.)
