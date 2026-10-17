# Shelter domain checkpoint

The shelter is the default signed-in interface at `/focuswilds/`; existing `/#shelter` links under the application base path also work. The previous journey remains reachable at `#legacy`, including through the shelter load/start fallback. New state starts separately, without migrating or deleting legacy progress. The owner reported publishing the rules and passing the bounded live shelter check on 2026-10-17. This is owner-reported validation; the agent made no production database calls during implementation or routine tests.

## State and commands

`Shelter` schema 1 groups account language, revision, focus totals, fort capacity, materials, armory, survivors, expedition, marked sites, confirmed journal entries, discovered rescue identities and death count. Every command clones state; validation failures leave the input intact. `parseShelter` validates decoded snapshots, identifiers, gear ownership, jobs, teams, housing and carrying limits. Snapshots over 600,000 UTF-8 bytes are rejected before writing; split rosters/caches before expanding content beyond this guard. Language defaults to `en` and accepts only `en` or `th`.

Commands require an expected revision and an immutable UUID operation receipt. Event choices also require the expected event number. The transaction reads the current state and receipt before writing. Duplicate retries return current state without applying rewards again; different payloads using the same UUID fail. Stale commands from another tab fail without writes. The UI preserves pending actions in tab-scoped session storage, retries only on user request after failures, and reuses transaction results without rereading state. A stale non-focus action is discarded only after refreshing, so the user can review it again. Unsaved focus stays pending; after refresh, the user can explicitly apply it to the current jobs. Separate simultaneously running timers are not merged automatically.

Focus commands carry active seconds, target seconds, and completion status. Partial sessions advance all assigned jobs without increasing the completed-session count. Jobs finish once; unused focus after completion is not automatically assigned to another job. A full store retains completed garden work until capacity becomes available. Materials are charged on assignment, with no cancellation command yet.

The timer uses deadlines and retains paused time, custom duration and pending save payloads across reloads in the same tab. It defaults to 15 minutes, offers 5/15/25-minute presets and accepts 1–180 custom minutes. Opening dialogs, switching language, reduced motion and phone rotation keep it mounted. Stop retains whole focused seconds. Jobs, equipment and expeditions are locked while a focus period is active; stop and save before changing them. Language may change while the timer runs. Closing a tab can remove its session storage; keep an unsaved tab open until its pending operation is confirmed. Corrupt local timer data is surfaced and preserved until the user explicitly discards it.

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
| Medicine | 1 wood + 300 focused seconds produces 1 medicine; heals up to 5 HP |
| Sword / armor | 2 wood + 2 stone / 2 wood; 600 focused seconds; 10 durability |
| Repair | 1 wood + 1 stone + 300 focused seconds restores stored gear to 10 durability |
| Retraining | 600 focused seconds switches the general skill; personal skill stays fixed |
| Reinforced armor | Recovered blueprint in fort storage + 3 wood + 4 stone + 900 focused seconds; 10 durability, protection 3 instead of 2 |
| Blueprint / stone relic | 1 / 3 slots, non-equippable collectibles; blueprints unlock reinforced armor while stored at the fort |
| Pathfinder | Confirm the hollow's ward, then retrain for 600 focused seconds; acting survivor observes for 1 provision instead of 2 |

There is no passive time advancement, fort attack, or absence penalty. Border/hollow/barrow contain 3/4/5 events. Information from the traveler/hermit events unlocks the next area. Quiet, force and observe choices disclose resource costs, noise, damage bounds, team-wide effects and possible permanent death. Rolls use expedition identity, event, approach and survivor identity, so retrying or reopening cannot reroll the same confirmed outcome. Loot has a disclosed 75% chance, with no guaranteed reward. Event costs, damage and loot come from content definitions rather than caller-supplied values.

Equipped weapons and armor occupy separate slots and remain repairable at zero durability. Each survivor can carry one equipped medicine. Escorts cannot act and reserve housing; each needs a living helper whose carrying contribution decreases by 2. Skills are fully shown only after arrival. Event XP modestly increases maximum HP (up to +4) and reduces damage (up to 1), without automatically healing.

Hollow/barrow events have a disclosed 25% chance per blueprint discovery; barrow events also offer a 25% stone-relic chance. Optional discoveries remain marked until explicitly collected, so they never silently overflow the shared pack. Results are deterministic for the same expedition/event/approach. Recovering a blueprint to fort storage unlocks the recipe without consuming it. Stone relics currently serve as collectibles only. Weighted capacity applies to collection, equipment swaps, rescue, production, returns and decoded saves. Stored objects can be discarded to free space, except repair targets and the last blueprint while a reinforced-armor job needs it.

These additions retain schema 1, the same top-level fields and unchanged read/write budgets. Existing published rules already permit these nested gear/job/skill values; no rules republish or data migration is needed. Reload older app tabs before using the new content: older parsers reject unfamiliar values rather than overwriting progress.

Verification: 86 offline tests pass, including crafting/repair, locked skills, legacy snapshots, weighted collection/return, overflow retention, protected blueprint disposal and deterministic discovery chances. Lint and production build pass with the existing legacy graphics chunk-size warning. Intercepted browser checks verify recipe/training options, a disabled discard button for an in-use blueprint, both languages and no horizontal overflow at 1280×720, 390×844 and 320×568. Browser fixtures use local fake data, never production accounts.

