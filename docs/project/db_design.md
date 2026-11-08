# DB design
Target DB: SQLite 3.45 (same schema on the device and on the sync server)
Constraints:
- Names: snake_case, plural table names. Ids: UUID v7 as TEXT, generated on the client (offline creation).
- Types: TEXT, INTEGER, REAL only. Dates `YYYY-MM-DD`, times `HH:mm` (local wall clock), timestamps UTC ISO-8601 TEXT, booleans INTEGER 0/1, JSON as TEXT with `json_valid`. Foreign keys on (`PRAGMA foreign_keys = ON`).
- Sync columns: `created_at`, `updated_at`, `field_versions_json` (per-field timestamps for last-writer-wins) on every editable table. Append-only tables (completions, habit_logs, xp_events, logs, reference tables) have `created_at` only and merge by union.
- Soft delete: `deleted_at` on user-editable tables (Trash keeps 30 days, then purge). Append-only tables are never deleted.
- Ownership: user-owned tables carry `user_id`; child tables (e.g. subtasks, class_slots) are owned through their parent and omit it. Indexes lead with `user_id` where queried by user and date.
- 3NF where practical. Deviations: `streaks` and `daily_totals` are rebuildable caches; `completions.xp` mirrors `xp_events`. The requirement's `*_json` fields became tables (subtasks, task_links, task_tags, user_settings, timetable_alignments, hidden tips). Kept as JSON: `shift_batches.snapshot_json`, `overrides.payload_json`, `devices.push_subscription_json`, log before/after values.
- Removed from the requirement's data model: `users.plan` (the product has no paid tier); `users.settings_json` (replaced by `user_settings`); `tips.hidden_by_user` (replaced by `user_hidden_tips`).
- Defaults shown as `now` mean the current UTC timestamp.
Sources: docs/project/requirements.md v1.1 (section 4 data model, sections 5-11, Appendix A), docs/project/intent.md, docs/requirements/REQ-184 to REQ-253 (req.md and mock.md; the mocks are ASCII sketches only).
Tables: db_design_tables.csv (Status: New = proposed by Claude · Feedback = open feedback to apply or answer · Final = accepted)

