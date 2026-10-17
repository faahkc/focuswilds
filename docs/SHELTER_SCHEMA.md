# Shelter domain checkpoint

The replacement model lives in `src/lib/shelter.ts`. It is not connected to the application, Firebase, or browser storage. Existing accounts and timers are unchanged. This is the first increment of delivery step 2, not a playable replacement.

## State and commands

`Shelter` schema 1 groups the account language, revision, aggregate focus seconds and completed-session count, fort capacity, materials, survivors, and one active expedition. IDs and job/item names are stable English identifiers rather than UI copy. Every command clones the state; failed validation leaves its input intact. Language defaults to `en` and accepts only `en` or `th`.

Commands require an expected revision. Stale commands fail rather than repeating progress. Event commands additionally require the expected expedition event number. The offline transaction test simulates a committed write with a lost response: retrying the old revision cannot award focus again. This does not yet provide persisted receipts or reconcile uncertain saves for the UI.

Focus commands carry active seconds, target seconds, and completion status. Partial sessions advance all assigned jobs without increasing the completed-session count. Jobs finish once; unused focus after completion is not automatically assigned to another job. A full store retains completed garden work until capacity becomes available. Materials are charged on assignment, with no cancellation command yet.

## Trial balance

| Value | Initial trial |
| --- | --- |
| Survivors / housing | 5 / 8 |
| HP / carrying contribution per person | 10 / 4 slots |
| Storage | 20 slots |
| Starting wood / stone / provisions / medicine | 6 / 4 / 4 / 0 |
| Stack size | 5 units per item slot |
| Expedition | 1–3 survivors, at most 10 shared slots |
| Focus default / presets | 15 minutes / 5, 15, 25 minutes |
| Garden | 300 focused seconds produces 2 provisions |
| Recovery | 300 focused seconds restores up to 5 HP |
| Housing | 4 wood + 2 stone + 900 focused seconds adds 2 beds |
| Storage upgrade | 2 wood + 2 stone + 600 focused seconds adds 10 slots |

Focus durations are positive whole seconds in the domain; custom-duration UI limits remain to be chosen. There is no passive time advancement, fort attack, or absence penalty.

## Persistence and quota boundary

There are zero additional production reads or writes: this module has no I/O and no production callers. Tests reuse the existing in-memory transaction store with network blocking enabled. No rules, production schema, or legacy data have changed.

The candidate state document is `accounts/{uid}/shelter/state`, separate from legacy collections. This path is only a proposal used by the offline test; current Firestore rules do not enable it. A future transaction would read one state document and write one state document per accepted command, excluding receipts, daily summaries, and session records. Those documents and their exact budgets must be designed and documented before enabling persistence. Do not store an unbounded command log or session history inside this state document.

## Required before integration

- Validate decoded state at the persistence boundary, enforce supported language codes in rules, and implement cached account loading and changed-value preference saves with honest failure handling.
- Resolve commands from trusted content definitions. The trial event command accepts already-resolved costs, damage and loot; it is not a validation boundary for UI-submitted event outcomes or randomness.
- Add equipment identity, durability, recipes, retraining, skills and exploration progression. Current equipment slots deliberately contain only `null`.
- Add rescue, housing reservations, injured helpers, death, stranded survivors, recovery sites and the last-survivor fallback. Lethal trial events are rejected until these exist.
- Add selective return/discard and marked overflow caches. The trial return rejects full storage atomically; it must not be exposed as a player flow until safe return works regardless of capacity.
- Add bounded event receipts and uncertain-save reconciliation, concurrent-tab transaction behavior, preference operations, daily totals in Asia/Bangkok, and tests for closure and network recovery.
- Persisted language UI, translations, Settings, fort artwork and timer integration belong to subsequent delivery work.
