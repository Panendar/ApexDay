# Gaps: plan-and-shift

1. **No screen codes.** The spec lists 12 screens (requirements 9.5) but gives them no codes. The mock uses S01 Plan, S02 Today, S03 Shift dialog. Shows: these codes.
2. **Shift button on Plan.** Section 6.4 puts Shift on Today, the calendar and the task menu, not on Plan. The Plan screen's Shift button shows a "Not defined" alert.
3. **Overflow choices.** Section 6.2 says tasks that do not fit go to an overflow list "with choices" but does not name them. The Shift dialog's "Overflow choices" button shows a "Not defined" alert (the sample has 0 overflow).
4. **Shift dialog layout.** REQ-210 mock gives only a sketch ("Layout details are not specified"). The dialog is drawn as a full screen with operation and scope controls, counts and Cancel/Apply.
5. **Holiday task handling.** Section 6.2 says Mark holiday "asks what to do with its tasks". The sample assumes the choice is "move to the next working day"; the question itself is not drawn.
6. **Lock the day landing.** The spec says locking makes later edits ask for confirmation, but not where the user lands. The tour goes to Today.
7. **Sample numbers.** The 6 moved tasks, the 1 fixed item and the day ring percentages are invented; the spec states no formula for the ring.

## Walkthrough notes (not spec gaps)

- Undo after Apply returns to the Shift preview; the spec says Undo reverses the whole batch.
- Completion shows an "Undo (5s)" button that only toasts; the 5-second timer is not simulated.
- The mock's tab bar shows only three screens; the other spec screens are out of scope for this tour.
- The validator warns that the Shift button on Today has no rule in two steps; clicking it shows a hint.
- Not checked by hand: mobile checks (touch targets, fixed widths) and the gap-per-notDefined check; the tour was not clicked through.
