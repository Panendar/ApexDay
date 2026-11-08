# User can see progress by day, week, month, year and lifetime

## Story
As a user, I can open Progress and see done versus planned, time on task and trends in one visual language.

## Purpose
Visible progress keeps people coming back.

Serves intent goal: G3

## Behaviour and acceptance criteria
- Views exist for today, week, month, year and lifetime, with the visuals listed in Section 7 (day ring, bars, heatmap, trend line, level card)
- Completion rate is defined once in code and shown in a help tooltip, including partial credit weights
- Every chart has hover/click inspect, a keyboard path, a text summary and an empty state
- A range selector and category filter apply across charts; any chart renders in under 500 ms for a year of data
- Results match a hand-calculated test dataset

## Order
Order: 39 of 70
Group: 4. Progress and motivation
Depends on: User can complete a task in one click with Undo and a short animation

## Source documents
- docs/project/requirements.md, section(s) 7
- docs/project/intent.md

## Open questions
- Subjects, Habits and Goals views are added by stories 38, 41 and 42.