## Columns
### users
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| name | TEXT | N | '' |  |  |  | Display name |
| email | TEXT | Y | NULL | UQ |  | lower-case | Sign-in email |
| timezone | TEXT | N | 'UTC' |  |  | IANA name | User time zone |
| week_start | INTEGER | N | 1 |  |  | in (1,7) | 1 Monday, 7 Sunday |
| day_start_hour | INTEGER | N | 4 |  |  | 0-12 | Hour a day starts; earlier work counts for the previous day |
| theme | TEXT | N | 'auto' |  |  |  | Theme code (light, dark, sunrise, ...) |
| deletion_requested_at | TEXT | Y | NULL |  |  |  | Account deletion due within 30 days |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### user_settings
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| user_id | TEXT | N |  | PK, FK -> users.id |  | on delete cascade | Owner |
| density | TEXT | N | 'comfortable' |  |  | in (comfortable,compact) | Spacing |
| time_format | TEXT | N | '24h' |  |  | in (12h,24h) | Clock format |
| locale | TEXT | N | 'en' |  |  |  | UI language |
| plan_prompt_time | TEXT | N | '21:00' |  |  | HH:mm | Plan Tomorrow prompt time |
| close_day_time | TEXT | Y | NULL |  |  | HH:mm | End of Day card time; NULL = after last task |
| planning_day | INTEGER | N | 7 |  |  | 1-7 | Weekly planning day |
| planning_time | TEXT | Y | NULL |  |  | HH:mm | NULL = evening default |
| snap_grid_min | INTEGER | N | 15 |  |  | in (5,10,15,30) | Planner snap grid |
| overload_limit_min | INTEGER | N | 840 |  |  | >0 | Load meter warning limit |
| streak_threshold_pct | INTEGER | N | 70 |  |  | 0-100 | Completion needed for a streak day |
| streak_freezes_per_month | INTEGER | N | 2 |  |  | >=0 | Freezes granted per month |
| partial_tier1_pct | INTEGER | N | 20 |  |  | 0-100 | Good start threshold |
| partial_tier2_pct | INTEGER | N | 50 |  |  | > tier1 | Halfway+ threshold |
| partial_credit1 | REAL | N | 0.25 |  |  | 0-1 | Credit at tier 1 |
| partial_credit2 | REAL | N | 0.5 |  |  | 0-1 | Credit at tier 2 |
| xp_daily_cap | INTEGER | Y | NULL |  |  | >0 | Daily XP cap; value set in README |
| minimal_mode | INTEGER | N | 0 |  |  | 0/1 | Hide XP and quests |
| reduced_motion | TEXT | N | 'system' |  |  | in (system,on,off) | Motion preference |
| sound_enabled | INTEGER | N | 0 |  |  | 0/1 | Chimes and sounds |
| tone | TEXT | N | 'calm' |  |  | in (calm,energetic,tough) | Tip and message tone |
| tips_enabled | INTEGER | N | 1 |  |  | 0/1 | Show tips |
| nudges_enabled | INTEGER | N | 1 |  |  | 0/1 | Start nudges global switch |
| nudge_delay_min | INTEGER | N | 5 |  |  | >=0 | Minutes after start before a nudge |
| nudge_daily_cap | INTEGER | N | 5 |  |  | >=0 | Max nudges per day |
| quiet_hours_start | TEXT | Y | NULL |  |  | HH:mm | Quiet hours start |
| quiet_hours_end | TEXT | Y | NULL |  |  | HH:mm | Quiet hours end |
| notif_daily_max | INTEGER | N | 8 |  |  | >=0 | Max notifications per day |
| notif_lead_min | INTEGER | Y | NULL |  |  | >=0 | Default reminder lead; NULL = at start |
| in_tab_alerts | INTEGER | N | 1 |  |  | 0/1 | In-tab alerts |
| focus_work_min | INTEGER | N | 25 |  |  | >0 | Pomodoro work |
| focus_break_min | INTEGER | N | 5 |  |  | >0 | Pomodoro break |
| focus_long_break_min | INTEGER | N | 15 |  |  | >0 | Long break after 4 rounds |
| tiny_work_min | INTEGER | N | 5 |  |  | >0 | Tiny Start work |
| tiny_break_min | INTEGER | N | 2 |  |  | >0 | Tiny Start break |
| ambient_sound | TEXT | Y | NULL |  |  | in (rain,cafe,white_noise) | NULL = off |
| quests_enabled | INTEGER | N | 0 |  |  | 0/1 | Daily quests opt-in |
| seasonal_events_enabled | INTEGER | N | 1 |  |  | 0/1 | Show seasonal looks |
| analytics_opt_in | INTEGER | N | 0 |  |  | 0/1 | Anonymous analytics opt-in |
| analytics_opt_in_at | TEXT | Y | NULL |  |  |  | When the choice was made |
| onboarding_goal | TEXT | Y | NULL |  |  |  | Goal picked in first run |
| onboarding_done_at | TEXT | Y | NULL |  |  |  | First run finished |
| tour_done_at | TEXT | Y | NULL |  |  |  | Tour finished or skipped |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### auth_identities
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| provider | TEXT | N |  |  |  | in (email,google) | Identity provider |
| provider_subject | TEXT | N |  |  |  | UQ (provider, provider_subject) | Provider user id or email |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### login_tokens
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| token_hash | TEXT | N |  | UQ |  |  | Hash of the token |
| expires_at | TEXT | N |  |  |  |  | Expiry |
| used_at | TEXT | Y | NULL |  |  |  | When consumed |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### devices
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| name | TEXT | Y | NULL |  |  |  | Label |
| push_subscription_json | TEXT | Y | NULL |  |  | json_valid | Web Push subscription |
| last_seen_at | TEXT | Y | NULL |  |  |  | Last activity |
| last_sync_at | TEXT | Y | NULL |  |  |  | Last successful sync |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### categories
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| name | TEXT | N |  |  |  | UQ (user_id, name) where deleted_at is null | Name |
| color | TEXT | N |  |  |  |  | Hex colour |
| icon | TEXT | Y | NULL |  |  |  | Icon code |
| weekly_goal_min | INTEGER | Y | NULL |  |  | >0 | Weekly minutes goal |
| sort_order | INTEGER | N | 0 |  |  |  | Display order |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### category_prefs
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| category_id | TEXT | N |  | FK -> categories.id |  | UQ; on delete cascade | Category |
| last_timer_mode | TEXT | Y | NULL |  |  | in (free,countdown,sprint,tiny_start) | Remembered timer mode |
| nudges_enabled | INTEGER | N | 1 |  |  | 0/1 | Start nudges for this category |
| notify_enabled | INTEGER | N | 1 |  |  | 0/1 | Reminders for this category |
| lead_min | INTEGER | Y | NULL |  |  | >=0 | Reminder lead override |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### tags
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| name | TEXT | N |  |  |  | UQ (user_id, name) where deleted_at is null | Name |
| color | TEXT | Y | NULL |  |  |  | Hex colour |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### task_tags
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| task_id | TEXT | N |  | PK, FK -> tasks.id |  | on delete cascade | Task |
| tag_id | TEXT | N |  | PK, FK -> tags.id | tag_id | on delete cascade | Tag |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### routines
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| name | TEXT | N |  |  |  |  | Name |
| color | TEXT | Y | NULL |  |  |  | Hex colour |
| icon | TEXT | Y | NULL |  |  |  | Icon code |
| category_id | TEXT | Y | NULL | FK -> categories.id |  | on delete set null | Default category |
| timetable_id | TEXT | Y | NULL | FK -> timetables.id |  | on delete set null | Set for day-order routines |
| recurrence_rule | TEXT | N |  |  |  |  | Daily, weekdays, every N days or day order |
| active_from | TEXT | N |  |  | (user_id, active_from) | date | First active date |
| active_until | TEXT | Y | NULL |  |  | >= active_from | Last active date (semester end) |
| archived_at | TEXT | Y | NULL |  |  |  | Archived by the user |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### routine_tasks
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| routine_id | TEXT | N |  | FK -> routines.id | routine_id | on delete cascade | Routine |
| title | TEXT | N |  |  |  |  | Title |
| start_time | TEXT | N |  |  |  | HH:mm | Start (wall clock) |
| duration_min | INTEGER | N |  |  |  | >0 | Minutes |
| sort_order | INTEGER | N | 0 |  |  |  | Order in routine |
| around_classes | INTEGER | N | 0 |  |  | 0/1 | Re-fit into free gaps when day order changes |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### routine_pauses
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| routine_id | TEXT | N |  | FK -> routines.id | routine_id | on delete cascade | Routine |
| from_date | TEXT | N |  |  |  | date | First paused day |
| to_date | TEXT | N |  |  |  | >= from_date | Last paused day |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### tasks
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| title | TEXT | N |  |  | FTS5 (title, notes) |  | Title |
| notes | TEXT | Y | NULL |  |  |  | Notes |
| category_id | TEXT | Y | NULL | FK -> categories.id |  | on delete set null | Category |
| priority | TEXT | N | 'medium' |  |  | in (low,medium,high) | Priority |
| energy | TEXT | Y | NULL |  |  | in (low,medium,high) | Energy needed |
| date | TEXT | N |  |  | (user_id, date, start_time) | date | Day the task belongs to |
| start_time | TEXT | Y | NULL |  |  | HH:mm | Start; NULL = untimed |
| duration_min | INTEGER | Y | NULL |  |  | >0 | Planned minutes |
| is_fixed | INTEGER | N | 0 |  |  | 0/1 | Shifts never move it |
| is_top3 | INTEGER | N | 0 |  | (user_id, date) where is_top3=1 | 0/1; max 3 per day (app rule) | Pinned Top 3 |
| goal_id | TEXT | Y | NULL | FK -> goals.id | goal_id | on delete set null | Linked goal |
| habit_id | TEXT | Y | NULL | FK -> habits.id |  | on delete set null | Habit scheduled as a task |
| source | TEXT | N | 'manual' |  |  | in (manual,routine,shifted,import,inbox) | How it was created |
| routine_task_id | TEXT | Y | NULL | FK -> routine_tasks.id |  | UQ (routine_task_id, date) where deleted_at is null and routine_task_id is not null | Generating template task |
| status | TEXT | N | 'planned' |  | (user_id, status) | in (planned,in_progress,done,skipped,moved,missed) | Status |
| skip_reason | TEXT | Y | NULL |  |  |  | Reason when skipped |
| timer_mode | TEXT | Y | NULL |  |  | in (free,countdown,sprint,tiny_start) | Chosen timer mode |
| reminder_lead_min | INTEGER | Y | NULL |  |  | >=0 | Reminder lead; NULL = no reminder |
| parent_task_id | TEXT | Y | NULL | FK -> tasks.id |  |  | Task this follows up (Schedule the rest) |
| moved_to_task_id | TEXT | Y | NULL | FK -> tasks.id |  |  | Copy created when status = moved |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### subtasks
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| task_id | TEXT | N |  | FK -> tasks.id | task_id | on delete cascade | Task |
| title | TEXT | N |  |  |  |  | Title |
| sort_order | INTEGER | N | 0 |  |  |  | Order |
| time_slice_min | INTEGER | Y | NULL |  |  | >0 | Planned minutes |
| is_done | INTEGER | N | 0 |  |  | 0/1 | Done |
| done_at | TEXT | Y | NULL |  |  |  | When done |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### task_links
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| task_id | TEXT | N |  | FK -> tasks.id | task_id | on delete cascade | Task |
| url | TEXT | N |  |  |  |  | URL |
| label | TEXT | Y | NULL |  |  |  | Label |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### task_templates
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| name | TEXT | N |  |  |  |  | Template name |
| title | TEXT | N |  |  |  |  | Task title |
| notes | TEXT | Y | NULL |  |  |  | Notes |
| category_id | TEXT | Y | NULL | FK -> categories.id |  | on delete set null | Category |
| priority | TEXT | N | 'medium' |  |  | in (low,medium,high) | Priority |
| energy | TEXT | Y | NULL |  |  | in (low,medium,high) | Energy |
| duration_min | INTEGER | Y | NULL |  |  | >0 | Minutes |
| reminder_lead_min | INTEGER | Y | NULL |  |  | >=0 | Reminder lead |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### template_subtasks
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| template_id | TEXT | N |  | FK -> task_templates.id | template_id | on delete cascade | Template |
| title | TEXT | N |  |  |  |  | Title |
| sort_order | INTEGER | N | 0 |  |  |  | Order |
| time_slice_min | INTEGER | Y | NULL |  |  | >0 | Planned minutes |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### inbox_items
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| text | TEXT | N |  |  |  |  | Captured text |
| promoted_task_id | TEXT | Y | NULL | FK -> tasks.id |  | on delete set null | Task made from it |
| archived_at | TEXT | Y | NULL |  | (user_id, archived_at) |  | Archived or dropped |
| note | TEXT | Y | NULL |  |  |  | Note, e.g. restored from Trash |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### day_plans
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| date | TEXT | N |  |  |  | UQ (user_id, date); date | Local date |
| day_type | TEXT | N | 'normal' |  |  | in (normal,holiday,exam,rest,day_order) | Day type |
| day_order_index | INTEGER | Y | NULL |  |  | >=1 | Day order applied |
| timetable_id | TEXT | Y | NULL | FK -> timetables.id |  | on delete set null | Timetable of the day order |
| is_locked | INTEGER | N | 0 |  |  | 0/1 | Day locked (Start my day) |
| locked_at | TEXT | Y | NULL |  |  |  | When locked |
| sealed_at | TEXT | Y | NULL |  |  |  | When sealed into history |
| intention | TEXT | Y | NULL |  |  |  | One-line intention |
| mood | INTEGER | Y | NULL |  |  | 1-5 | Check-in mood |
| energy_morning | TEXT | Y | NULL |  |  | in (low,okay,high) | Morning energy |
| note | TEXT | Y | NULL |  |  |  | Evening note |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### shift_batches
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| kind | TEXT | N |  |  |  | in (push_forward,pull_back,swap_days,set_day_order,mark_holiday,shift_times,compress,move_skip,reset_day,distribute,stack) | Operation |
| scope | TEXT | N |  |  |  | in (today,week,until_date,routine_end) | Scope |
| from_date | TEXT | N |  |  | (user_id, from_date) | date | First affected date |
| to_date | TEXT | Y | NULL |  |  | >= from_date | Last affected date |
| snapshot_json | TEXT | N |  |  |  | json_valid | State before the batch |
| moved_count | INTEGER | N | 0 |  |  | >=0 | Tasks moved |
| skipped_count | INTEGER | N | 0 |  |  | >=0 | Tasks skipped |
| overflow_count | INTEGER | N | 0 |  |  | >=0 | Tasks in overflow |
| fixed_protected_count | INTEGER | N | 0 |  |  | >=0 | Fixed items protected |
| undone_at | TEXT | Y | NULL |  |  |  | When undone |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### overrides
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| date | TEXT | N |  |  | (user_id, date) | date | Affected date |
| routine_task_id | TEXT | Y | NULL | FK -> routine_tasks.id |  | on delete cascade | Rule overridden |
| task_id | TEXT | Y | NULL | FK -> tasks.id |  | on delete cascade | Concrete task overridden |
| action | TEXT | N |  |  |  | in (skip,move,edit); one of routine_task_id/task_id not null | Action |
| payload_json | TEXT | Y | NULL |  |  | json_valid | New values |
| reason | TEXT | Y | NULL |  |  |  | Reason |
| batch_id | TEXT | Y | NULL | FK -> shift_batches.id | batch_id | on delete cascade | Shift batch |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### timetables
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| name | TEXT | N |  |  |  |  | Name |
| cycle_type | TEXT | N |  |  |  | in (weekly,day_order) | Cycle type |
| cycle_length | INTEGER | N |  |  |  | 2-10 | Positions in the cycle |
| attendance_limit_pct | INTEGER | N | 75 |  |  | 0-100 | Attendance warning limit |
| version | INTEGER | N | 1 |  |  | >=1 | Bumped on each change, for share updates |
| source_share_id | TEXT | Y | NULL | FK -> timetable_shares.id |  | on delete set null | Share this copy came from |
| source_version | INTEGER | Y | NULL |  |  |  | Version imported |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### timetable_shares
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| timetable_id | TEXT | N |  | FK -> timetables.id | timetable_id | on delete cascade | Shared timetable |
| token_hash | TEXT | N |  | UQ |  |  | Hash of the link token |
| revoked_at | TEXT | Y | NULL |  |  |  | Link revoked |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### timetable_alignments
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| timetable_id | TEXT | N |  | FK -> timetables.id |  | UQ (timetable_id, anchor_date); on delete cascade | Timetable |
| anchor_date | TEXT | N |  |  |  | date | Date fixed to the position |
| anchor_position | INTEGER | N |  |  |  | >=1 | Day order on that date |
| batch_id | TEXT | Y | NULL | FK -> shift_batches.id | batch_id | on delete cascade | Shift batch that set it |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### class_slots
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| timetable_id | TEXT | N |  | FK -> timetables.id | (timetable_id, cycle_position) | on delete cascade | Timetable |
| cycle_position | INTEGER | N |  |  |  | >=1 | Day order or weekday number |
| subject | TEXT | N |  |  |  |  | Subject |
| start_time | TEXT | N |  |  |  | HH:mm | Start |
| end_time | TEXT | N |  |  |  | > start_time | End |
| room | TEXT | Y | NULL |  |  |  | Room |
| teacher | TEXT | Y | NULL |  |  |  | Teacher |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### attendance
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| class_slot_id | TEXT | N |  | FK -> class_slots.id |  | UQ (class_slot_id, date); on delete cascade | Class |
| date | TEXT | N |  |  | (user_id, date) | date | Date of the class |
| status | TEXT | N |  |  |  | in (attended,absent,cancelled) | Status |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### calendar_entries
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| date | TEXT | N |  |  | (user_id, date) | date | Date |
| kind | TEXT | N |  |  |  | in (holiday,exam,event) | Kind |
| title | TEXT | N |  |  |  |  | Title |
| source | TEXT | N | 'manual' |  |  | in (manual,ics,holiday_calendar) | Origin |
| holiday_date_id | TEXT | Y | NULL | FK -> holiday_dates.id |  | on delete set null | Holiday it came from |
| shift_prompted_at | TEXT | Y | NULL |  |  |  | "Shift your plan?" shown |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### holiday_calendars
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| country | TEXT | N |  |  |  | ISO 3166-1 alpha-2 | Country |
| region | TEXT | Y | NULL |  |  | UQ (country, region) | State or region |
| name | TEXT | N |  |  |  |  | Name |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### holiday_dates
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| holiday_calendar_id | TEXT | N |  | FK -> holiday_calendars.id |  | UQ (holiday_calendar_id, date) | Calendar |
| date | TEXT | N |  |  | date | date | Date |
| title | TEXT | N |  |  |  |  | Holiday name |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### user_holiday_calendars
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| holiday_calendar_id | TEXT | N |  | FK -> holiday_calendars.id |  | UQ (user_id, holiday_calendar_id) | Calendar |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### ics_feeds
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| direction | TEXT | N |  |  |  | in (import,export) | Direction |
| url | TEXT | Y | NULL |  |  | required if import | Feed URL to import |
| token_hash | TEXT | Y | NULL | UQ |  | required if export | Hash of export feed token |
| last_synced_at | TEXT | Y | NULL |  |  |  | Last import |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### focus_sessions
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| task_id | TEXT | N |  | FK -> tasks.id | (task_id, started_at) | on delete cascade | Task |
| started_at | TEXT | N |  |  | (user_id, started_at) |  | Start |
| ended_at | TEXT | Y | NULL |  |  | >= started_at | End; NULL while running |
| planned_min | INTEGER | Y | NULL |  |  | >0 | Planned minutes |
| actual_min | INTEGER | Y | NULL |  |  | >=0 | Tracked minutes |
| mode | TEXT | N |  |  |  | in (free,countdown,sprint,tiny_start) | Timer mode |
| work_min | INTEGER | Y | NULL |  |  | >0 | Work length (sprint) |
| break_min | INTEGER | Y | NULL |  |  | >0 | Break length (sprint) |
| round_no | INTEGER | Y | NULL |  |  | >=1 | Round number |
| interruptions | INTEGER | N | 0 |  |  | >=0 | Counted, not judged |
| last_heartbeat_at | TEXT | Y | NULL |  |  |  | Last heartbeat; keeps time if the tab closes |
| duration_confirmed | INTEGER | N | 1 |  |  | 0/1 | 0 = ask the user to confirm after auto-end |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### completions
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| task_id | TEXT | N |  | FK -> tasks.id | task_id |  | Task completed |
| date | TEXT | N |  |  | (user_id, date) | date | Day it counts for |
| completed_at | TEXT | N |  |  |  |  | When completed |
| actual_min | INTEGER | Y | NULL |  |  | >=0 | Tracked minutes |
| on_time | INTEGER | N | 1 |  |  | 0/1 | 0 = done late or in grace window |
| xp | INTEGER | N | 0 |  |  | >=0 | XP of this completion (mirrors xp_events) |
| undone_at | TEXT | Y | NULL |  |  |  | Set by Undo; ignored in totals |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### start_nudges
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| task_id | TEXT | N |  | FK -> tasks.id |  | UQ (one nudge per task); on delete cascade | Task nudged |
| shown_at | TEXT | N |  |  | (user_id, shown_at) |  | When shown |
| tip_id | TEXT | Y | NULL | FK -> tips.id |  | on delete set null | Tip shown |
| action_taken | TEXT | Y | NULL |  |  | in (started,tiny_start,break_down,moved,dismissed) | User action |
| reached_pct | REAL | Y | NULL |  |  | 0-100 | Progress reached later |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### tips
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| text | TEXT | N |  |  |  |  | Tip text |
| context | TEXT | N |  |  | context | in (big,boring,tired,slump,missed_start,general) | When shown |
| tone | TEXT | N | 'calm' |  |  | in (calm,energetic,tough) | Tone |
| is_active | INTEGER | N | 1 |  |  | 0/1 | Available |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### user_hidden_tips
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| tip_id | TEXT | N |  | FK -> tips.id |  | UQ (user_id, tip_id); on delete cascade | Hidden tip |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### motivation_lines
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| text | TEXT | N |  |  |  |  | Line |
| context | TEXT | N |  |  | context | in (morning,behind,comeback,milestone,focus,start,shift) | When shown |
| tone | TEXT | N | 'calm' |  |  | in (calm,energetic,tough) | Tone |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### habits
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| name | TEXT | N |  |  |  |  | Name |
| icon | TEXT | Y | NULL |  |  |  | Icon code |
| color | TEXT | Y | NULL |  |  |  | Hex colour |
| cadence | TEXT | N | 'daily' |  |  | in (daily,weekdays,n_per_week) | Cadence |
| times_per_week | INTEGER | Y | NULL |  |  | 1-7; required if n_per_week | Times per week |
| target_count | INTEGER | N | 1 |  |  | >0 | Target per day |
| unit | TEXT | Y | NULL |  |  |  | Unit, e.g. glasses |
| goal_id | TEXT | Y | NULL | FK -> goals.id | goal_id | on delete set null | Linked goal |
| paused_until | TEXT | Y | NULL |  |  | date | Paused through this date |
| archived_at | TEXT | Y | NULL |  |  |  | Archived |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### habit_logs
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| habit_id | TEXT | N |  | FK -> habits.id | (habit_id, date) | on delete cascade | Habit |
| date | TEXT | N |  |  | (user_id, date) | date | Day logged for |
| count | INTEGER | N | 1 |  |  | >0 | Amount logged |
| logged_at | TEXT | N |  |  |  |  | When logged |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### goals
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| title | TEXT | N |  |  |  |  | Title |
| category_id | TEXT | Y | NULL | FK -> categories.id |  | on delete set null | Category |
| target_type | TEXT | N |  |  |  | in (hours,tasks,habit_days,date) | Target kind |
| target_value | REAL | Y | NULL |  |  | >0 | Target amount; NULL for date goals |
| due_date | TEXT | Y | NULL |  |  | date | Due date |
| achieved_at | TEXT | Y | NULL |  |  |  | When achieved |
| archived_at | TEXT | Y | NULL |  |  |  | Archived when deleted with linked tasks |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |
| deleted_at | TEXT | Y | NULL |  | (deleted_at) |  | Soft delete (Trash) |

