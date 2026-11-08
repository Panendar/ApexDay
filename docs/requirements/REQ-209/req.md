# User can see partial progress counted fairly

## Story
As a user, I can see Started, Good start and Halfway+ labels on cards, with fractional credit toward the day ring.

## Purpose
Spending 20-50% of a task is a win, not a failure.

Serves intent goal: G4

## Behaviour and acceptance criteria
- Progress is focus time divided by planned duration, capped at 100%, and subtasks can raise it (the higher is used)
- Tiers: under 20% Started (no credit), 20% Good start (0.25), 50% Halfway+ (0.5), 100% or done is full credit
- Credit uses real tracked focus time only, with a 1-minute minimum per round and a daily XP cap
- Weights and thresholds are configurable in Settings within bounds
- End of Day shows which tasks were partial

## Order
Order: 27 of 70
Group: 2. Start support
Depends on: User can set a task's time window and run a timer inside it

## Source documents
- docs/project/requirements.md, section(s) 5.5 E, 11 #44
- docs/project/intent.md

## Open questions
- Exact bounds for the configurable weights are not defined.
