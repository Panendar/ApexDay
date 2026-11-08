# User can use guest mode and then sign in without losing data

## Story
As a user, I can use the whole app as a guest, then sign in by magic link or Google and migrate all data.

## Purpose
Guest mode lets people try before signing up.

Serves intent goal: G6

## Behaviour and acceptance criteria
- Guest mode keeps data locally and offers to create an account later, migrating all data
- Sign in by email magic link and Google
- Guest users are warned that local data can be lost
- Session expiry while offline keeps queued edits and re-login does not discard them

## Order
Order: 56 of 70
Group: 5. Accounts, sync and data
Depends on: User can add a timed task to the day timeline; Developer can merge edits from two offline copies without losing data

## Source documents
- docs/project/requirements.md, section(s) 10.1, 5.4, 11 #27, #29
- docs/project/intent.md

## Open questions
- None beyond the stack choice recorded in the README (section 2.2).