### streaks
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| scope | TEXT | N |  |  |  | in (overall,category,routine,habit) | Streak scope |
| scope_ref_id | TEXT | Y | NULL |  |  | UQ (user_id, scope, coalesce(scope_ref_id,'')) | Category, routine or habit id; NULL for overall |
| current | INTEGER | N | 0 |  |  | >=0 | Current length |
| best | INTEGER | N | 0 |  |  | >= current | Best length |
| freezes_left | INTEGER | N | 0 |  |  | >=0 | Freezes left this month |
| last_counted_date | TEXT | Y | NULL |  |  | date | Last day counted |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### streak_freezes
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| streak_id | TEXT | N |  | FK -> streaks.id |  | UQ (streak_id, date); on delete cascade | Streak protected |
| date | TEXT | N |  |  | (user_id, date) | date | Day covered |
| consented_at | TEXT | N |  |  |  |  | User approval time |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### achievement_defs
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| code | TEXT | N |  | PK |  |  | Stable code, e.g. first_starter |
| name | TEXT | N |  |  |  |  | Name |
| description | TEXT | N |  |  |  |  | How to earn it |
| category | TEXT | N |  |  |  | in (consistency,timing,comeback,mastery,shifting,attendance,focus,habits,goals) | Group |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### achievements
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| code | TEXT | N |  | FK -> achievement_defs.code |  | UQ (user_id, code) | Achievement |
| unlocked_at | TEXT | N |  |  |  |  | When unlocked |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### reflections
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| period | TEXT | N |  |  |  | in (day,week,month) | Period kind |
| period_start | TEXT | N |  |  |  | UQ (user_id, period, period_start); date | First day of the period |
| text | TEXT | Y | NULL |  |  |  | Note |
| rating | INTEGER | Y | NULL |  |  | 1-5 | Rating |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### apex_states
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| visual_theme | TEXT | N | 'mountain' |  |  | in (mountain,tree,flame,skyline,constellation) | Visual |
| stage | INTEGER | N | 1 |  |  | >=1 | Stage reached |
| daily_state | TEXT | N | 'normal' |  |  | in (dim,normal,bright) | Today's state |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### xp_events
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| date | TEXT | N |  |  | (user_id, date) | date | Day it counts for |
| source | TEXT | N |  |  |  | in (task,partial,top3_bonus,quest,ritual,achievement) | Source |
| source_id | TEXT | Y | NULL |  |  |  | Id of the source row |
| xp | INTEGER | N |  |  |  |  | XP awarded |
| undone_at | TEXT | Y | NULL |  |  |  | Set when the source is undone |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### quest_defs
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| code | TEXT | N |  | UQ |  |  | Stable code |
| text | TEXT | N |  |  |  |  | Quest text |
| xp | INTEGER | N |  |  |  | >0 | XP reward |
| is_active | INTEGER | N | 1 |  |  | 0/1 | In rotation |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### user_quests
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| date | TEXT | N |  |  |  | UQ (user_id, date); date | Day of the quest |
| quest_id | TEXT | N |  | FK -> quest_defs.id |  |  | Quest |
| completed_at | TEXT | Y | NULL |  |  |  | When completed |
| xp_awarded | INTEGER | N | 0 |  |  | >=0 | XP given |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### seasonal_events
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| code | TEXT | N |  | UQ |  |  | Stable code |
| name | TEXT | N |  |  |  |  | Name |
| start_date | TEXT | N |  |  | (start_date, end_date) | date | First day |
| end_date | TEXT | N |  |  |  | >= start_date | Last day |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### weekly_plans
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| week_start | TEXT | N |  |  |  | UQ (user_id, week_start); date | First day of the week |
| step | INTEGER | N | 1 |  |  | 1-3 | Last step reached |
| goal_text | TEXT | Y | NULL |  |  |  | Week goal |
| headline | TEXT | Y | NULL |  |  |  | Week headline |
| completed_at | TEXT | Y | NULL |  |  |  | Ritual finished |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### conflict_log
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| entity_table | TEXT | N |  |  | (entity_table, entity_id) |  | Table of the row |
| entity_id | TEXT | N |  |  |  |  | Row id |
| field | TEXT | N |  |  |  |  | Field in conflict |
| kept_value_json | TEXT | Y | NULL |  |  | json_valid | Winning value |
| discarded_value_json | TEXT | Y | NULL |  |  | json_valid | Losing value |
| kept_device_id | TEXT | Y | NULL | FK -> devices.id |  | on delete set null | Device of winner |
| discarded_device_id | TEXT | Y | NULL | FK -> devices.id |  | on delete set null | Device of loser |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### history_log
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| entity_table | TEXT | N |  |  |  |  | Table edited |
| entity_id | TEXT | N |  |  |  |  | Row edited |
| date | TEXT | Y | NULL |  | (user_id, date) | date | Sealed day edited |
| action | TEXT | N |  |  |  |  | Edit made, e.g. mark done |
| before_json | TEXT | Y | NULL |  |  | json_valid | Before |
| after_json | TEXT | Y | NULL |  |  | json_valid | After |
| reason | TEXT | Y | NULL |  |  |  | Reason |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### notification_log
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| channel | TEXT | N |  |  |  | in (in_tab,push,email) | Channel |
| kind | TEXT | N |  |  |  |  | Task start, task end, needs attention, digest, ... |
| task_id | TEXT | Y | NULL | FK -> tasks.id |  | on delete set null | Related task |
| group_id | TEXT | Y | NULL |  |  |  | Group of notifications fired together |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |

