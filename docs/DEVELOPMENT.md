# Development

## Current checkpoint

The shelter is the only signed-in experience at `/focuswilds/`. Existing hashes, including `#legacy`, open the shelter. The retired 25/5 timer, companion/EXP screens, forest renderer, their dedicated tests and unused forest WebP/CSS have been removed. Three.js is now used by the separate login courtyard described below. No cloud data was deleted by implementation or tests.

The owner reported the initial shelter rules publication and bounded account check passed on 2026-10-17. On 2026-10-17 the owner reported cleanup-rule publication, completed production legacy cleanup, passing post-cleanup reload/history/phone checks, and successful cross-device use. These are owner-reported results, not independently observed production checks by the agent. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for scope and [SHELTER_SCHEMA.md](SHELTER_SCHEMA.md) for schema and normal operation budgets.

English is the default; signed-in Settings stores English/Thai preference in shelter state. Authentication changes clear the previous language before account loading. Language changes preserve the timer and jobs. The HTML title defaults to `Focuswilds`. During focus the tab shows remaining time; paused timers show the localized paused label. Idle, stopped, completed and unmounted timers restore `Focuswilds`, without cloud writes. Settings/history reads remain explicit and bounded, with no listeners, polling or focus refetch. History uses Asia/Bangkok and summary documents, never a history scan for totals.

## Retired journey cleanup

1. In Firebase Console, select `focuswilds`, open Firestore Database > Rules, replace the complete rules with repository `firestore.rules`, and Publish. This freezes old-tab writes to legacy paths and permits only owner deletion after a schema-1 shelter exists. Shelter writes and immutable receipts retain their existing rules. The agent has no authenticated console session; rule publication/enforcement has not been independently verified.
2. Reload the latest application. Confirm the fort loads correctly, stop/save any active timer, and open Settings > **Remove previous journey data**. The first step asks for confirmation of permanent deletion. The Thai label is available through the saved account language.
3. Repeat the button until completion is reported. Each click handles at most 20 documents. If a save fails or its response is lost, retry the step. Closing the dialog or reloading is safe: progress is the remaining cloud data, without a browser-only cursor or cleanup marker.

Only `users/OWNER_UID/sessions/*`, `days/*` and finally `state/progress` can be deleted. Each operation first loads and validates `shelter/state`; missing or corrupt shelter state prevents deletion. Collections are queried in document-ID order with limit 20, including malformed legacy records lacking timestamps. After a successful batch, the next request starts at the first remaining document. The summary is removed only after both collections are empty. No recursive delete, collection-group query, scanning of shelter history, or automatic background cleanup exists. Current shelter state, operations, sessions, days and language remain unchanged. The adapter independently validates every deletion path and batch bound.

### Cleanup document budgets per button press

| Step | Application reads | Deletes | Extra dependent rule reads, conservative maximum |
| --- | --- | --- | --- |
| Nonempty sessions batch | 1 shelter + at most 20 session documents | at most 20 | at most 20, one per deletion |
| Sessions empty, nonempty days batch | 1 shelter + empty sessions query + at most 20 day documents | at most 20 | at most 20, one per deletion |
| Both collections empty, summary present | 1 shelter + 2 empty queries + 1 legacy summary | 1 | 1 |
| Already clean | 1 shelter + 2 empty queries + 1 missing legacy summary | 0 | 0 |

