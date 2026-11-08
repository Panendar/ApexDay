# ApexDay (Web) — Product Requirements

**Version 1.1** · Nov 8, 2026 · @Panendar
**Status:** Draft for build planning. Supersedes v1.0.

> ApexDay is a design-first web app for planning your day with timed tasks, completing them with motivating animation, and shifting the whole schedule in one step when real life changes. Progress is shown by day, week, month and year.

**What changed in v1.1:** everything is now free (no Pro tier); added start support and partial progress (5.5); fixed section numbering and cross-references; added success metrics, non-goals and a glossary; added new features (Top 3, Inbox, Focus Mode, Habits, Goals, Weekly Planning ritual, Energy-aware planning, estimate accuracy, task search, shortcuts for momentum); tightened vague requirements into testable ones; added the Feature Register (Appendix A).

---

## Contents

1. Vision and Scope
2. Principles and Web Platform Constraints
3. Users and Key Scenarios
4. Data Model
5. Modules 1–2: Planner and Today
6. Module 3: Routines, Timetables and the Shift Engine
7. Module 4: Progress and Insights
8. Module 5: Motivation and Animation System
9. Module 6: Design System, Layouts and Screens
10. Module 7: Accounts, Sync, Notifications, Integrations, Settings
11. Edge Cases
12. Non-Functional Requirements
13. Business Model, Delivery Phases, Risks and Acceptance
- Appendix A: Feature Register
- Appendix B: Glossary

---

## 1. Vision and Scope

ApexDay is a web application (installable as a PWA, no native apps) for people whose days follow a schedule that keeps changing. The user plans tomorrow as a timeline of timed tasks, runs the day by completing them, and sees discipline grow through animation, streaks and progress by day, week, month and year. When life changes the plan (surprise holiday, college day-order change, overrunning class), one **Shift** action re-flows the schedule with a preview and Undo.

**Original request (the seed of this product):** *a day tracker to set my tasks and complete them, with the best UI that keeps me going.* Every section below serves that sentence: **set tasks** (Planner, Inbox, Quick-add), **complete them** (Today, Focus Mode), **best UI** (Design System), **keeps me going** (Motivation, Streaks, Apex, Habits, Goals).

This document covers the whole product, not a minimum version. Section 13 sequences it into delivery phases.

**Who it serves.** Students first (rotating day orders, sudden holidays, class changes), then self-learners and working professionals with a routine.

**Pricing.** Every feature is free, with no paid tier, no caps and no locked themes or insights. How the product is funded later (for example optional supporter contributions) is an open decision (13.4) and must never lock existing features. Every feature is judged by one question: *does it make the user open ApexDay tomorrow?*

**Core architecture decision.** The schedule is stored as **rules plus overrides**, not as copied tasks. A Routine generates Task Instances for each date; any one-off change (shift, skip, holiday, day order) is an Override on top. This makes shifting cheap, reversible and safe, and keeps history and streaks correct.

**Design is a requirement.** Look, motion and feel carry measurable acceptance criteria (sections 8, 9, 12), not a final polish pass.

### 1.1 Success metrics

| Metric | Target (review after 90 days of public release) |
|---|---|
| Day-1 / Day-7 / Day-30 retention | 45% / 25% / 15% |
| Planned-day rate (active users who plan tomorrow before it starts) | ≥ 60% |
| Median time to plan tomorrow | ≤ 2 minutes |
| Tasks completed per active day | ≥ 4 |
| Streak survival through first holiday or shift | ≥ 90% (fairness check) |
| Start rate (planned tasks that get at least 1 minute of focus) | ≥ 70% |
| Rescued tasks (nudged tasks that reach ≥ 20% of planned time) | ≥ 40% of nudged tasks |

Metrics are measured with opt-in, anonymous analytics only (section 12, Privacy).

### 1.2 Non-goals

- No native iOS or Android apps. Reconsider only with retention data (13.3 risk 5).
- No social feed, public leaderboards or comparison with strangers in the base product.
- No team or enterprise task management (assignees, boards, permissions).
- No AI that moves, deletes or reschedules without a preview and confirmation. Suggestions only.
- No selling or sharing of task data.

---

## 2. Principles and Web Platform Constraints

### 2.1 Product principles

- **Plan before the day, adjust during it.** Planning is optimised for speed; the day view for one-click completion.
- **The user has the final say.** Nothing moves, deletes or fails without a preview and Undo.
- **Never punish.** Holidays, shifts and missed days must not unfairly break streaks. Guilt kills retention.
- **Everything is reversible.** Every bulk action has Undo for at least 30 seconds and a history entry afterwards.
- **Time-zone safe.** Times are stored as local wall-clock time plus the user's IANA time zone.
- **Motion is respected.** Every animation has a calm fallback for users who prefer reduced motion.
- **Start small.** The app always offers the smallest next step (one task, two minutes) so a bad day still produces a win.
- **Calm by default.** Notifications, sounds and celebrations are opt-down friendly and never nag.

### 2.2 Web platform targets

| Area | Requirement |
|---|---|
| Browsers | Latest 2 versions of Chrome, Edge, Firefox and Safari (desktop); Chrome and Safari on phone and tablet browsers |
| Layout | Responsive from 360 px to 2560 px wide; desktop-first design with full mobile-browser support |
| Input | Mouse and keyboard first (drag and drop, shortcuts, command palette); touch gestures supported on responsive layouts |
| Install | Installable PWA (manifest, icons, standalone window); works without install |
| Offline | Service worker caches the app; local database holds data; edits queue and sync when online |
| Notifications | Web Push (where the browser allows), in-tab alerts, optional email digests; Safari push needs the installed web app, which the app explains |
| Rendering | Animations use compositor-friendly properties (transform, opacity); canvas or WebGL only for the Apex visual and celebrations |
| Stack | The team chooses the framework, animation library and database, and records the choice and reasons in the README |

### 2.3 Honest web limits to design around

The browser cannot fire a reminder if it is fully closed and push is blocked, there is no haptic feedback on desktop, and mobile Safari restricts background work. The app must say so plainly in the notification setup instead of failing silently.

---

## 3. Users and Key Scenarios

| User | Situation | What ApexDay must do |
|---|---|---|
| College student | Timetable runs on Day Order 1–6; a holiday or special schedule changes the order unexpectedly | Re-align day orders in one action, keep personal study tasks in free gaps, track class attendance |
| School student | Fixed weekly timetable plus homework and tuition | Weekly routine, homework tasks linked to subjects, exam-week mode |
| Self-learner | Wants consistent daily study or skill practice | Routines, streaks, habits, category goals, weekly review |
| Working professional | Meetings move; deep-work blocks must survive | Fixed items, shift times, compress the rest, focus timer and Focus Mode |
| Returning user | Missed a week | Welcome-back flow with no guilt, streak recovery path |

**Key scenarios that must be fast and delightful:**

1. Plan tomorrow in under 2 minutes using a routine, the Inbox and quick-add.
2. Complete five tasks in a row without waiting on any animation.
3. Tap Holiday tomorrow, preview the cascade across the week, apply, and undo.
4. Tap *Today is Day Order 3* and see every later date re-align.
5. Open the year view and feel proud of the heatmap.
6. Wake up, see the day's Top 3 and the first task, press Start, and be in Focus Mode within 3 seconds.
7. Have a bad morning, tap *Reset my day*, and get a realistic plan for the rest of the day.

