# User can restore deleted tasks from Trash and read a history log

## Story
As a user, I can restore tasks from a 30-day Trash and see a log of history edits.

## Purpose
Deleting must be recoverable.

Serves intent goal: G6

## Behaviour and acceptance criteria
- Deleted tasks go to Trash for 30 days before permanent removal
- A restored task whose date has passed returns as unscheduled to the Inbox with a note
- The history log lists logged history edits

## Order
Order: 19 of 70
Group: 1. Foundation
Depends on: User can add a timed task to the day timeline

## Source documents
- docs/project/requirements.md, section(s) 4, 9.5, 11 #39
- docs/project/intent.md

## Open questions
- None beyond the stack choice recorded in the README (section 2.2).
