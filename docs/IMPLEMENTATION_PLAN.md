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

The shelter is now the default after sign-in at `/focuswilds/`; existing `#shelter` links still work. The retired journey and its fallback have been removed; old hashes open the shelter. On 2026-10-17 the owner reported publishing the rules and passing the bounded live shelter check; the agent did not independently inspect production. Shelter progress was preserved during the owner-reported legacy cleanup. Blueprint discoveries now unlock reinforced-armor crafting after recovery, stone relics use three slots, and confirmed ward knowledge unlocks Pathfinder retraining. These additions preserve schema 1 and existing operation budgets without republishing rules. The journal now separates sourced hearsay from confirmed observations, deriving four accounts from existing saved knowledge without extra database operations. The art pass adds layered fort details and distinct border/hollow/barrow scenery with party-sized human groups. Bounded resumable legacy cleanup is implemented in signed-in Settings. Retired code, tests, CSS, forest assets and Three.js dependencies are removed. On 2026-10-17 the owner reported cleanup-rule publication, completed production legacy cleanup, passing post-cleanup reload/history/phone checks, and successful cross-device use. These are owner-reported results, not independently observed production checks by the agent. Login/account copy and metadata default to English; the signed-in shelter follows the saved account language.

Offline verification covers malformed saved data, capacity, all event approaches across deterministic seeds, partial focus, duplicate/lost-response saves, stale-tab rejection, language save failure/reload, history bounds and timer recovery. Intercepted browser checks exercised the new signed-in shelter at 1280×720, 390×844 and 320×568, language switching during focus, job progress, exploration/return/history, a lost focus-save response without duplicate completion, Escape focus restoration and reduced motion. Post-cleanup phone checks and cross-device use have passed according to the owner. Detailed Thai mark placement and production rule enforcement have not been independently audited by the agent. Removing the legacy renderer eliminates the graphics chunk warning. The core replacement rollout is complete based on owner-reported checks. The installable web app shell is implemented with a scoped manifest, icons and Settings guidance. Offline startup is not supported; physical-device installation remains to be checked.

Use English commit subjects and descriptive bodies with validation details, without inspiration titles or private design discussions. Inspect staged diffs, use the version hook, and push after checks pass. Clean unused Playwright artifacts while retaining logs still open in the editor.

## Direction

- A focus app with shelter management and survival exploration, set in a medieval world devastated by mythical creatures.
- An abandoned border fort is a safe shelter. No fort attacks, deaths, or resource losses caused by absence from the app.
- Pixel characters in scenes with depth, charcoal shadows, ash/bone-white light and restrained ember-red shelter light. Begin with European folklore; follow the approved visual direction below.
- Show the fort exterior before login and the inner campfire courtyard afterward. The landing screen contains only the title and login.
- Use GNU Unifont with its license for both English and Thai. Default to English; check Thai vowels, tone marks, and long text on phones.
- Keep the main experience within one viewport. Open secondary information in icon dialogs without unmounting the timer. Preserve zoom and reduced-motion support.

## Approved visual direction

Approved on 2026-10-18. These are requirements for subsequent visual work, not a claim that the current renderer implements them. Read this section together with the README before producing assets or changing scene rendering.

### World, palette and mood

- Preserve the medieval world after humanity's collapse, beginning with European folklore. The abandoned border fort shelters ordinary survivors; outside are mist, ruined villages and uncertain mythical threats. Use worn stone, damaged timber, patched cloth and practical medieval equipment. Exclude industrial machinery, steampunk and modern objects.
- Keep the emotional contrast: a small, fragile place to return to within an overwhelmingly hostile world. Darkness must not imply attacks or progress loss while the user is away.
- Use predominantly charcoal black and layered graphite gray, with ash/bone-white moonlight and fog. Reserve muted brick/ember red and deep blood red for sparse accents. Avoid a sunny, lush, picturesque fantasy-village treatment, broad golden light or neon red.
- Shelter light is soft and steady, with ember-red reflection and a small bone-white hot core. Threat accents are sparse, sharper and visually distinct. Preserve readable silhouettes, paths and materials through local contrast instead of darkening the whole image. Keep controls legible and never communicate state through color alone.

