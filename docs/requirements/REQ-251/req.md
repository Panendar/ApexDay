# User can push a day forward or pull it back

## Story
As a user, I can move a day's tasks to the next working day and cascade later days, or close the gap after a cancelled day.

## Purpose
A surprise holiday should not mean retyping a week.

Serves intent goal: G2

## Behaviour and acceptance criteria
- Scope can be today only, this week, until a date or until the routine ends, with the smallest scope as default
- Push skips holiday, exam and rest days unless told otherwise and shows which were skipped
- Pull back closes the gap left by a cancelled day
- Two shifts on the same days are separate batches; undoing the earlier one warns about dependent later shifts
- Undo after the user edited a shifted day reverts only untouched tasks and lists the edited ones

## Order
Order: 31 of 70
Group: 3. Shift engine
Depends on: User can have fixed items protected and see an overflow list

## Source documents
- docs/project/requirements.md, section(s) 6.2, 11 #1, #2, #4, #7, #8
- docs/project/intent.md

## Open questions
- None beyond the stack choice recorded in the README (section 2.2).
