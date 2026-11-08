# User can watch the Apex visual grow

## Story
As a user, I can see a mountain peak that advances at streak milestones and changes with daily completion.

## Purpose
A signature visual makes discipline visible without punishing.

Serves intent goal: G3

## Behaviour and acceptance criteria
- Default is a mountain peak with a flag; alternatives are tree, flame, city skyline, constellation
- It advances at streak milestones 3, 7, 14, 30, 60, 100, 200, 365
- A missed day pauses growth and dims it but never destroys it
- It appears in the Today header and as a hero in Progress; each stage is under 300 KB and lazy-loaded

## Order
Order: 51 of 70
Group: 4. Progress and motivation
Depends on: User can keep a fair streak with freezes

## Source documents
- docs/project/requirements.md, section(s) 8.2, 8.5
- docs/project/intent.md

## Open questions
- None beyond the stack choice recorded in the README (section 2.2).