### Scene and motion

- Combine compact, readable 2D pixel sprites with environments that have spatial depth, surface texture, changes in elevation, contact shadows and foreground/background occlusion. Use an elevated three-quarter miniature-diorama composition, with focus near the survivors and restrained depth blur elsewhere.
- Match character lighting to the ground and surroundings, including movement through lit and shaded regions. Keep pixel structure coherent at the actual display size; detailed illustrations merely reduced to thumbnails do not satisfy the sprite requirement.
- A detailed flat background, whole-image zoom or parallax alone does not complete the depth requirement. Prove the necessary scene geometry or layered depth and occlusion in a prototype before expanding the artwork; no renderer or new dependency is mandated in advance.
- Begin walk animation with six distinct poses at approximately eight pose changes per second, about a 0.75-second cycle. These are implementation starting targets, not verified specifications of an original sprite sheet. Animate position and camera separately from pose changes; avoid sliding feet and whole-sprite stretching as substitutes for drawn poses.
- Keep the camp camera still and idle motion subtle. Use a following camera for travel where appropriate. Fire changes shape across frames; smoke, fog, sparks and reflected light remain restrained and suitable for concentration. Do not require every effect to share the sprite animation rate.
- Target smooth position/camera movement at 60 FPS on capable displays, subject to measured performance. Provide reduced-motion behavior and keep animation independent of timer state and database operations.

### Delivery and acceptance

1. Define one camp composition: camera, ground levels, survivor scale, walkable paths, hearth, light sources and occluders. Check landscape desktop and portrait phone framing before final asset production.
2. Prove depth, occlusion, ground contact and framing with a simple scene prototype. Then integrate one representative survivor with complete motion and lighting before expanding the party.
3. Deliver one working animated camp in the website for visual review before expanding to travel environments. Validate world, palette, sprite readability, motion and lighting together; a standalone concept image or attractive static background is not completion.
4. Measure frame pacing, dropped frames and combined initial scene asset bytes. Treat 500 kB as a former optimization baseline, not a hard cap. Select and document production asset budgets from measured transfer size, total deployed size, expected traffic, loading time and GPU memory while retaining free hosting; replace or recompress assets rather than accumulating unused originals. No video/GIF background loops or remote asset requests.
5. Preserve timer state across dialogs and rotation, accessible zoom, 16px phone inputs, GNU Unifont, English/Thai controls, saved progress and existing database budgets. Run relevant offline tests, lint and build for implementation changes, then browser checks for desktop/phone layouts, occlusion, motion and reduced motion. Report actual-device verification separately from browser emulation.

Day/night systems, combat effects and multiple new environments are outside the first camp milestone. Record observed results and remaining limits honestly; do not promise game-equivalent fidelity or mobile performance before measuring the implemented scene.

### Production delivery plan (2026-10-18)

The deliverable is a maintained, usable graphics system integrated into the existing game. Early validation is an internal checkpoint using the production architecture, not a disposable demo or a reason to stop at starter quality. This plan replaces the former hard 500 kB interpretation.

