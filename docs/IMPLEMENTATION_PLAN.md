# Focuswilds Implementation Plan

This document records approved requirements, not a list of fully implemented features. The README and this plan stay in English. The replacement application supports English and Thai, with English as the default.

## Checkpoint — 2026-10-17

Development resumed at the owner's request on 2026-10-17. Core domain, persistence and a first bilingual playable interface are implemented; the owner has reported publishing the rules and passing the bounded account check.

Completed and pushed through `3efa04a` (v0.1.44), before this checkpoint update:

- Recorded the requirements, applied a Thai/Latin GNU Unifont subset throughout the UI, included its license, and removed the previous font assets.
- Translated account controls and errors into Thai. The login button enters the shelter; its busy state asks the user to wait. Account CSS no longer depends on an English accessibility label.
- Updated the README narrative and page metadata for the new world, and separated shipped behavior from planned work in DEVELOPMENT.md. Restored the README and implementation plan to English.
- Removed unused chart/sidebar CSS variables, corrected timezone copy, and confirmed that the remaining tracked assets have callers.
- Offline tests, lint, build, and diff checks passed. Login checks at 1280×720, 390×844, and 320×568 found no overflow.

The shelter now has validated versioned state, revision-checked commands, immutable operation receipts, atomic focus/daily summaries, cached account loading and offline tests. Core gameplay includes concurrent jobs, partial focus, crafting/repair, equipment wear, retraining, three trial areas, disclosed deterministic event outcomes, rescue, permanent death, recovery sites, safe overflow return and last-survivor recovery. English/Thai icon dialogs, account language persistence, custom focus duration, local SVG fort/courtyard and human sprites are connected at `/focuswilds/#shelter`. See [SHELTER_SCHEMA.md](SHELTER_SCHEMA.md) for rollout steps, measured operation budgets, trial values and limits. The owner has authorized routine balance and implementation decisions without further questions for each value.

Rollout is staged: the existing 25/5-minute journey remains the default and offers **Enter the fort**. On 2026-10-17 the owner reported publishing the rules and passing the bounded live shelter check; the agent did not independently inspect production. Production data has not been reset. Blueprint discoveries now unlock reinforced-armor crafting after recovery, stone relics use three slots, and confirmed ward knowledge unlocks Pathfinder retraining. These additions preserve schema 1 and existing operation budgets without republishing rules. The journal now separates sourced hearsay from confirmed observations, deriving four accounts from existing saved knowledge without extra database operations. The art pass adds layered fort details and distinct border/hollow/barrow scenery with party-sized human groups. Remaining rollout includes making the shelter the default, bounded resumable legacy cleanup and removal of replaced code/assets after the shelter becomes the verified default. Login/account copy and metadata default to English; the signed-in shelter follows the saved account language.

Offline verification covers malformed saved data, capacity, all event approaches across deterministic seeds, partial focus, duplicate/lost-response saves, stale-tab rejection, language save failure/reload, history bounds and timer recovery. Intercepted browser checks exercised the new signed-in shelter at 1280×720, 390×844 and 320×568, language switching during focus, job progress, exploration/return/history, a lost focus-save response without duplicate completion, Escape focus restoration and reduced motion. Physical-device Thai marks, real OAuth/App Check/Firestore/rule enforcement and actual cross-device behavior remain unverified. The existing legacy graphics chunk warning remains. Do not claim PWA support or a finished replacement rollout.

Use English commit subjects and descriptive bodies with validation details, without inspiration titles or private design discussions. Inspect staged diffs, use the version hook, and push after checks pass. Clean unused Playwright artifacts while retaining logs still open in the editor.

## Direction

- A focus app with shelter management and survival exploration, set in a medieval world devastated by mythical creatures.
- An abandoned border fort is a safe shelter. No fort attacks, deaths, or resource losses caused by absence from the app.
- Pixel characters in scenes with depth, muted colors, deep shadows, and warm firelight. Begin with European folklore.
- Show the fort exterior before login and the inner campfire courtyard afterward. The landing screen contains only the title and login.
- Use GNU Unifont with its license for both English and Thai. Default to English; check Thai vowels, tone marks, and long text on phones.
- Keep the main experience within one viewport. Open secondary information in icon dialogs without unmounting the timer. Preserve zoom and reduced-motion support.

## Languages and signed-in Settings

- Support English (`en`) and Thai (`th`) across menus, account messages, events, items, skills, journal entries, and accessibility labels. Keep translated strings separate from logic and use stable IDs for game data.
- Default to English when an account has no saved language. The logged-out screen uses English; Settings is available only after login as a game-style icon dialog.
- Persist the selected language in the account's Cloud Firestore data, using the existing Firebase Spark project without Billing. Local storage alone does not satisfy account persistence.
- Load the preference with account data and reuse it in memory. Reopening Settings must not read Firestore again. Write only when the saved language changes.
- Apply the saved preference when signing in on another device. Without listeners or polling, an already open device picks up remote changes through an explicit refresh or the next account load.
- Validate supported language codes at application and rules boundaries. Add preference operations to the documented read/write budget when the schema is defined; do not assume they are free.
- Show loading/save failures with retry. Do not report a preference as saved before the write succeeds, and do not silently overwrite an unread preference after a load failure.
- Switching language must preserve the mounted timer, jobs, exploration state, and progress. Update document language, dates, and accessible labels consistently.
- Test default English, both translations, persistence, invalid values, failed saves, repeated Settings opens, and switching during an active timer using the offline store.
- README and this implementation plan remain English. Thai is an application language option, not a requirement to translate repository documents.

## Focus and production

