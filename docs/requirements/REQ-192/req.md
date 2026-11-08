# User can edit a routine for this day, future days or all days

## Story
As a user, I can choose the scope of a routine edit.

## Purpose
Real schedules change; edits must not rewrite the past.

Serves intent goal: G1

## Behaviour and acceptance criteria
- Editing a routine asks: this day only, this and future days, or all days
- Past completion records never change
- Deleting a routine with history is a soft delete: future instances removed, history kept in charts

## Order
Order: 9 of 70
Group: 1. Foundation
Depends on: User can create a routine and apply it to a date with a preview

## Source documents
- docs/project/requirements.md, section(s) 6.1, 11 #18, #19
- docs/project/intent.md

## Open questions
- None beyond the stack choice recorded in the README (section 2.2).