- Use React for accessible UI and existing game/timer state; plan Three.js for the spatial scene, loaded after sign-in. Keep rendering local and separate from persistence. Do not add a second renderer, physics engine or React scene wrapper without a concrete requirement. Validate the chosen package version and its production build during implementation.
- Use one scene lifecycle with initialization, saved-state updates, resize, reduced motion, visibility suspension and disposal. Recover from graphics-context loss or provide a static scene fallback while keeping focus controls and unsaved timer state usable. Stop animation when hidden without stopping elapsed-time accounting.
- Build the courtyard, exterior and existing border/hollow/barrow environments from reusable medieval geometry, texture atlases and scene-specific layouts. Complete the animated camp first, then apply the same system to the existing environments. Keep the still title scene inexpensive; scene transitions must not remount the timer or fetch game state again.
- Define asset contracts before production: world scale, camera/framing, sprite cell dimensions, foot anchor, transparency, supported facing directions, idle/walk states, six-pose walk timing and consistent pixel density. Produce animations for every displayed survivor, with shared timing/layout where appropriate. Asset generation alone is insufficient: inspect alignment, repeated poses, silhouettes, edge halos and foot sliding in the running scene. Resolve required facings from actual paths before drawing them.
- Place animated character textures on light-responsive planes with correct transparency/depth handling; verify their shadow silhouettes. Use actual elevation and occluders, constrained paths and stable depth ordering. Reuse the existing survivor counts and expedition state; visual movement adds no gameplay or database commands.
- Design one coherent lighting setup per environment: restrained moonlight, local ember-red hearth/lantern light, contact shadows and atmospheric depth. Reuse baked/static lighting where suitable; restrict dynamic shadow-casting lights and transparent particle layers. Depth blur must preserve sprites and UI. Measure each effect before keeping it in the delivery build.
- Ship responsive quality settings selected from rendering capability and measured frame pacing: cap render pixel ratio, reduce shadow resolution, particle counts and expensive blur before compromising sprite legibility. Target stable 60 FPS where supported and a stable 30 FPS fallback on slower devices; measure rather than promise either. Reduced motion suppresses nonessential movement. Do not expose renderer settings in the product unless users need them.
- Serve versioned bundled models/textures/sprites from GitHub Pages using the existing base path. Load only the active environment plus shared assets, deduplicate asset loads and release unused GPU resources. Account separately for compressed transfer bytes, decoded textures, render targets, JS chunks, deployed files and Git history. Keep unused full-resolution sources outside the repository.
- Keep Firebase Spark without Billing. Do not introduce paid APIs, cloud rendering, asset storage services or paid runtime dependencies. Visual animation must add zero Firestore operations; retain bounded explicit reads and atomic/idempotent writes. Verify licenses and retain notices for runtime code and distributed assets. Free-plan limits are operating constraints, not permission to remove required visual quality or data safety.
- Before release, complete the visual acceptance checks above plus asset-load failure, unavailable graphics, context-loss recovery, repeated scene switching, graphics-resource cleanup, timer continuity, portrait/rotation/zoom, keyboard/dialog behavior and reduced motion. Record load sizes, frame-time percentiles, dropped frames, draw calls and estimated graphics-memory use with device/browser and scene conditions. Run offline tests, lint and build. Separate desktop/mobile emulation from a real-phone check and explicitly record any unavailable hardware validation.
- Finish with one consistent visual system across the existing scenes, documented asset/scene editing instructions and measured hosting/database budgets. Exclude day/night simulation and combat systems unless separately requested. Review the integrated camp before producing the remaining environment assets to avoid repeating an art-direction error across the whole game.

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
- Put technical and data-transition guidance in docs/DEVELOPMENT.md. Keep scene assets local and compressed, with measured loading/storage/bandwidth budgets appropriate to free hosting; 500 kB is not a hard cap. No GIF/video loops.
- Clean unused screenshots and logs from ignored .playwright-mcp after verification. Retain artifacts still needed or open in the editor.

## Delivery order

1. Record the plan, replace the font, and begin Thai account UI while preserving the current journey. Completed; README narrative also updated.
2. Build the new domain model/schema with in-memory tests for survivors, jobs, focus, storage, inventory, exploration outcomes, and account language preferences.
3. Connect persistence and one complete playable area. Verify atomicity, idempotency, and recovery.
4. Complete the English/Thai UI, English defaults, signed-in Settings, fort scenes, and assets. Verify persisted language, timer continuity, desktop, phone, zoom, and reduced motion.
5. Bounded legacy cleanup UI/rules and retired-code removal are implemented. The owner reported publishing cleanup rules, finishing real-account cleanup, and passing post-cleanup and cross-device checks.

Choose trial HP, storage capacity, costs, production durations, and initial content during implementation. Do not add hunger, disease, stress, or fort politics in the first version.