### email_preferences
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| id | TEXT | N |  | PK |  | UUIDv7 | Id |
| user_id | TEXT | N |  | FK -> users.id | user_id | on delete cascade | Owner |
| kind | TEXT | N |  |  |  | UQ (user_id, kind); in (daily_plan,weekly_review,streak_at_risk,yearly_export) | Email type |
| enabled | INTEGER | N | 0 |  |  | 0/1 | Opt-in |
| unsubscribe_token_hash | TEXT | N |  | UQ |  |  | Hash of one-click unsubscribe token |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

### daily_totals
| Column | Type | Null | Default | Key / FK | Index | Constraints | Description |
|---|---|---|---|---|---|---|---|
| user_id | TEXT | N |  | PK, FK -> users.id |  | on delete cascade | Owner |
| date | TEXT | N |  | PK |  | date | Day |
| planned_count | INTEGER | N | 0 |  |  | >=0 | Tasks counted in the denominator |
| done_count | INTEGER | N | 0 |  |  | >=0 | Fully done tasks |
| credit_sum | REAL | N | 0 |  |  | >=0 | Done plus partial credit |
| completion_pct | REAL | N | 0 |  |  | 0-100 | credit_sum / planned_count |
| planned_min | INTEGER | N | 0 |  |  | >=0 | Planned minutes |
| focus_min | INTEGER | N | 0 |  |  | >=0 | Tracked minutes |
| top3_planned | INTEGER | N | 0 |  |  | 0-3 | Top 3 count |
| top3_done | INTEGER | N | 0 |  |  | 0-3 | Top 3 done |
| xp | INTEGER | N | 0 |  |  | >=0 | XP earned |
| streak_counted | INTEGER | N | 0 |  |  | 0/1 | Day met the streak threshold |
| created_at | TEXT | N | now |  |  | UTC ISO-8601 | Created |
| updated_at | TEXT | N | now |  |  | UTC ISO-8601 | Last change |
| field_versions_json | TEXT | N | '{}' |  |  | json_valid | Per-field timestamps for sync |

