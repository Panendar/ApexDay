# User can complete a task in one click with Undo and a short animation

## Story
As a user, I can complete the selected task with a click or Space, see a short animation and undo it within 5 seconds.

## Purpose
One-click completion with honest feedback is the core loop.

Serves intent goal: G1

## Behaviour and acceptance criteria
- A click or Space completes the selected task and feedback shows within 100 ms
- A 5-second Undo appears; un-completing removes XP and recalculates the streak
- The next task can be completed while the animation plays
- Reduced motion replaces movement with fades and colour changes

## Order
Order: 14 of 70
Group: 1. Foundation
Depends on: User can see Today with a Now card, Up next and a day ring

## Source documents
- docs/project/requirements.md, section(s) 5.2, 8.1, 11 #14
- docs/project/intent.md

## Open questions
- Streak recalculation depends on streaks (40); until then only completion is undone.
