# User can resolve overdue tasks in Needs attention

## Story
As a user, I can see tasks past their end time in Needs attention (never "failed") and choose what to do.

## Purpose
Missing a time must not feel like failure.

Serves intent goal: G2

## Behaviour and acceptance criteria
- A task past its end time moves to Needs attention
- Choices are: done late, move later today, move to tomorrow, skip with a reason
- Nothing moves without the user's action
- A task completed after the day was sealed is allowed in a 24-hour grace window and marked late

## Order
Order: 15 of 70
Group: 1. Foundation
Depends on: User can see Today with a Now card, Up next and a day ring

## Source documents
- docs/project/requirements.md, section(s) 5.2, 11 #13
- docs/project/intent.md

## Open questions
- None beyond the stack choice recorded in the README (section 2.2).