The batch size is 20 because each delete checks the saved shelter, staying within the [20 rule access calls per batch](https://firebase.google.com/docs/firestore/security/rules-conditions#access_call_limits) even without caching. Identical rule lookups may be cached and reduce reads. Firestore applies minimum charges for empty queries and missing document reads; these are shown explicitly rather than treated as free. A failed/uncertain request or an explicit retry may cost additional reads/deletes. There are no automatic retries. Concurrent calls in one store share one operation; across tabs deletion is idempotent. No normal shelter action gains extra database operations.

Old browser timer data is not automatically erased: it can contain unsaved legacy work. The retired app no longer runs or imports that data. Published cleanup rules reject further legacy writes from stale tabs.

## Firebase setup

GitHub Auth and Firestore Lite use the public configuration in src/lib/firebase.ts. OAuth client secrets stay in the Firebase console. Enable GitHub Authentication, set the GitHub callback to https://focuswilds.firebaseapp.com/__/auth/handler, and authorize faahkc.github.io (plus localhost for local testing). Session persistence stays scoped to the current tab.

Only the owner UID in src/lib/account.ts is allowed. Publish the contents of firestore.rules in the Firebase console before using this version: it restricts access to the owner, validates basic document shapes, keeps saved sessions immutable, and rejects session queries without a limit of at most 25 (daily summaries: 30). Unlisted paths and all shelter deletes are denied. Only the three legacy paths described below allow owner-only deletion after shelter creation; legacy creates/updates are denied. The rules do not prove focus duration or independently recompute rewards; this is a personal app, not a competitive reward system.

### App Check

Production initializes App Check with the public reCAPTCHA Enterprise site key before Auth or Firestore. Register that same key for focuswilds-web in Firebase App Check. Keep domain verification enabled for faahkc.github.io and focuswilds.firebaseapp.com; do not add localhost to the production key. Keep Spark without Billing. Add Firebase App Check API to the existing Browser key's API restrictions (retain the other six required APIs).

Set the App Check token TTL in the console to 1 day. The SDK reuses valid cached tokens and obtains replacements on demand; automatic background refresh is disabled. There is no per-tick attestation or forced token refresh. Attestation and debug-token exchanges still use App Check/provider quota, separate from the document budgets below; initial loads, expired tokens, cleared browser storage and failures can require additional exchanges. Without Billing, exhausting the provider's free allowance can interrupt access after enforcement. App Check reduces abuse; it does not guarantee quota availability or replace owner-only Rules.

Before enabling enforcement, deploy, confirm the latest website version, sign in and open history once. Check App Check metrics for verified Cloud Firestore requests. Only then enforce Cloud Firestore; do not enable enforcement for other services as part of this change. If verified requests are absent, inspect browser errors and registration/API restrictions first, without repeated refreshes.

Local development does not run production reCAPTCHA. After enforcement, create a private debug token under App Check > Apps > focuswilds-web > Manage debug tokens, put VITE_APPCHECK_DEBUG_TOKEN in ignored .env.local, and restart npm run dev. Without it, local requests are unverified and will be rejected by an enforced service. Never share or commit the debug token, put it in CI, or use it in a production build. Production ignores the debug setting. Routine tests stub initialization and block networking; they do not perform live attestation.

Routine tests use an in-memory store. The npm test command preloads tests/offline.mjs to block fetch and outbound SDK sockets before tests run. Do not disable it. No Emulator, Firebase CLI or Java is required. Live integration checks are manual and bounded; never put real Firebase calls into the routine test suite.

The Firebase SDK pins its Node-only gRPC dependency to vulnerable 1.9.x. A scoped npm override selects patched gRPC 1.14.6+ within the same major; remove it when Firebase updates its dependency range. The browser uses Firestore Lite and does not use gRPC.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, including `/focuswilds/`.

```sh
npm test
npm run lint
npm run build
npm run preview
```

React, TypeScript, Vite, Tailwind CSS, and shadcn/ui are configured. Components live in `src/components/ui`; add only those needed using the shadcn CLI or MCP. Tests live in `tests/`; `npm test` runs the offline JavaScript tests. Development scripts remain in `scripts/`.

## Website loading, assets and verification

Subsequent visual work must follow the [approved visual direction](IMPLEMENTATION_PLAN.md#approved-visual-direction). The current courtyard background and static survivor sheet are an intermediate implementation; the approved dark palette, spatial scene and multi-frame character animation are pending. A concept image does not establish renderer fidelity or performance.

The signed-in courtyard uses a bundled 315,552-byte WebP background and a 121,338-byte transparent survivor sheet (436,890 bytes combined) with decorative SVG party placement and a reduced-motion-aware flame. This is below the former 500 kB optimization baseline, which is not a hard cap; no remote asset requests, database reads or writes are added. The title fort and three expedition environments remain local SVG code; expedition parties reuse the survivor sheet. The Three.js renderer remains removed. The courtyard image is requested only when its SVG image mounts after sign-in. GNU Unifont remains bundled for all text and controls, with its license. Editable phone fields remain at least 16px; viewport zoom and reduced-motion support remain enabled. Long dialogs scroll without visible scrollbars, and the timer stays mounted.

The font subset comes from `https://unifoundry.com/pub/unifont/unifont-17.0.05/font-builds/unifont-17.0.05.otf`. To reproduce it with FontTools and Brotli, run `pyftsubset unifont-17.0.05.otf --unicodes=U+0020-00FF,U+0E00-0E7F,U+2000-206F --flavor=woff2 --name-IDs='*' --name-languages='*' --name-legacy --output-file=unifont-thai-latin.woff2`. Retain upstream copyright/name metadata and the bundled OFL notice. Do not commit the full font or temporary conversion tools. Text outside this subset can use the system fallback.

The shelter/Firestore chunk loads after sign-in; cleanup performs no reads until its button is pressed. History queries run only when opened or explicitly refreshed. Vite content hashes preserve unchanged asset URLs. Host cache policy is unchanged. The installable shell uses a manifest and local icons without a service worker or offline cache.

Tests use the existing network-blocking preload and in-memory stores. Cleanup tests cover bounds, all protected paths, missing/corrupt fort state, failures, lost responses, concurrent calls and resume. Intercepted browser checks exercised failed cleanup followed by four batches, leaving zero legacy records and identical fort data. UI tests for the retired journey were removed with their implementation; timer, rule-adjacent service, quota, language and accessibility checks for the shelter remain. The owner subsequently reported cleanup, post-cleanup phone checks and cross-device use passed. The agent has not independently audited production rule enforcement or detailed Thai mark placement. The installable shell is implemented; physical-device installation remains unverified.

Playwright artifacts belong in ignored `.playwright-mcp/`; remove unused artifacts but retain logs open in the editor. Do not commit screenshots, secrets, debug tokens, unused full-resolution artwork or font conversion tools.

## Application version

```sh
npm run app:version
```

`package.json` is the single source of the application version. The lockfile and the website use the same value. Dev/build do not change tracked files. The React app imports the version from package.json through normal HMR. It is not a Vite config dependency, avoiding server restarts on patch commits. Production requires a rebuild.

`npm install` and `npm ci` install the repository's pre-commit hook through the `prepare` script (skipped in CI). On an existing checkout, run `npm run prepare` once. The installer refuses to replace existing custom hooks. Before each normal local commit with staged changes, the hook increments patch and stages both package files in that same commit. A retry after a failed commit preserves the already-staged increment. Partially staged package edits block the commit rather than being overwritten.

Only change major or minor when explicitly requested by the owner:

```sh
npm run version:minor
# or
npm run version:major
```

These commands update both package files and reset patch to zero. Stage both files and commit; the hook preserves the explicit version instead of adding patch again. Never run these commands without the owner's request.

Commits made through GitHub's web UI, merges created by GitHub, and commits made with hooks disabled do not run the local hook. Make versioned changes from a configured local clone. CI builds the committed version and does not bump it. Empty commits do not bump version.

## Web app installation and update recovery

The manifest uses the `/focuswilds/` deployment scope, standalone display and local 192/512 PNG icons. Vite prefixes root-relative HTML asset links with the configured base; do not combine those links with `%BASE_URL%`, which duplicates the base during development. HTTPS (or localhost) is required. Settings offers an Install app button when the browser supplies an installation prompt. Otherwise use the browser installation menu, or Safari Share > Add to Home Screen on iPhone/iPad. Installation must still be checked on physical devices.

This release does not cache the app for offline startup. Account loading and saving require internet; keep a tab with unsaved work open. No service worker, background sync, database requests or quota changes are introduced. See [MDN installation requirements](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

A static English startup screen remains visible if the entry module fails. A localized React error boundary handles render and lazy-module failures. Both offer manual Reload without clearing stored timer data. Updates never force a reload during focus. The original reported white-screen exception was not captured; removing version-triggered config restarts and adding recovery covers the identified failure paths.

Verification: 70 offline tests, lint and production build pass. Chromium parsed the development manifest without errors (installation is blocked only by the automated incognito context). Intercepted entry-module and lazy-module failures both displayed Reload and recovered after retry. Physical installation and the original uncaptured exception remain unverified.

## Free-service graphics budgeting

All deployed functionality must remain usable on free services, with Firebase Spark Billing disabled. The earlier 500 kB scene target is not an acceptance ceiling. Follow the production delivery plan in IMPLEMENTATION_PLAN.md; establish measured budgets for transfer, deployed files, Git history, decoded textures and render targets before producing the complete asset set. Larger assets are acceptable when justified by required visual quality and actual loading/device/hosting limits.

Graphics files and renderer code are served by GitHub Pages, not Firestore. Keep visual playback entirely local, with no additional database operations. Report a cold-load transfer and expected full-load traffic separately from cached repeat visits; do not assume a cache hit. Recheck service quotas when budgeting a release instead of treating documented limits as a target to fill.

## Animated login courtyard

The login now uses a fixed elevated courtyard composition with the Focuswilds title and account control centered together. It has an occupied timber shelter, four seated pixel survivors, a local hearth, broken arch, foreground parapet, actual raised ground and nine descending stair treads. Detailed architecture uses separate alpha-tested, depth-tested object cards; terrain and stairs use meshes. The distant valley is a separate background. This is a fixed-camera hybrid scene; the cards are not full models suitable for free camera rotation. The signed-in shelter renderer has not been migrated in this change.

The local Three.js module loads on the login screen. Its textures are separate from the signed-in courtyard/survivor images, which are requested only after sign-in. Surfaces and survivors receive moon/hearth light; custom depth materials preserve cutout shadow silhouettes. Survivor cells are 128×128 in a 4-column, 2-row atlas, with a fixed foot baseline and two distinct seated hand/head poses per survivor. The existing approved six-pose walk target applies to later walking characters, not this seated tableau. World scale is approximately one unit per meter; source padding leaves seated silhouettes approximately 1.7 units tall within a 2.05-unit cell. Texture density is preserved at source rather than created by reducing the whole canvas resolution.

Six fire silhouettes change at eight poses per second with a bone-white core. Seated idle poses change every 2.8 seconds with staggered character phases. Independent local effects include restrained reflected light, rising smoke, sparks, drifting valley mist and a textured subdivided cloth banner. The camera stays fixed. Reduced motion freezes the tableau; hiding the document suspends its loop. Animation never reads or writes game state. Unmount disposes the renderer, target, shadow map, textures, geometry, materials and listeners.

There are loading indicators for startup, scene loading and account actions. Module/texture failures and a 20-second texture timeout show the small bundled courtyard fallback; the login remains usable. WebGL context loss shows the same fallback and restoration resumes the scene. Failure of the fallback image still leaves the CSS night background and readable controls. No automatic reload, asset retry, account retry or cloud-backed asset request is added.

### Login assets and generation

Assets were created with the built-in imagegen tool, then resized/encoded locally. All deployed files are under `src/assets/title-*.webp`; unused full-resolution source images are not committed. The following are the production prompt summaries, with no reference material embedded in the repository:

| Asset | Production prompt |
| --- | --- |
| `title-shelter.webp` | Isolated ruined medieval stone shelter, patched timber lean-to, tattered pale canopy, bedroll, pottery and supply crates; elevated three-quarter view; charcoal masonry, bone-white edges, restrained burgundy cloth; transparent surroundings; no people, fire, sky or UI. |
| `title-arch.webp` | Isolated tall broken medieval stone arch and damaged piers; transparent opening and surroundings; irregular chipped charcoal stone with moonlit edges and worn dark-red banners; matching elevated camera; no landscape or people. |
| `title-foreground.webp` | Isolated low ruined stone parapet, uneven broken piers, rubble, barrel and damaged crate; sharp detailed source; transparent background; elevated view; no complete environment. |
| `title-valley.webp` | Distant grayscale moonlit forest valley, ruined aqueduct arches, wet winding stream, layered conifers and mist; no near fort, characters, campfire or UI. |
| `title-survivors.webp` | Transparent 4×2 sheet of four seated medieval pixel survivors: silver-haired traveler, brown-cloaked traveler, gray hood and back-facing cloaked traveler; same character per column, two different hand/head poses, equal cells and fixed feet; no scenery or smooth painted figures. |
| `title-stone.webp` | Seamless overhead irregular charcoal medieval flagstones, chipped gray edges, cracks and mortar; neutral material lighting, no perspective, objects, border or vignette. |
| `title-banner.webp` | Isolated long ragged dark burgundy heraldic cloth on a short worn rod; transparent holes and exterior; straight resting pose for mesh deformation; no wall or background. |
| `title-fallback.webp` | Compressed static courtyard fallback, shown during loading or graphics failure only. |

Phone architecture and valley variants are selected when the scene mounts below 768 CSS pixels; resizing preserves the selected set rather than downloading another set during rotation. The survivor atlas stays shared and uses nearest sampling. Three.js uses its MIT license, included in `public/three-LICENSE.txt`.

### Measured login budget and checks

The bundled title image set totals 1,751,788 bytes including both responsive sets and the fallback. A cold desktop requests 1,328,372 image bytes; a cold phone requests 758,768. These deliberately exceed the former 500 kB baseline to retain required material detail. Current minified app/renderer JavaScript is approximately 951 kB combined, or 266 kB with gzip; CSS is approximately 36 kB, or 8 kB with gzip. Actual wire transfer depends on hosting compression and cache headers. One thousand uncached loads therefore cost approximately 1.33 GB of desktop title images or 0.76 GB of phone title images, plus code, fonts and icons; these are traffic calculations, not service quota claims. Repeat visits may reuse hashed cached files, but budgeting does not assume this.

Source dimensions imply approximately 25.5 MiB desktop or 11.7 MiB phone for RGBA scene textures with mipmaps, before driver copies; fallback decoding is separate. A color/depth target uses approximately 8 bytes per render pixel (9.9 MiB at 1440×900); shadows, the browser canvas and driver allocations add memory. These are allocation estimates, not measured physical-device GPU memory. Render output is capped at 1920×1200; a slow-frame fallback caps it at 960×720, reduces shadows from 1024 to 512, halves mist and bypasses depth blur. No paid service or additional database read/write is introduced.

Verification used offline account/store substitutions with external network requests blocked. Browser checks covered centered controls and no horizontal overflow at 1440×900, 1280×720, 390×844, 320×568, 844×390 and 256×568. Short/zoomed layouts can scroll accessibly. Account checks covered pending/disabled/spinner, cancellation, blocked popup, network failure, restoration failure, signed-in shelter display, sign-out and scene remount. Detached canvas frame counts stopped after sign-in. Delayed assets showed the loading animation; failed textures/modules showed the working fallback; WebGL loss/restoration recovered. Reduced motion and hidden-document tests stopped frame counts. Login resource entries contained no signed-in shelter assets.

On the automated desktop browser, a 3-second sample rendered approximately 60.2 FPS; a separate 150-interval sample had a 21 ms p95 and no interval above 33.4 ms. Two screenshots 450 ms apart differed in 1,991 pixels above an 8-level RGB threshold, confirming visible motion rather than only a ticking counter. These samples do not establish real-phone performance. Physical-device graphics, real OAuth, production App Check and installation are not independently verified. The Three.js lazy chunk still produces Vite's 500 kB warning; it is not part of the main app chunk. Visual acceptance remains subject to reviewing the running scene.
