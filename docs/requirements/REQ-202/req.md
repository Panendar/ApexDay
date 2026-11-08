# User can set a task's time window and run a timer inside it

## Story
As a user, I can set from-to times and run a free, countdown or sprint timer, starting early, late or on time.

## Purpose
Planned time is a guide, never a lock.

Serves intent goal: G4

## Behaviour and acceptance criteria
- Each task has a from-to window and a timer: free (count up), countdown (to planned end) or sprint (work + break)
- Sprint presets are 5+2, 10+2, 25+5, 50+10 and custom; the last-used mode is remembered per category
- Elapsed time is shown against planned duration; the timer can start early, late or on time
- A timer past the end keeps counting labelled "overtime", progress caps at 100%, and the user is asked at the end

## Order
Order: 21 of 70
Group: 2. Start support
Depends on: User can see Today with a Now card, Up next and a day ring

## Source documents
- docs/project/requirements.md, section(s) 5.2, 11 #40
- docs/project/intent.md

## Open questions
- None beyond the stack choice recorded in the README (section 2.2).