---

## 4. Data Model

Times are local wall-clock `HH:mm`; dates are `YYYY-MM-DD`; durations are minutes. Completion history is append-only.

| Entity | Key fields | Notes |
|---|---|---|
| User | id, name, email, timezone, week_start, day_start_hour (default 4), theme, plan (free/pro), settings_json | day_start_hour assigns 1 a.m. work to the previous day |
| Category | id, user_id, name, color, icon, weekly_goal_min | Study, Class, Health, Personal, and so on |
| Tag | id, user_id, name, color | Free-form labels across categories |
| Routine | id, user_id, name, color, icon, recurrence_rule, active_from, active_until, category_id, archived_at | A repeating pattern |
| RoutineTask | id, routine_id, title, start_time, duration_min, order, around_classes | Template tasks |
| Task | id, user_id, title, notes, category_id, tag_ids, priority, energy (low/med/high), date, start_time, duration_min, is_fixed, is_top3, goal_id, source (manual/routine/shifted/import/inbox), routine_task_id, status, subtasks_json, links_json | One concrete task on one date |
| InboxItem | id, user_id, text, created_at, promoted_task_id, archived_at | Unscheduled brain-dump; becomes a Task when scheduled |
| DayPlan | id, user_id, date, day_type, day_order_index, is_locked, mood, energy_morning, note, intention | day_type: normal, holiday, exam, rest, day_order |
| Override | id, user_id, date, routine_task_id, action (skip/move/edit), payload_json, reason, batch_id | An exception on top of a rule |
| ShiftBatch | id, user_id, kind, scope, from_date, to_date, snapshot_json, created_at, undone_at | One reversible bulk change |
| Timetable | id, user_id, name, cycle_type (weekly/day_order), cycle_length, slots_json, alignment_json | Class schedule and day-order mapping |
| ClassSlot | id, timetable_id, cycle_position, subject, start_time, end_time, room, teacher | A class in the cycle |
| Attendance | id, user_id, class_slot_id, date, status (attended/absent/cancelled) | Feeds subject attendance % |
| CalendarEntry | id, user_id, date, kind (holiday/exam/event), title, source | Triggers Shift prompts |
| Habit | id, user_id, name, icon, color, cadence (daily/weekdays/n-per-week), target_count, unit, archived_at | Untimed recurring check-in (water, reading, gym) |
| HabitLog | id, habit_id, date, count, logged_at | Append-only; feeds habit streaks |
| Goal | id, user_id, title, category_id, target_type (hours/tasks/habit_days/date), target_value, due_date, achieved_at | Long-term goal; tasks and habits link to it |
| FocusSession | id, user_id, task_id, started_at, ended_at, planned_min, actual_min, mode (free/countdown/sprint/tiny_start), work_min, break_min, round_no, interruptions | Feeds time-on-task and estimate accuracy |
| Completion | id, task_id, date, completed_at, actual_min, on_time, xp | Immutable history for streaks and charts |
| Streak | id, user_id, scope (overall/category/routine/habit), current, best, freezes_left, last_counted_date | Derived and cached; rebuildable from Completion and HabitLog |
| Achievement | id, user_id, code, unlocked_at | Badges and milestones |
| Reflection | id, user_id, period (day/week/month), period_start, text, rating | End-of-day and weekly review notes |
| StartNudge | id, user_id, task_id, shown_at, tip_id, action_taken (started/tiny_start/break_down/moved/dismissed), reached_pct | Log for nudge caps, muting and the Rescued-tasks insight |
| Tip | id, text, context (big/boring/tired/slump/missed_start/general), tone, hidden_by_user | Anti-procrastination library (50+ tips) |
| ApexState | id, user_id, visual_theme, stage, daily_state, updated_at | State of the growing visual |
| Device | id, user_id, push_subscription_json, last_seen | For push and sync |

**Task statuses:** `planned`, `in_progress`, `done`, `skipped`, `moved`, `missed`. A task is never silently deleted when it moves; the original keeps `moved` so history stays honest. Deleted tasks go to a 30-day Trash before permanent removal.

---

## 5. Modules 1–2: Planner and Today

### 5.1 Planner (plan any day)

- A **Plan Tomorrow** prompt appears at a user-set time (default 9 p.m.) and on first open of an unplanned day.
- The planner is a vertical timeline with a task side panel. A task has: title, start time, duration or end time, category, tags, priority, energy level, notes, subtasks, links, fixed flag and an optional reminder.
- **Quick-add** accepts natural text such as "DSA 6pm 90m tomorrow" and fills the fields for review. It also understands `!high`, `#category`, `@tag` and "every weekday". Ctrl/Cmd+K opens a command palette for adding, jumping to a date, applying a routine, searching tasks or starting a shift.
- Drag a task to change its time, drag its edge to change duration, drag between days in the week view, and use multi-select for bulk move, delete or recolour. Time snaps to a user-set grid (5, 10, 15 or 30 minutes).
- Apply a routine to any date or range with a preview before confirming. *Copy yesterday* and *Copy last week* are one-click.
- **Conflicts.** Overlaps show an amber warning with fixes (shift later, shorten, keep both). Overlaps never block saving.
- A live **load meter** shows planned versus free minutes and warns above a configurable limit (default 14 hours).
- **Lock the day** ("Start my day") makes later edits ask for one confirmation so the plan feels committed.
- Views: day timeline, week board (7 columns), and agenda list.

**New in v1.1:**