Deaths remove survivors permanently and leave equipped items at a marked site. Surviving teams choose excess inventory to leave. If a helper dies, a free helper takes over or the escorted person stays stranded. Total defeat leaves shared items and escorted people at the site. If the entire fort roster is gone, a new survivor arrives while fort resources and knowledge remain. Rescue identities are recorded so revisiting cannot create duplicates.

Return previews fill existing stacks, prioritize medicine/provisions and leave overflow at the last marked location. Users may select quantities and gear explicitly. Returning is always available even with no provisions or a full fort. Recovering marked items or stranded people requires revisiting the location through that area's event risks. Sites do not expire while the app is closed.

## Persistence and quota boundary

All paths live under `users/{ownerUid}` and use the existing owner-only account guard:

- `shelter/state`: one current bounded snapshot and aggregate totals, including language.
- `shelterOperations/{uuid}`: immutable revision and canonical command fingerprint; no full state snapshots or unbounded arrays of receipts.
- `shelterSessions/{uuid}`: immutable completed or partial focus record.
- `shelterDays/{YYYY-MM-DD}`: aggregate focused seconds and completed-session count, using Asia/Bangkok completion dates even for late saves.

| Operation | Application reads | Writes | Additional dependent rule reads, conservative maximum |
| --- | ---: | ---: | ---: |
| Initial account load / explicit refresh | 1 | 0 | 0 |
| Explicit initialization | 1 | 1 if missing, otherwise 0 | 0 |
| Ordinary action / changed language | 2 | 2 | 1 |
| Unchanged language submitted | 2 | 0 | 0 |
| Focus, partial or completed | 3 | 4 | 2 |
| Duplicate committed action | 2 | 0 | 0 |
| Reopen Settings / other cached dialog | 0 | 0 | 0 |
| History page | at most 25 returned session documents | 0 | 0 |
| Daily summary page (service API) | at most 30, or 25 for all-time cursor pages | 0 | 0 |

Firestore can bill an empty query's minimum read and dependent rule evaluations; cache reuse can reduce dependent reads. Transaction conflicts can multiply these per-attempt budgets; the existing Firestore Lite adapter allows at most 3 attempts. The rule `getAfter` lookups connect receipts to the post-write revision and focus records to their receipt. They validate owner access, supported language, basic state shapes and bounded queries, but do not recompute nested game outcomes or prove focused time. This remains a personal application, not a competitive economy. Receipt documents grow with accepted actions; there is no retention deletion yet, preserving retry evidence.

Simultaneous account reads, refreshes, initialization and identical saves are coalesced. Cached snapshots are cloned so UI callers cannot mutate the cache. No listeners, focus/visibility refetch, database polling, Emulator, Firebase CLI, new dependency or billing setup was added. History loads only on demand, in cursor pages of at most 25; explicit history refresh is available. Daily summaries are separately bounded and never rebuilt from history. Tests keep the network-blocking preload enabled.

## Rollout and remaining limits

1. Rules publication through Firebase Console was reported complete by the owner on 2026-10-17. The agent has no authenticated deployment session and did not independently perform or inspect publication.
2. Open the deployed app at `/focuswilds/` and sign in to enter the shelter directly. **Light the hearth** creates only the separate shelter state. Failed account loads never initialize or overwrite data.
3. Perform a bounded live check: load once, assign one garden job, complete or stop one focus period, open Settings and change language once, refresh once and open history once. Verify rule permissions and the documented budgets. Keep Spark without Billing and existing App Check protections.
4. The shelter is now the default. Next implement bounded resumable cleanup for only the legacy `state/progress`, `days` and `sessions` paths, then delete replaced code/assets. Legacy cleanup is authorized but has not run; current rules still deny deletes. Do not erase old progress to fix a failed new-state read.

The local SVG art includes a detailed fort exterior/courtyard and distinct border trail, hollow shrine and barrow entrance scenes. Expedition scenery follows the saved area and party count, without changing game state or mounting another timer. Bottom-anchored cropping keeps people visible on wide displays; landmarks stay near the center for portrait screens. No raster assets, dependencies or network requests were added. Intercepted browser checks covered all four signed-in scenes at 1280x720, 390x844 and 320x568 with no page overflow or clipped people, timer continuity through the journal and reduced-motion fire suppression. Offline tests total 90; lint and build pass with the existing legacy graphics chunk warning. This is a small code-drawn art set, not a full illustrated asset library. The journal separates confirmed observations from unverified accounts. Two fort rumors are available initially; confirming traveler/hermit encounters reveals shrine/shade accounts with their sources. Confirming the matching tracks, lanterns, ward or shade event removes its rumor and retains the saved observation. Rumors confer no unlocks, rewards or risk reductions. All four accounts derive from existing knowledge, including older snapshots, with no schema, rules or read/write-budget changes. Offline tests cover source gating, confirmation after a saved event and reload, non-mutation, and English/Thai rendering. Physical-device Thai marks, actual cross-device behavior and installed-web-app behavior remain unverified. The newly added content has offline and intercepted-browser checks, not a production-account content test. No PWA support is claimed.
