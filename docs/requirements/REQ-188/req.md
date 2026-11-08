# User can see overlap warnings and a load meter

## Story
As a user, I can see an amber warning when tasks overlap, with fixes, and a meter of planned versus free minutes.

## Purpose
Overlaps and overloaded days should be visible without blocking the plan.

Serves intent goal: G1

## Behaviour and acceptance criteria
- Overlapping tasks show an amber warning offering shift later, shorten or keep both
- Overlaps never block saving
- The load meter shows planned versus free minutes and warns above a configurable limit (default 14 hours)
- Overload suggests moving the lowest-priority tasks and can be ignored

## Order
Order: 5 of 70
Group: 1. Foundation
Depends on: User can add a timed task to the day timeline

## Source documents
- docs/project/requirements.md, section(s) 5.1, 11 #20
- docs/project/intent.md

## Open questions
- None beyond the stack choice recorded in the README (section 2.2).
