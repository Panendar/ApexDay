# User can search and filter all tasks on this device

## Story
As a user, I can search titles, notes, tags and history and filter by category, tag, priority, status and goal.

## Purpose
Finding past and future tasks quickly keeps the planner useful.

Serves intent goal: G1

## Behaviour and acceptance criteria
- Search opens with / or the palette and covers titles, notes, tags and history
- Filters exist for category, tag, priority, status and goal
- Search runs on-device and never on the server, returning in under 150 ms for 50,000 tasks

## Order
Order: 12 of 70
Group: 1. Foundation
Depends on: User can add a timed task to the day timeline

## Source documents
- docs/project/requirements.md, section(s) 5.1, 12
- docs/project/intent.md

## Open questions
- The goal filter needs Goals (42); it appears once goals exist.