- **Inbox (brain dump).** A capture box always reachable (key `I`, or a floating button) accepts unscheduled thoughts in one line. Planning shows the Inbox beside the timeline; drag an item onto a time slot, or press `Enter` to promote it with smart defaults. Inbox items older than 14 days appear in a gentle "still want these?" review.
- **Top 3.** Each day can pin up to three tasks as the day's **Top 3** (the "if I only do three things" list). Top 3 tasks get a distinct marker, bonus XP and are the headline of the Today header and the End of Day card. Planning suggests Top 3 candidates from priority, due goals and unfinished carry-overs.
- **Day intention.** An optional one-line intention ("Finish the DSA graph set") shown at the top of Today.
- **Energy-aware planning.** Tasks carry an energy level (low, medium, high). A one-tap morning check-in (energy: low / okay / high) lets the planner suggest which tasks to do now. Suggestions only; nothing moves without confirmation.
- **Smart duration.** After 5 completed instances of a similar task, planning suggests the duration from the user's actual median time (from FocusSession and Completion).
- **Task templates.** Save any task, with its subtasks and reminder, as a reusable template available in quick-add.
- **Search and filters.** Global search across titles, notes, tags and history (palette or `/`). Filters by category, tag, priority, status and goal. Search runs on-device, never on the server.
- **Bulk time tools.** *Distribute evenly* (spread selected tasks across a window) and *Stack tasks* (remove gaps between selected tasks).
- **Weekly planning ritual.** A guided 3-step flow (review last week, set the week's goal, drop big tasks onto days) offered on the user's chosen planning day (default Sunday evening). Finishing it earns a small reward and sets the week's headline.

### 5.2 Today (run the day)

- Layout: header with the Apex visual, day ring and **Top 3 strip**, a large **Now card** with a live countdown ring, an **Up next** card, the full day as animated cards, and a side panel with quick stats.
- One click or `Space` completes the selected task. The completion animation plays and a 5-second Undo appears.
- A task past its end time moves to **Needs attention**, never to "failed", with choices: done late, move later today, move to tomorrow, skip with a reason.
- Optional **focus timer** per task (start, pause, finish, with a pomodoro option). Actual duration is stored and used in insights.
- The browser tab title and favicon show the current task and a progress ring, so the day stays visible in a background tab.
- Reminders fire at task start and a configurable lead time.

**New in v1.1:**

- **Focus Mode.** Pressing `F` (or *Start* on the Now card) opens a distraction-free full-screen view: the task title, a large timer ring, subtasks as a checklist, and a single *Done* button. Options: pomodoro lengths, optional ambient sound (off by default), and a "park a thought" box that sends stray ideas to the Inbox without leaving the view. Leaving Focus Mode never loses time already tracked. Interruptions are counted, not judged.
- **Your own time window.** The user sets when each task runs (from–to) in the planner. The timer works inside that window: it shows time elapsed against the planned duration, and the user can start it early, late or at the planned time. Planned time is a guide, never a lock.
- **Timer modes.** Every task can use: *Free timer* (count up), *Countdown* (to the planned end), *Sprint* (work + short break, repeated), or *Tiny Start* (see 5.5). Sprint presets: 5 + 2, 10 + 2, 25 + 5, 50 + 10, and fully custom work and break lengths. The last-used mode is remembered per category.
- **Reset my day.** One tap re-plans the rest of today from the current time: it shows the remaining tasks, suggests what to keep, compress or move to tomorrow, and previews the result. It reuses the Shift engine (Compress the rest and Move) and is fully undoable.
- **Momentum bar.** A thin bar under the header shows the streak of completions in the current day ("3 in a row"), resetting gently at midnight. It has no penalty side.
- **Subtask progress.** A task with subtasks shows partial progress on its card and ring. Completing the last subtask offers to complete the task.
- **Quick actions on cards.** Hover or long-press reveals: +10 min, +30 min, snooze 15 min, move to tomorrow, make fixed, add subtask.
- **Daily check-in.** Optional morning (energy, mood) and evening (reflection) prompts stored in DayPlan; shown in Progress as a mood-vs-completion insight (never as a score).

### 5.3 Close the day

- At a set time or when the last task is done, an **End of Day card** shows tasks done, time on task, Top 3 result, streak status, one highlight and an optional one-line reflection.
- Unfinished tasks get one-click choices: roll to tomorrow, reschedule, drop. Nothing rolls over without the user seeing it.
- The day is then sealed into history. Past days are read-only except a labelled "edit history" action that is logged.
- The card suggests tomorrow's Top 3 and opens Plan Tomorrow in one click, linking the evening ritual directly to tomorrow's planning.

### 5.4 First-run experience

Three steps: pick a goal, pick a theme, add the first three tasks. Seed a sample routine so no screen is ever empty. Ask for notification permission only after the first completed task. A 30-second interactive tour (skippable) shows quick-add, Space to complete, and Shift. Guest mode lets a person use the whole app before signing up.

### 5.5 Beat procrastination: start support and partial progress

**Idea.** Most plans fail at the start, not in the middle. If a person cannot finish a task, ApexDay helps them do *some* of it, and counts that honestly. Spending 20–50% of a task is a win, not a failure.

**A. Start nudges (never nagging).**
- If a task's start time has passed by a user-set delay (default 5 minutes) and no timer was started, a calm **Start nudge** card appears on Today (and as an in-tab or push alert if enabled). It never blocks the screen.
- The nudge offers: *Start now*, *Tiny Start*, *Break it down*, *Move later*, *Not today*. It shows one short tip (see C).
- Limits: at most one nudge per task, a daily cap (default 5), respects quiet hours, and can be turned off globally or per category. After two dismissals of the same kind, that nudge style is muted.
- A nudge never uses guilt language and never mentions streaks.

**B. Tiny Start (the 5 + 2 method).**
- Tiny Start runs a short sprint on any task: **5 minutes of work, then a 2-minute break**, then the user chooses *another round*, *keep going* or *stop*. The 2-minute break has a gentle "stand up, water, breathe" prompt.
- Ladder: if 5 minutes feels too much, the user can pick 2 minutes first (*Just 2 minutes*). After each round the app offers a step up (5 → 10 → 25 minutes) but never forces it.
- The work and break lengths are editable (defaults 5 and 2).
- Every Tiny Start round is a real FocusSession and counts toward the task's progress.

**C. Anti-procrastination tips.**
- A built-in library of at least 50 short, practical tips, picked by context (task is big, task is boring, user is tired, afternoon slump, after a missed start). Examples: "Just open the file; that's the whole task." "Start with the easiest 5 minutes." "Put your phone in another room for one round." "Decide the very first action, in one sentence." "Eat the frog: do the hardest task first." "Pair it with something you enjoy, like music or tea."
- Tips are shown in the Start nudge, in Focus Mode before the timer starts, and in a "Stuck?" drawer on any task.
- Tips are written in a supportive tone and respect the user's tone setting (calm, energetic, tough love). Users can hide a tip and turn all tips off.
- **Stuck? picker.** One tap on a reason (too big, boring, don't know where to start, tired, distracted) gives a matching action: *Break it down*, *Tiny Start*, *Swap with a lighter task*, *Short walk, then start*, or *Do the easiest 5 minutes*.

**D. Break it down.**
- *Break it down* turns a task into 3–5 small subtasks. The user types them or picks from simple templates (for example Study: "Open notes", "Read one section", "Write 3 key points"). Optional smart suggestions may be offered later, but nothing is added without the user's approval.
- Each subtask can be given a time slice; the first subtask is highlighted as "start here".

**E. Partial progress counts.**
- A task's **progress** is the focus time spent divided by its planned duration, capped at 100% (subtasks done can also raise it; whichever is higher is used).
- Progress tiers, shown on the card with a clear label:

| Time spent | Label | Effect |
|---|---|---|
| 1 minute to under 20% | Started | Counts as a start; small XP; no progress credit |
| 20% to under 50% | Good start | Partial credit 0.25 toward day ring and streak threshold; partial XP |
| 50% to under 100% | Halfway+ | Partial credit 0.5 toward day ring and streak threshold; partial XP |
| 100% or marked done | Done | Full credit |

- Partial credit uses real tracked focus time only (minimum 1 minute per round), is capped by a daily XP limit, and cannot be manually inflated.
- When a task ends with partial progress, **Needs attention** says what was achieved ("You did 35% — nice start") and offers: *Continue now*, *Schedule the rest* (creates a follow-up for the remaining minutes), *Mark done anyway*, or *Move to tomorrow*.
- The End of Day card includes "You started X tasks and spent Y minutes on things you almost skipped."
- Weights (0.25, 0.5) and tier thresholds (20%, 50%) are configurable in Settings within sensible bounds; defaults are recorded in the README.

**F. Insights and rewards for starting.**
- *Start rate* and *Rescued tasks* (nudged tasks that reached 20%+) appear in Progress as an encouraging insight ("Your 5 + 2 sprints turned 12 skipped tasks into progress this month").
- Achievements: *First Starter*, *Five Sprints*, *Rescued Ten*, *Comeback Start* (starting a task after a missed day).
- Motivation lines for start moments are part of the 200+ library.

**G. Rules.**
- Nothing in this section moves, completes or deletes a task without the user's action.
- Tiny Start and tips never replace the user's own timing; they sit beside the planned window.
- Reduced-motion and sound settings apply to the sprint and break animations and chimes (sound off by default).

---

## 6. Module 3: Routines, Timetables and the Shift Engine

This module is the reason ApexDay exists. Real schedules change, and shifting one day must never mean retyping a week.

### 6.1 Routines

- A Routine is a named set of timed tasks with a recurrence: daily, chosen weekdays, every N days, or by day order.
- Routines have a start and optional end date (a semester). Editing asks: *this day only*, *this and future days*, or *all days*.
- A day can carry several routines. Conflicts across routines are flagged, never merged silently.
- Routine templates library (users can create unlimited custom ones): "College day", "Exam week", "Deep work", "Morning reset", "Evening wind-down", "Weekend reset".
- Routines can be paused for a date range (illness, travel) without affecting streaks.

### 6.2 Shift operations

Every shift shows a before and after preview, applies as one ShiftBatch, and can be undone as one action.

| Operation | What it does | Typical case |
|---|---|---|
| Push day forward | Moves a day's tasks to the next working day and pushes later days forward by one, up to a chosen end point | Surprise holiday on Tuesday; the plan cascades |
| Pull back | Closes the gap left by a cancelled day | Holiday cancelled |
| Swap days | Exchanges the plans of two dates | Saturday works as a Monday |
| Set day order | Marks a date as Day Order N so that timetable applies | "Tomorrow is Day Order 3" |
| Mark holiday | Turns a day into a holiday and asks what to do with its tasks | Public or surprise holiday |
| Shift times | Moves remaining tasks by +/- N minutes | Class starts 30 minutes late |
| Compress the rest | Fits remaining tasks into the time left by shortening durations proportionally | Lost two hours in the morning |
| Move or skip task | Moves or skips a single task with Undo | One appointment |
| Reset my day | Re-plans the rest of today from now, combining compress, move and skip suggestions | Bad morning, want a fresh realistic plan |

**Rules for cascading shifts:**

- The user picks the scope: today only, this week, until a date, or until the routine ends. The default is the smallest scope that fixes the problem.
- Fixed items do not shift. Shifts skip them and warn if a shifted task would collide with one.
- Holiday, exam and rest days are skipped by Push forward unless the user says otherwise.
- Tasks that no longer fit appear in an **overflow list** with choices. A push never silently drops work.
- A shift never rewrites the past. Days before today are untouched.
- Shifts are stored as overrides under one ShiftBatch. Undo removes them. The Routine itself is unchanged.
- Every Shift preview states the counts: tasks moved, skipped, overflowed, and fixed items protected.

### 6.3 Day-order timetables for colleges

- The user defines a cycle: weekly (Mon–Sat) or day order (Day 1 to Day N, with N from 2 to 10).
- Each cycle position has timed class slots (subject, start, end, room, teacher).
- A calendar mapping decides which day order falls on each date. By default it advances one position per working day. When a holiday or special day happens, the user clicks *Today is Day Order X* once and every later date re-aligns after a preview.
- When the day order changes, classes swap in and personal tasks stay put. Study blocks flagged "around classes" re-fit into the free gaps.
- Each class can be marked attended, absent or cancelled. Cancelled classes free their time and offer a suggested study task.
- Attendance tracking per subject with a percentage and a warning below a user-set limit (many colleges require 75%), plus "classes you can still miss" arithmetic.
- Import a timetable by CSV or by pasting a table, and share a timetable with classmates via a link.

### 6.4 Entry points

- A **Shift** button on Today and on every day in the calendar, and a right-click or long-press menu on any task (Move, Skip, Push, Make fixed).
- Keyboard: `S` opens Shift on the selected day.
- A suggestion (never an action) when a pattern appears: "Running behind? Shift the rest of today by 30 minutes." Suggestions can be dismissed and muted per type.

---

## 7. Module 4: Progress and Insights

Progress is visible for today, week, month, year and lifetime in one visual language. All views compute from Completion, HabitLog and Task history and update live.

| View | What it shows | Key visuals |
|---|---|---|
| Today | Done vs planned, time on task, on-time rate, XP earned, Top 3 result | Animated day ring, task progress bar, momentum line through the day |
| Week | Completion per day, best day, time per category, change from last week, habit consistency | 7-day bar chart, category donut, week-over-week delta chip |
| Month | Consistency calendar, streak, best week, category balance | Colour-intensity heatmap, streak badge, monthly summary card |
| Year | Every day at a glance, monthly trend, total hours, longest streak | GitHub-style year heatmap, monthly trend line, milestone markers |
| Lifetime | Level, total XP, tasks, hours, achievements | Level card, trophy shelf, Apex growth history |
| Subjects | Attendance %, study time per subject, upcoming exams | Subject cards with progress bars and a risk warning |
| Habits | Per-habit streak, weekly consistency, best time of day | Habit grid, streak chips |
| Goals | Progress toward each goal, projected finish date | Goal progress bars with a pace marker |

**Requirements:**

- **Completion rate** = done tasks / (planned tasks − skipped-with-reason − tasks on holiday days). Define it once in code and show the formula in a help tooltip.
- **Partial credit.** Tasks with focus time count fractionally (5.5 E: 0.25 at 20%+, 0.5 at 50%+) toward the day ring and the streak threshold. The completion-rate formula above uses these weights for the numerator; the denominator is unchanged. Document both in the help tooltip.
- **Streak rule.** A day counts when completion reaches a user-set threshold (default 70%). Holiday and rest days are neutral. Users get streak freezes (default 2 per month), offered but never spent without consent.
- Category, routine and habit streaks exist alongside the overall streak.
- **Patterns, not guilt.** Insights read like "You finish 82% of morning tasks and 45% of evening tasks" with a one-click suggested action.
- **Estimate accuracy.** A "planned vs actual" insight shows how long tasks really take by category and suggests duration changes ("Study blocks run 20% longer than planned").
- **Best-time insight.** Shows the user's most productive hours, based on completions and focus sessions.
- Weekly and monthly review cards: wins, a gentle lowlight and a goal for next period, shareable as an image that excludes task titles by default.
- Compare to self only in the base product. Optional private groups can follow later (section 13).
- Every chart supports hover and click to inspect, a keyboard path, an accessible text summary and an empty state that explains how data will appear.
- A range selector (week, month, year, custom) and a category filter apply across all charts.
- Export all history as CSV or JSON. Printable weekly and monthly report as PDF.

---

## 8. Module 5: Motivation and Animation System

The feeling of progress is the product. Motion is organised in three layers so it grows with the user instead of repeating one effect.

### 8.1 Three layers of feedback

| Layer | Trigger | Example | Duration |
|---|---|---|---|
| Micro (every task) | Task completed | Checkbox morphs into a tick with a spring, card tints with the category colour, small particle burst, XP chip floats into the day ring | 400–700 ms |
| Day | 25%, 50%, 75%, 100% of the day | Day ring fills with a glow; at 100% a short full-screen celebration and a "Perfect day" card | 1–2 s, skippable |
| Growth | Streak days, levels, weekly and monthly goals | The Apex visual advances, level-up animation, badge unlock with a shine | 1.5–3 s |

### 8.2 The growing visual ("Apex")

A signature element that visibly evolves with discipline. Default: a mountain peak with a flag. Alternatives: tree, flame, city skyline, constellation.

- It advances one stage at each streak milestone (3, 7, 14, 30, 60, 100, 200, 365 days).
- Daily completion changes its state (brightness, weather, growth inside a stage), so every day moves it a little.
- A missed day pauses growth and dims it. It never destroys it. Recovery is one good day away.
- It appears in the Today header and as a full-screen hero in Progress.

### 8.3 Task cards

- States: upcoming, now (pulsing ring and live countdown), done (settled, tinted), late (amber edge), skipped (muted), fixed (pin icon), top 3 (marker), dragging (lifted).
- The Now card is larger with a time-remaining ring that warms in colour in the last 5 minutes.
- Cards enter with a staggered reveal, and reorder with shared-element transitions when times change or a shift is applied.
- Pointer: hover lift, drag with a ghost. Touch: swipe right to complete, swipe left for options.

### 8.4 Rewards without gimmicks

- **XP and levels.** XP scales with priority and duration, with a daily cap so tiny tasks cannot farm it. Top 3 tasks earn a bonus; 2-minute starts earn partial XP.
- **Variable surprise.** Occasional unannounced animation variants and messages (rare, never at sensitive moments).
- **Achievements.** At least 40 across consistency, timing, comeback, category mastery, shifting well, attendance, focus, habits and goals.
- **Daily quests (optional).** One light, rotating, opt-in challenge per day ("Finish your first task before 10 a.m."). Quests reward XP only, never gate features, and are never shown as failed.
- **Seasonal events.** Light time-limited visuals (exam season, festival days) that change look only, never rules.
- **Motivation copy.** At least 200 short lines picked by context (morning, behind schedule, comeback, milestone, Focus Mode) with tone settings: calm, energetic, tough love.
- **Shift reassurance.** After a shift or holiday: "Plan reshuffled. 6 tasks moved, nothing lost."
- **Weekly recap moment.** On the weekly review, a short animated recap plays the week's best moments (best day, longest focus, streak growth).

### 8.5 Animation rules

- Every celebration is skippable and capped to one major celebration per minute.
- Reduced motion replaces movement with fades and colour changes. Sound has its own switch and is off by default.
- Animate compositor properties wherever possible. Target 60 fps on a mid-range laptop and a mid-range phone browser.
- No animation blocks input. The next task can be completed while the last celebration plays.
- Animation assets are lazy-loaded and each Apex stage stays under 300 KB.

---

## 9. Module 6: Design System, Layouts and Screens

### 9.1 Visual language

- **Look.** Premium, calm and energetic: layered depth, soft shadows, frosted surfaces on dark themes, generous spacing, rounded cards (radius 20–28 px), one accent colour per category.
- **Themes.** At least 8: Light, Dark/AMOLED, and accent themes such as Sunrise, Forest, Midnight, Sakura, Ocean and Mono. Themes change colour, the Apex visual and card texture. Auto theme follows the system or time of day.
- **Typography.** A display face for headings and numbers and a text face for body, on a fixed scale (12, 14, 16, 20, 28, 40, 56 px). Tabular numerals for times.
- **Icons.** One consistent icon set with animated versions of the 10 most-used icons.
- **Colour meaning.** Category colour for identity, green for done, amber for late. Never red for ordinary missed tasks.
- **Empty states.** Every screen has an illustrated, friendly empty state with one clear next action.
- **Density setting.** Comfortable (default) and Compact spacing for power users.

### 9.2 Responsive layout

| Width | Layout |
|---|---|
| 1200 px and up | Three panes: navigation rail, day timeline, insight panel (Apex, stats, up next) |
| 768–1199 px | Two panes: timeline and collapsible panel |
| 360–767 px | Single column with bottom tab bar, floating quick-add button and sheet-style dialogs |

### 9.3 Components (all states and a motion spec for each)

| Component | Required states |
|---|---|
| Task card | upcoming, now, done, late, skipped, fixed, top 3, dragging |
| Day ring | empty, partial, complete, over-achieved (segmented by category) |
| Timeline | now-line, free gap, overlap, holiday, locked, zoomable time scale |
| Shift dialog | choose operation, scope, preview, applied, undone |
| Streak badge | active, at risk, frozen, broken-and-recovering |
| Heatmap | empty, sparse, dense, holiday cells, selected |
| Charts | loading, empty, data, error, drawn-in animation |
| Apex visual | every growth stage and daily state |
| Command palette | empty, results, no results |
| Focus Mode | idle, running, paused, break, finished |
| Inbox panel | empty, items, promoting, review |
| Top 3 strip | empty, partial, complete |
| Habit chip | pending, done, over target, paused |

### 9.4 Motion tokens

Durations: instant 100 ms, quick 200 ms, standard 350 ms, emphasised 600 ms, celebration 1500 ms and up. Easings: standard, decelerate, and a spring with fixed stiffness and damping. Stagger: 40 ms per item, capped at 8 items.

### 9.5 Screens

1. Landing page with a live animated demo, pricing and sign-up (fast, SEO-ready).
2. Today (with Focus Mode overlay).
3. Plan (day, week and agenda views, with Inbox panel).
4. Calendar (month view with day types, day-order labels and completion tint).
5. Progress (week, month, year, lifetime, subjects, habits, goals).
6. Routines and Timetables (list, editor, day-order mapping, attendance).
7. Shift dialog, reachable from Today, Calendar and the task menu.
8. Habits and Goals.
9. Achievements and Apex.
10. Reviews (end of day, weekly, monthly).
11. Trash and history log.
12. Settings (account, theme, notifications, streak rules, day start hour, motion, data export).

### 9.6 Accessibility

- Text contrast of at least 4.5:1 in every theme; state is never colour-only.
- Full keyboard operation including drag alternatives (move with arrow keys) and visible focus.
- Screen-reader labels for cards, rings and charts; respects reduced motion and text zoom to 200%.
- Keyboard shortcuts:

| Key | Action |
|---|---|
| `N` | New task |
| `I` | Capture to Inbox |
| `Space` | Complete selected task |
| `F` | Focus Mode on selected or current task |
| `S` | Shift |
| `T` | Jump to today |
| `/` or `Ctrl/Cmd+K` | Search / command palette |
| Arrows | Change day or move selection |
| `?` | Show all shortcuts |

---

## 10. Module 7: Accounts, Sync, Notifications, Integrations and Settings

### 10.1 Accounts and sync

- Sign in with email (magic link) and Google. A guest mode keeps data locally and offers to create an account later, migrating all data.
- Data syncs across browsers and devices. Each field carries a timestamp; conflicts resolve last-writer-wins per field. Completion and HabitLog rows merge by union so progress is never lost.
- Account deletion removes all server data within 30 days. Full export is always available.

### 10.2 Notifications

| Channel | Used for | Notes |
|---|---|---|
| In-tab alerts and title badge | Task start, task ending, needs attention | Always available while a tab is open |
| Web Push | Same, when the tab is closed | Requires permission; Safari needs the installed web app; app explains status clearly |
| Email | Daily plan summary, weekly review, streak at risk | Opt-in, one-click unsubscribe |

Settings: quiet hours, per-category switches, lead time, "Plan tomorrow" and "Close the day" nudges, habit reminders. All reminders are re-scheduled after every shift. Notifications are rate-limited (default maximum 8 per day) and grouped when several fire together.

### 10.3 Integrations

- Calendar import and export via ICS feed and file (holidays, exams, events). Read-only Google Calendar import follows; two-way sync only after the core is stable.
- Holiday calendars by country and state, with a prompt when a new holiday is added: "Shift your plan?"
- Timetable import from CSV or pasted table.
- Share a weekly summary image or a read-only timetable link.
- Import tasks from CSV and plain-text lists (one task per line, same grammar as quick-add).

### 10.4 Settings

Theme and Apex visual, density, day start hour, week start, planning day and time, time format, streak threshold and freezes, overload limit, snap grid, motion and sound, Focus Mode defaults, notification rules, data export and delete, start-support and nudge settings.

---

## 11. Edge Cases

Each scenario must be handled without losing data, breaking a streak unfairly or confusing the user.

| # | Scenario | Required behaviour |
|---|---|---|
| 1 | Sudden holiday announced for tomorrow | Mark holiday; choose push forward, move to a date, or skip. Streak is neutral. Preview and Undo. |
| 2 | Holiday announced after the day has started | Completed tasks stay done; remaining tasks follow the same choices; the day is a holiday from now on. |
| 3 | College announces a different Day Order for today | Set day order swaps classes in place; personal tasks stay; later dates re-align after preview. |
| 4 | Holiday inside a week of pushed shifts | Push skips holiday, exam and rest days and shows which were skipped. |
| 5 | Push moves work past the routine or semester end | Overflow list in preview: extend, compress or drop. Nothing dropped silently. |
| 6 | Shifted task collides with a fixed item | Collision flagged in preview with options: place after, shorten, keep both. |
| 7 | Two shifts affect the same days | Each is its own ShiftBatch; Undo works in reverse; undoing an earlier one warns about dependent later shifts. |
| 8 | Undo after the user edited a shifted day | Offer revert only untouched tasks and list the edited ones. |
| 9 | Task crosses midnight | Belongs to the day it starts in, honours day_start_hour, drawn across both days. |
| 10 | User works at 1 a.m. with a 4 a.m. day start | Counts for the previous day; explained during setup. |
| 11 | Time zone or daylight-saving change | Wall-clock times kept; reminders re-scheduled; banner shown on zone change. |
| 12 | Wrong or tampered device clock | Server validates timestamps; big jumps show "check your device time"; no retroactive streak credit. |
| 13 | Task completed after the day was sealed | Allowed in a 24-hour grace window, counted for that day, marked late; later only by logged history edit. |
| 14 | Accidental click | 5-second Undo; un-completing removes XP and recalculates the streak. |
| 15 | App unopened for days | No guilt screen: welcome-back card, clean day, old tasks as one review list; a freeze is offered. |
| 16 | Edits on two devices, one offline | Per-field last-writer-wins with a conflict log; completions merge by union. |
| 17 | Streak freeze used | Shown with a distinct icon on calendar and heatmap; not purchasable with XP. |
| 18 | Deleting a routine with history | Soft delete: future instances removed, history kept in charts. |
| 19 | Editing a routine task that has past completions | Scope prompt; past records never change. |
| 20 | Too many tasks in one day | Overload warning; suggest moving lowest-priority tasks; user can ignore. |
| 21 | Zero tasks planned | Day is unplanned, not failed; offer Apply routine, Copy yesterday and Inbox. |
| 22 | Very long titles, emoji, other scripts | Wrap with ellipsis on cards, full text in detail; full Unicode and right-to-left support. |
| 23 | Reduced motion or low-end device | Static fallbacks; Apex shows stage images; celebration shortened. |
| 24 | Push permission denied or unsupported | In-tab alerts and email remain; a banner explains how to enable push. |
| 25 | Class cancelled mid-day | Slot marked cancelled, time freed, attendance not counted against the user. |
| 26 | Exam week | Exam day type hides non-essential routines in one click, pins exams as fixed, no streak penalty for hidden tasks. |
| 27 | Browser data cleared or new device | Cloud restore with preview before overwrite; guest users warned that local data can be lost. |
| 28 | Locale and week start | Week starts Monday or Sunday by setting; formats follow locale. |
| 29 | Session expired while offline | Edits stay queued; re-login does not discard them. |
| 30 | Same account in two tabs | Tabs sync live; a completion in one updates the other within a second. |
| 31 | Shared timetable link changes after others imported it | Importers keep their copy and get an optional "update available" prompt. |
| 32 | Account inactive for a long time | Data is never deleted for inactivity; a yearly email offers export; deletion happens only on the user's request. |
| 33 | Focus session left running overnight or tab closed mid-session | Session auto-ends at the task's end plus a 15-minute buffer; tracked time up to the last heartbeat is kept; user is asked to confirm actual duration. |
| 34 | Reset my day when every remaining task is fixed | Nothing is moved; the dialog explains that all remaining items are fixed and offers to unfix selected ones. |
| 35 | Top 3 task is skipped or moved | Top 3 slot opens for a replacement suggestion; a moved Top 3 task keeps its marker on the new date; no streak effect. |
| 36 | Inbox item promoted to a time that conflicts | Same conflict warning as the planner; item stays in Inbox until saved. |
| 37 | Habit logged on a holiday or paused routine | Counts as a bonus; a missed habit on a holiday is neutral, and paused habits never break a habit streak. |
| 38 | Goal deleted that has linked tasks | Tasks are kept and unlinked; goal history is archived, not erased. |
| 39 | Task in Trash restored after its date has passed | Restored as unscheduled to the Inbox with a note; never back-dated into sealed history. |
| 40 | Timer runs past the planned window or task end | Timer keeps counting (labelled "overtime"); progress caps at 100%; user is asked at the end whether to mark done or schedule more. |
| 41 | User ignores or mutes all nudges | Nudges stop for that type after two dismissals; the app never escalates. |
| 42 | Very short tasks (under 10 minutes) | Tiny Start is hidden; tiers still apply, with a 1-minute minimum for "Started". |
| 43 | Tiny Start round ends during another task's start time | Both are shown; the user chooses to continue, switch or park; nothing switches automatically. |
| 44 | Partial credit pushes a day over the streak threshold | Counts honestly; the End of Day card shows which tasks were partial so the streak never looks inflated. |

---

## 12. Non-Functional Requirements

| Area | Target |
|---|---|
| Load speed | Largest Contentful Paint under 2.0 s on a mid-range laptop on broadband; Today interactive in under 1.5 s on repeat visits (cached) |
| Interaction | Completion feedback within 100 ms; planner drag at 60 fps; any chart renders in under 500 ms for one year of data; Focus Mode opens in under 300 ms; on-device search returns in under 150 ms for 50,000 tasks |
| Bundle | Under 250 KB of JavaScript before lazy-loaded chart and animation chunks |
| Offline | All core features work offline; sync resumes automatically |
| Availability | 99.9% monthly for the sync API; the app stays usable if the API is down |
| Scale | Design for 100,000 users and 5 years of daily history per user without slower views (index by user and date, pre-aggregate daily totals) |
| Security | HTTPS only, secure cookies, CSRF and XSS protection, rate limiting, encrypted data at rest, hashed tokens, dependency scanning |
| Privacy | No third-party analytics on task titles or notes; product analytics are opt-in and anonymous; document stored data and retention; user data export and delete |
| Accessibility | WCAG 2.2 AA across all screens |
| Browser support | As in section 2.2, verified on every release |
| Observability | Error tracking, performance monitoring, and shift-operation logs without task titles |
| Testing | Unit tests for every Shift operation and Undo, streak and completion calculations, day-order mapping, Reset my day and Top 3 rules; at least 100 randomised cases applying shifts and asserting no task is lost or duplicated; end-to-end tests for plan, complete, shift, undo, Focus Mode and offline sync; visual regression for themes and key animations |
| Backups | Daily encrypted database backups, restore tested quarterly |
| Internationalisation | Strings externalised from day one; English first; Hindi and other Indian languages added later without code changes |

---

## 13. Business Model, Delivery Phases, Risks and Acceptance

### 13.1 Pricing

**ApexDay is fully free.** There is one plan with every feature: unlimited tasks, routines, timetables, habits, goals, all themes and Apex visuals, all insights and PDF reports, cloud sync on unlimited devices, and full history. There are no feature gates, usage caps or ads.

Running costs (sync, email, push) must stay low enough to support this; the budget target is recorded in the README. Any future funding model (optional supporter contributions, donations) is decided in 13.4 and must never remove or lock an existing feature, Undo, data export or the ability to leave.

### 13.2 Delivery phases

| Phase | Goal | Contents | Exit gate |
|---|---|---|---|
| 1. Foundation | Plan and complete a day | Data model, planner, Inbox, Top 3, Today, Focus Mode, timer modes, Tiny Start (5 + 2), start nudges, tips, partial progress, routines, local storage, base theme, completion animation | Plan, run and close a day offline with no data loss |
| 2. Shift engine | The differentiator | All shift operations incl. Reset my day, previews, Undo, fixed items, holidays, day-order timetables, attendance | Randomised shift tests pass; no task lost or duplicated |
| 3. Progress and motivation | Make people come back | Progress views, streaks and freezes, Habits, Goals, Apex visual, XP, achievements, reviews, weekly planning ritual, full animation system, 8 themes | Animation hits 60 fps; numbers match hand-calculated test set |
| 4. Accounts and sync | Multi-device | Sign-in, sync, conflict handling, Web Push, email digests, PWA install, export | Two devices stay consistent through offline edits |
| 5. Launch | Public web release | Landing page, onboarding, analytics (opt-in), accessibility audit, performance budget | WCAG 2.2 AA audit and Core Web Vitals pass |
| 6. Growth | Depth and reach | Calendar integrations, shareable timetables, private study groups, seasonal events, daily quests, smart suggestions, more languages | Retention targets reviewed with real data |

### 13.3 Hidden risks

1. **Shift engine correctness is the product.** One lost or duplicated task destroys trust. Build rules plus overrides first and test it before polishing UI. Copying tasks into new rows on every shift will corrupt history.
2. **Streak fairness.** Harsh streaks cause churn at the first break. Holiday neutrality, freezes and a comeback path are retention features.
3. **Animation fatigue and weight.** A celebration that thrills on day 1 annoys on day 60. Layers, caps, variants and skip rules mitigate this; heavy assets threaten the 60 fps and bundle budgets.
4. **Planning friction.** If planning tomorrow takes more than 2 minutes, people stop. Quick-add, Inbox, routines and copy-yesterday are launch-critical.
5. **Web reminders are weaker than native.** Push depends on browser and permission. If reminders prove core to retention, plan an email and calendar-feed fallback early (already in section 10) and reconsider a wrapper app only with data.
6. **Day-order variety.** Colleges differ. Support user-defined cycles and manual re-alignment, not one hard-coded scheme.
7. **Sync conflicts.** Offline-first with accounts is the hardest engineering piece. Prototype it in Phase 1 data design, not Phase 4.
8. **Feature sprawl.** Habits, Goals and Focus Mode widen the product. Each must reuse the core loop (plan → complete → see progress) and share components and data with tasks; any feature that adds a separate workflow is cut or deferred.
9. **Gamification fatigue.** Quests, XP and achievements must stay optional and quiet. Provide a "minimal mode" that hides XP and quests and keeps only the day ring and streak.

### 13.4 Open decisions

| Decision | Default assumed here |
|---|---|
| Hosting and backend | Chosen by the team; must meet section 12 |
| Funding | App is fully free. Optional supporter contributions or donations may be considered later; never a feature gate |
| Cost control | Set a per-user monthly infrastructure cost ceiling; prefer on-device compute and local-first storage |
| Apex default visual | Mountain peak |
| Languages at launch | English only; Hindi next |
| Partial-credit defaults | Confirmed: tiers at 20% and 50%, credits 0.25 and 0.5, configurable in Settings; End of Day card shows which tasks were partial |
| Fully free | Confirmed: no paid tier, no caps |
| Pomodoro defaults | 25 min work, 5 min break, 15 min long break after 4 rounds |
| Habits vs tasks | Habits are untimed check-ins separate from the timeline; a habit may optionally be scheduled as a task |
| Ambient sounds in Focus Mode | Small bundled loop set (rain, café, white noise), lazy-loaded; off by default |

### 13.5 Acceptance checklist

The product is complete when all of these are true:

- [ ] A task with time and duration can be added in under 5 seconds and appears on the timeline.
- [ ] A thought can be captured to the Inbox in under 3 seconds and promoted to a timed task in one drag or key press.
- [ ] Routines can be created, applied to any date or range and edited with all three scope choices.
- [ ] Tasks complete with one click, with Undo, and the animation holds 60 fps.
- [ ] Today shows Now card, Up next, Top 3 strip, day ring and Apex visual, all updating live, and the tab title reflects progress.
- [ ] Focus Mode starts in under 3 seconds, keeps tracked time through tab close, and feeds actual durations into insights.
- [ ] A user can set a task's from–to time and run a timer inside it (free, countdown, sprint or Tiny Start) in under 3 seconds.
- [ ] A start nudge appears after the user-set delay on an unstarted task, respects caps and quiet hours, and offers Tiny Start (5 + 2) and Break it down.
- [ ] Partial progress (20%, 50%) is shown on cards, credited to the day ring and streak threshold with the documented weights, and matches a hand-calculated test dataset.
- [ ] At least 50 tips are present and can be hidden or turned off.
- [ ] Mark holiday, Push forward, Pull back, Swap days, Set day order, Shift times, Compress and Reset my day each show a preview and undo in one step.
- [ ] A day-order timetable can be defined; changing today's day order re-aligns all later dates; attendance percentages are correct.
- [ ] Fixed items never move in a shift; overflow is always shown, never silently dropped.
- [ ] Streaks treat holidays and rest days as neutral; freezes work as specified; habit streaks follow the same fairness rules.
- [ ] Week, month, year and lifetime views match a hand-calculated test dataset.
- [ ] Habits and Goals can be created, logged and linked to tasks, and their progress matches a hand-calculated test dataset.
- [ ] 8 themes, 40 achievements, 200 motivation lines and all three animation layers are present, and a minimal mode hides XP and quests.
- [ ] Accounts, cross-device sync and offline edit merging work, including the cases in section 11.
- [ ] Web Push, in-tab alerts and email digests work and re-schedule after shifts.
- [ ] WCAG 2.2 AA, reduced motion and full keyboard operation pass an audit.
- [ ] Performance targets in section 12 are met on the release build.
- [ ] All 44 edge cases in section 11 have a passing test or a documented decision.
- [ ] Data export and account deletion work end to end.
- [ ] README documents the stack, reasons for each choice, setup in under 15 minutes, and the chosen values for streak threshold, grace window, overload limit and XP cap.

---

## Appendix A: Feature Register

IDs are stable references for planning and tests. Phase refers to 13.2. Tier: every feature is Free. Status: **Existing** = in v1.0, **New** = added in v1.1.

| ID | Feature | Module | Phase | Tier | Status |
|---|---|---|---|---|---|
| F-001 | Timeline planner (day, week, agenda) | Planner | 1 | Free | Existing |
| F-002 | Quick-add natural text and command palette | Planner | 1 | Free | Existing |
| F-003 | Drag, resize and multi-select editing | Planner | 1 | Free | Existing |
| F-004 | Conflict warnings and load meter | Planner | 1 | Free | Existing |
| F-005 | Lock the day | Planner | 1 | Free | Existing |
| F-006 | Inbox (brain dump) with promote-to-task | Planner | 1 | Free | New |
| F-007 | Top 3 and day intention | Planner / Today | 1 | Free | New |
| F-008 | Energy levels and morning check-in suggestions | Planner | 3 | Free | New |
| F-009 | Smart duration from past actuals | Planner | 3 | Free | New |
| F-010 | Task templates | Planner | 1 | Free | New |
| F-011 | Global on-device search and filters | Planner | 1 | Free | New |
| F-012 | Distribute evenly and Stack tasks | Planner | 2 | Free | New |
| F-013 | Weekly planning ritual | Planner | 3 | Free | New |
| F-014 | Now card, Up next, day ring | Today | 1 | Free | Existing |
| F-015 | Complete with Undo and animation | Today | 1 | Free | Existing |
| F-016 | Needs attention flow | Today | 1 | Free | Existing |
| F-017 | Focus timer (basic) | Today | 1 | Free | Existing |
| F-018 | Focus Mode (full screen, park-a-thought, ambient sound) | Today | 1 | Free | New |
| F-019 | Tiny Start (2 min / 5 + 2 sprint ladder) | Today | 1 | Free | New |
| F-020 | Reset my day | Today / Shift | 2 | Free | New |
| F-021 | Momentum bar | Today | 3 | Free | New |
| F-022 | Subtask progress and quick card actions | Today | 1 | Free | New |
| F-023 | Morning and evening check-in (energy, mood) | Today | 3 | Free | New |
| F-024 | Tab title and favicon progress | Today | 1 | Free | Existing |
| F-025 | End of Day card and sealing | Close the day | 1 | Free | Existing |
| F-026 | Tomorrow's Top 3 suggestion from End of Day | Close the day | 3 | Free | New |
| F-027 | Routines with scopes and templates library | Routines | 1 | Free | Existing |
| F-028 | Pause routine for a date range | Routines | 2 | Free | New |
| F-029 | Shift operations (8 original) with preview and Undo | Shift engine | 2 | Free | Existing |
| F-030 | Day-order timetables and attendance | Timetables | 2 | Free | Existing |
| F-031 | Timetable CSV import and share link | Timetables | 4/6 | Free | Existing |
| F-032 | Progress views (today, week, month, year, lifetime, subjects) | Progress | 3 | Free | Existing |
| F-033 | Streaks, freezes, category and routine streaks | Progress | 3 | Free | Existing |
| F-034 | Habits (untimed check-ins) and habit streaks | Progress | 3 | Free | New |
| F-035 | Goals linked to tasks and habits | Progress | 3 | Free | New |
| F-036 | Estimate accuracy and best-time insights | Progress | 3 | Free | New |
| F-037 | Weekly and monthly review cards | Progress | 3 | Free | Existing |
| F-038 | Export CSV / JSON, PDF reports | Progress | 4 | Free | Existing |
| F-039 | Three-layer animation system | Motivation | 3 | Free | Existing |
| F-040 | Apex visual and growth stages | Motivation | 3 | Free | Existing |
| F-041 | XP, levels, 40+ achievements, 200+ lines | Motivation | 3 | Free | Existing |
| F-042 | Daily quests (opt-in) | Motivation | 6 | Free | New |
| F-043 | Weekly recap animation | Motivation | 3 | Free | New |
| F-044 | Minimal mode (hide XP and quests) | Motivation / Settings | 3 | Free | New |
| F-045 | 8+ themes and design system | Design | 1/3 | Free | Existing |
| F-046 | Density setting (comfortable / compact) | Design | 3 | Free | New |
| F-047 | Accessibility and keyboard shortcuts | Design | 1–5 | Free | Existing |
| F-048 | Accounts, guest mode and sync | Accounts | 4 | Free | Existing |
| F-049 | Web Push, in-tab alerts, email digests | Notifications | 4 | Free | Existing |
| F-050 | Notification rate limit and grouping | Notifications | 4 | Free | New |
| F-051 | ICS import/export and holiday calendars | Integrations | 4/6 | Free | Existing |
| F-052 | Plain-text and CSV task import | Integrations | 4 | Free | New |
| F-053 | Trash (30-day restore) and history log | Data | 1 | Free | New |
| F-054 | Interactive first-run tour | Onboarding | 5 | Free | New |
| F-055 | User-set task time window with timer modes (free, countdown, sprint, tiny start) | Today | 1 | Free | New |
| F-056 | Start nudges (delay, caps, muting) | Start support | 1 | Free | New |
| F-057 | Anti-procrastination tips library (50+) and Stuck? picker | Start support | 1 | Free | New |
| F-058 | Break it down (task to subtasks) | Start support | 1 | Free | New |
| F-059 | Partial progress tiers (20% / 50%) with partial credit | Today / Progress | 1 | Free | New |
| F-060 | Schedule the rest (follow-up for remaining minutes) | Today | 1 | Free | New |
| F-061 | Start rate and Rescued-tasks insights; starter achievements | Progress | 3 | Free | New |

---

## Appendix B: Glossary

| Term | Meaning |
|---|---|
| Routine | A named, repeating set of timed tasks |
| Task Instance | One concrete task on one date, generated from a Routine or created manually |
| Override | A one-off exception on top of a Routine rule (skip, move, edit) |
| ShiftBatch | A group of overrides applied as one reversible shift |
| Day Order | A numbered position in a college's rotating timetable cycle |
| Fixed item | A task that shifts never move |
| Top 3 | The three tasks a user pins as the day's priority |
| Inbox | Unscheduled capture list that becomes tasks when scheduled |
| Focus Mode | Distraction-free full-screen view for one task |
| Apex | The growing visual that reflects discipline over time |
| Freeze | A user-approved streak protection for a missed day |
| Sealed day | A closed day in history, editable only through a logged history edit or the 24-hour grace window |