- Default to 15 minutes, with 5 / 15 / 25-minute presets and custom duration.
- Progress follows actual focused time and carries across sessions. Stopping early retains work progress but does not count as a completed session.
- All assigned survivors work concurrently, one job per person. No mandatory interactions during focus.
- Production, repairs, and building upgrades require materials and focus time. Recovery and basic garden provisions require time only.
- Team setup, equipment changes, job assignment, and event decisions are immediate. Exploration consumes prepared resources.
- Provisions are consumed only during exploration. Running out prevents further exploration but never prevents a safe return.

## Survivors and equipment

- Start with 5 survivors and housing for 8. Expand housing with materials and focus time.
- Expeditions contain at most 3 people. Each has HP and an individual carrying contribution.
- Each person equips 1 weapon, 1 outfit/armor, and 1 usable item, separate from the shared inventory.
- Each has 1 fixed personal skill and 1 general skill that can be retrained at the fort using focus time.
- Exploration experience modestly improves HP and skill effectiveness without adding skill slots. Preparation and knowledge remain more important than level.
- Weapons and armor lose durability through use or events. At zero durability they cannot be used until repaired; they do not disappear permanently.
- Swap the equipped usable item with inventory between events, never after confirming an action.

## Exploration and risk

- Scene-based choices; combat resolves a selected approach as an event rather than a turn-based battle.
- Choose the acting survivor and use their skills/equipment. Disclose team-wide consequences before confirmation.
- Pair icons with text indicating noisy, quiet, or unknown outcomes. Display known costs and risks; do not rely on color alone.
- Random outcomes stay within disclosed bounds. Warn of possible death. Knowledge and skills reveal uncertainty; a noisy action is not inherently wrong.
- Low / medium / high-risk areas use provisional event counts of 2–3 / 3–5 / 5–7. Threat type and damage also determine risk.
- Discovered information unlocks areas. Higher risks offer chances of better loot, materials, blueprints, and survivor skills, without guaranteed rewards.
- Returning between events immediately reaches the fort safely.
- A folklore journal records behavior, weaknesses, countermeasures, and clues, distinguishing confirmed facts from hearsay.

## Inventory, storage, and rescue

- The shared expedition inventory has at most 10 slots; usable capacity depends on team members. Large objects occupy multiple slots and some items stack.
- Fort storage is limited and expandable with materials and focus time. Spend stored materials directly on upgrades and allow discarding items to avoid deadlocks.
- Leave items the fort cannot accept at a marked location for a later expedition. They do not disappear while the app is closed.
- Show available capacity before departure and return. Retrieved items must fit both team inventory and fort storage.
- Rescued people do not occupy inventory slots. Supporting an injured survivor reduces the helper's carrying contribution; disclose this and allow inventory adjustments before confirmation.
- Reveal skill clues before rescue and full skills upon reaching the fort. Rescued people cannot fight or use skills during that expedition.
- After rescue, choose to continue or return. Count people already being escorted against available housing before allowing more rescues.
- Full housing prevents bringing another person back. Mark their location so they can be rescued after expansion; they do not die from time outside the app.

## Injury, death, and recovery

- Events reduce HP; zero HP means permanent death. Returning does not heal automatically. Use medicine or a focus-based recovery job.
- After a death, choose to continue or return. Recalculate capacity and resolve excess inventory. Recover equipped items only if space permits; otherwise choose what to leave.
- A defeated team leaves its items at the death location for another team to recover. Dead characters never revive. Escorted survivors remain stranded and can be rescued again.
- If everyone dies, a new survivor arrives. The fort and accumulated knowledge remain, avoiding a permanent dead end.
- The map shows caches, recovery sites, and waiting survivors. Returning to them involves the area's risks.
- Persist event outcomes immediately. Reopening preserves the outcome without rerolling; closing the app does not advance events.

## Data and replacement

- Start the new system from zero without migrating old history, focus totals, EXP, or progress. Legacy data deletion is authorized for the replacement rollout.
- Use a new schema and bounded, repeatable legacy cleanup that cannot delete new-system data.
- Keep Firebase Spark without Billing. Use an in-memory test store and the network-blocking preload.
- Commit outcomes and progress atomically and idempotently. Test page closure, network loss, multiple tabs, and repeated reward claims.
- Use summary documents without scanning history to rebuild progress. No polling/listeners. Load history on demand in pages of at most 25; bound daily-summary queries to 30 and paginate all-time days. Use Asia/Bangkok consistently.
- Document actual read/write budgets before enabling the new schema.
- Remove unused legacy code, tests, dependencies, and artwork once replacements exist. Include deletions in commits without rewriting Git history.
- Keep README in English as world, atmosphere, and concept prose only: no feature lists, usage instructions, technical details, or inspiration titles.
- Put technical and data-transition guidance in docs/DEVELOPMENT.md. Keep initial scene assets within 500 kB, local and compressed; no GIF/video loops.
- Clean unused screenshots and logs from ignored .playwright-mcp after verification. Retain artifacts still needed or open in the editor.

## Delivery order

1. Record the plan, replace the font, and begin Thai account UI while preserving the current journey. Completed; README narrative also updated.
2. Build the new domain model/schema with in-memory tests for survivors, jobs, focus, storage, inventory, exploration outcomes, and account language preferences.
3. Connect persistence and one complete playable area. Verify atomicity, idempotency, and recovery.
4. Complete the English/Thai UI, English defaults, signed-in Settings, fort scenes, and assets. Verify persisted language, timer continuity, desktop, phone, zoom, and reduced motion.
5. Reset legacy data, remove replaced code/assets, review README and development documentation, run relevant checks, commit, and push.

Choose trial HP, storage capacity, costs, production durations, and initial content during implementation. Do not add hunger, disease, stress, or fort politics in the first version.
