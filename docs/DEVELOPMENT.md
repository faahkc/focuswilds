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

The signed-in courtyard uses a bundled 315,552-byte WebP background and a 121,338-byte transparent survivor sheet (436,890 bytes combined) with decorative SVG party placement and an animated flame. This is below the former 500 kB optimization baseline, which is not a hard cap; no remote asset requests, database reads or writes are added. The title fort and three expedition environments remain local SVG code; expedition parties reuse the survivor sheet. The Three.js renderer remains removed. The courtyard image is requested only when its SVG image mounts after sign-in. GNU Unifont remains bundled for all text and controls, with its license. Editable phone fields remain at least 16px; viewport zoom remains enabled. Long dialogs scroll without visible scrollbars, and the timer stays mounted.

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

The login uses a fixed elevated courtyard composition with the Focuswilds title and account control together at the upper center, as approved by the owner. It has an occupied timber shelter, four seated pixel survivors, a local hearth, broken arch, foreground parapet, actual raised ground and nine descending stair treads. Detailed architecture uses separate alpha-tested object cards; terrain, paving and stairs use meshes. Close masonry, retaining walls and perimeter rails use actual geometry with depth-tested occlusion; they share a fixed world layout with the hillside and stairs. The distant valley is a separate background. This is a fixed-camera hybrid scene; the cards are not full models suitable for free camera rotation. The signed-in shelter renderer has not been migrated in this change.

The local Three.js module loads on the login screen. Its textures are separate from the signed-in courtyard/survivor images, which are requested only after sign-in. Surfaces and survivors receive moon/hearth light; custom depth materials preserve cutout shadow silhouettes. The survivor atlas is 512x512 with four character columns and four drawn hand/head poses. Generated rows have explicit trimmed vertical bounds in `survivorFrame`; UV cropping excludes neighboring poses and mesh height follows the sampled source height, preserving pixel density and a fixed foot anchor without stretching. The existing approved six-pose walk target applies to later walking characters, not this seated tableau. World scale is approximately one unit per meter; source padding leaves seated silhouettes approximately 1.7 units tall within a 2.05-unit cell. Texture density is preserved at source rather than created by reducing the whole canvas resolution.

A transparent 3-column, 2-row fire atlas changes at eight poses per second, with red tongues and a bone-white core, separate from stationary charred logs and stones. Two thin iron posts support a crossbar behind the visible flame; there is no suspended pot or three-legged frame over the fire. Seated idle poses change every 1.2 seconds with staggered character phases. Independent local effects include restrained reflected light, rising smoke, sparks, drifting valley mist and a textured subdivided cloth banner. The camera stays fixed. Per the 2026-10-18 owner override, all system animations run regardless of OS reduced-motion settings, with no pause control. This includes the title renderer, signed-in fire and loading indicators. Hiding the document suspends the renderer loop. Animation never reads or writes game state. Unmount disposes the renderer, target, shadow map, textures, geometry, materials and listeners.

There are loading indicators for startup, scene loading and account actions. Module/texture failures and a 20-second texture timeout show the small bundled courtyard fallback; the login remains usable. WebGL context loss shows the same fallback and restoration resumes the scene. Failure of the fallback image still leaves the CSS night background and readable controls. No automatic reload, asset retry, account retry or cloud-backed asset request is added.

### Login assets and generation

Assets were created with the built-in imagegen tool, then resized/encoded locally. All deployed files are under `src/assets/title-*.webp`; unused full-resolution source images are not committed. The following are the production prompt summaries, with no reference material embedded in the repository:

| Asset | Production prompt |
| --- | --- |
| `title-shelter.webp` | Isolated low crooked timber lean-to and connected broken rear wall, ragged pale awning, bed, pottery shelf, crates and barrel; detailed dark medieval materials; matching elevated camera; no floor, stairs, people, fire, sky or UI. |
| `title-arch.webp` | A broken arch pier with a narrow receding stepped wall wing, with the curve continuing out of the upper-right edge; dark detailed charcoal stone; narrow torn cloth at the inner arch edge only; keep the rear storage bay and occupied terrace clear; no complete arch, detached right pier, large face banner, floor, people or landscape. |
| `title-back-wall.webp` | Continuous tall broken rear masonry, highest at the left, irregular stepped silhouette at the right; restrained moonlit stone detail; transparent surroundings; no shelter, roof, floor or people. |
| `title-valley.webp` | Distant grayscale moonlit forest valley, moon and ruined aqueduct landmarks, wet winding stream, layered conifers and mist; replace the entire occupied foreground with distant terrain; no near fort, characters, campfire or UI. |
| `title-supplies.webp` | Isolated worn barrel and adjacent damaged wooden crate on a transparent background; detailed charcoal medieval materials, restrained moonlight, matching elevated camera; no floor, wall, figures, flame or broad cast shadow. |
| `title-survivors.webp` | Transparent four-column, four-row sheet preserving silver-haired, brown-cloaked, gray-hooded and back-facing seated medieval pixel survivors; rest, lift hand, warm hands and return-to-lap poses; fixed feet and neutral charcoal/burgundy lighting; no scenery, fire, red bands or UI. |
| `title-masonry.webp` | Square seamless front-on medieval wall albedo: irregular staggered rectangular charcoal limestone, chipped edges, narrow dark mortar, damp mineral grit and restrained ash-gray highlights; detailed neutral lighting; no perspective, silhouette, scenery, plants, UI, global gradient or vignette. Built-in imagegen output resized to 512x512 and encoded as WebP, quality 82, 94,134 bytes. |
| `title-stone.webp` | Seamless overhead irregular charcoal medieval flagstones, chipped gray edges, cracks and mortar; neutral material lighting, no perspective, objects, border or vignette. |
| `title-fire.webp` | Transparent 3-column, 2-row sheet of six consecutive flame-only pixel poses, a steady bone-white core and narrow muted red tongues; fixed emitter, no logs, coals, ground, broad glow, scenery or UI. |
| `title-banner.webp` | Isolated long ragged dark burgundy heraldic cloth on a short worn rod; transparent holes and exterior; straight resting pose for mesh deformation; no wall or background. |
| `title-fallback.webp` | Compressed capture of the running courtyard renderer with account controls hidden, shown on graphics failure only; loading uses the shared neutral spinner/status treatment. |

Phone architecture and valley variants are selected when the scene mounts with a short logical side below 600 CSS pixels; resizing preserves the selected set rather than downloading another set during rotation. The survivor atlas stays shared and uses nearest sampling. Three.js uses its MIT license, included in `public/three-LICENSE.txt`.

### Measured login budget and checks

The bundled title image set totals 1,569,280 bytes including both responsive sets and the fallback. A cold desktop requests 1,220,660 image bytes; a cold phone requests 890,692. These deliberately exceed the former 500 kB baseline to retain required material detail. Current minified app/renderer JavaScript is approximately 975 kB combined, or 274 kB with gzip; CSS is approximately 37 kB, or 8 kB with gzip. Actual wire transfer depends on hosting compression and cache headers. One thousand uncached loads therefore cost approximately 1.22 GB of desktop title images or 0.89 GB of phone title images, plus code, fonts and icons; these are traffic calculations, not service quota claims. Repeat visits may reuse hashed cached files, but budgeting does not assume this.

Source dimensions imply approximately 25.49 MiB desktop or 13.34 MiB phone for RGBA scene textures with mipmaps, before driver copies; fallback decoding is separate. A color/depth target including color mipmaps uses approximately 9.33 bytes per render pixel (11.5 MiB at 1440x900); shadows, the browser canvas, cloned texture allocations and driver copies add memory. These are allocation estimates, not measured physical-device GPU memory. Render output is capped at 3200x1800; a slow-frame fallback caps it at 1600x1000, reduces shadows from 1024 to 512, halves mist and bypasses depth blur. No paid service or additional database read/write is introduced.

Verification used offline account/store substitutions with external network requests blocked. Browser checks covered centered controls and no horizontal overflow at 1440×900, 1280×720, 390×844, 320×568, 844×390 and 256×568. Short/zoomed layouts can scroll accessibly. Account checks covered pending/disabled/spinner, cancellation, blocked popup, network failure, restoration failure, signed-in shelter display, sign-out and scene remount. Detached canvas frame counts stopped after sign-in. Delayed assets showed the loading animation; failed textures/modules showed the working fallback; WebGL loss/restoration recovered. The earlier reduced-motion test froze the scene; that behavior is superseded by the owner override below. Hidden-document rendering still suspends. Login resource entries contained no signed-in shelter assets.

On the automated desktop browser, a 3-second sample rendered approximately 60.2 FPS; a separate 150-interval sample had a 21 ms p95 and no interval above 33.4 ms. Two screenshots 450 ms apart differed in 1,991 pixels above an 8-level RGB threshold, confirming visible motion rather than only a ticking counter. These samples do not establish real-phone performance. Physical-device graphics, real OAuth, production App Check and installation are not independently verified. The Three.js lazy chunk still produces Vite's 500 kB warning; it is not part of the main app chunk. Visual acceptance remains subject to reviewing the running scene.

### Login corrections (2026-10-18)

The previous visual checks forced `no-preference`, masking the native browser's reduced-motion setting and the resulting frozen scene. Current checks must include native media settings. The renderer and signed-in flame no longer suppress motion based on that setting. There is no animation pause control. Existing signed-in scenery remains the earlier SVG/background implementation, not the login renderer.

The loading state no longer mounts or requests the fallback image, eliminating the unrelated image flash before scene readiness. A graphics failure still shows the fallback and an explicit status. Portrait framing now centers on the occupied camp, scales down the foreground obstruction and changes continuously across square aspect ratios. Title size is reduced; keyboard zoom and short-screen scrolling remain available. Smoke fades at its birth/death instead of popping, and the separate banner deforms visibly. The new fire atlas is 384?256, 84,108 bytes, nearest-sampled; it replaces procedural flame polygons. No cloud read/write budgets change.

Correction verification: 79 offline tests, lint and the production build pass. Browser checks with intercepted account/store data confirm advancing title frames under native reduced-motion settings and explicit `reduce`/`no-preference`, no pause controls, and a running signed-in flame under `reduce`. Widths 320, 390, 844 and 1440 have no horizontal overflow and keep the login button in bounds. These checks do not establish complete visual fidelity or physical-device performance; owner visual acceptance is still pending. The existing large Three.js chunk warning remains.

Page loading now uses the shared `PageLoading` component: only a spinner and centered `Preparing...` on a plain background. It covers initial account restoration/scene startup, lazy signed-in code and shelter data loading. Initial HTML uses the same presentation before JavaScript starts. Login controls remain inert and hidden from assistive technology until account restoration and scene readiness/fallback settle. Startup script failure reveals the reload recovery message instead of leaving the normal loader permanently visible. Action-level busy/error indicators remain local to their controls.

The final loader browser check delayed a title texture: exactly one accessible status filled the 390x844 viewport with centered text/spinner, no background image or exposed login controls. It disappeared when ready and the scene continued running with OS motion reduction enabled. The texture-failure check showed the fallback and kept sign-in enabled. Desktop/phone screenshots were inspected locally; no real-phone or production OAuth validation was performed.

### Login composition and readable motion follow-up (2026-10-18)

The prior no-overflow and frame-counter checks did not establish balanced composition or readable motion. Portrait framing now uses a wider world span and moves/scales architectural cards and stairs to preserve the shelter, survivors, arch and route together. The camera raises its focal point on portrait displays so the centered account button clears survivor heads, including 320x568. Desktop architecture and the title are reduced in scale. Banner placement follows its arch on resize; asset selection stays stable during rotation.

The survivor replacement was generated with the built-in imagegen tool, nearest-resized and losslessly encoded to `src/assets/title-survivors.webp` (244,986 bytes). There are four drawn poses per survivor instead of two. Explicit trimmed frames correct the generated sheet's unequal row spacing rather than sampling clipped legs or neighboring heads. Hearth light is softer and less saturated; the ring uses smaller irregular stones instead of a large regular polygon. Fire poses, cooking equipment, smoke and embers remain independent scene objects. No new dependency or database operation is added.

Local review covered 320x568, 390x844, 768x1024, 1440x900 and 2560x1080, with screenshots inspected for character/arch/stair framing, control occlusion and scale. Final portrait framing was corrected after the 320px screenshot revealed button overlap. A local 5.3-second canvas recording demonstrates the actual fire, hand/head, smoke and ember changes. Frame comparisons also detected changes inside the fire and survivor areas, rather than relying on render counters. The owner subsequently confirmed that character movement is visible in their browser, while reporting unnatural fire motion. Final visual acceptance remains pending. Existing historical performance samples above are not new measurements of this asset revision. Real-phone GPU performance and production authentication remain unverified.

Fire follow-up: the earlier atlas changed logs and flame together, making the hearth base appear to move. The replacement `src/assets/title-fire.webp` is flame-only, generated with the built-in imagegen tool and nearest-resized/losslessly encoded. Three stationary charred-log meshes and the stone ring are independent of pose updates. `fireFrame` aligns the measured source emitter in both rows; cropping and geometry height preserve world size per source pixel rather than bouncing the base. The local `login-fire-stable.webm` review recording shows the revised result. The owner confirmed visible character motion and subsequently reported that this revised fire looks more natural. Overall composition acceptance remains separate. This revision passes 81 offline tests, lint and production build; the existing large renderer-chunk warning remains. Texture failure retains a usable sign-in screen, detached renderers stop and sign-out remounts a running scene.


### Login composition and geometry correction (2026-10-18)

The fixed camera now uses elevated perspective with a three-quarter yaw. Landscape and ultrawide framing preserve a 14.5-unit vertical span at the occupied camp rather than shrinking survivors to fit the whole fort. Portrait framing preserves a minimum 7.8-unit world width and reframes architecture/stairs while clearing centered controls. Very tall narrow views necessarily give the camp a smaller fraction of viewport height. Short screens retain accessible scrolling.

A continuous irregular hillside replaces the rectangular box deck. Its deep skirts extend below the view, and nine solid descending steps sit in a recessed bed. Per-face stair UVs preserve stone scale despite changing box heights. Instanced chipped paving follows the hillside and leaves the stair flight clear. Detailed object cards share the camera orientation; survivor and flame feet stay anchored when trimmed poses change.

Replacement shelter artwork excludes baked floors and stairs. The arch has one supporting pier with an open upper curve rather than a complete arch and detached second pier. Its large face banner is independent animated cloth, offset in front of the stone to avoid coplanar flicker. The previous low parapet asset is used once, on the right; the close left corner and rear wall are distinct assets. The left occluder draws over the hillside rather than being sliced by it. Depth blur uses mip levels instead of separated taps that produced repeated outlines. These corrections do not establish exact visual equivalence or owner acceptance.

Render caps increase from 1920x1200 to 3200x1800, and from 960x720 to 1600x1000 in the slow-frame fallback. Maximum color/depth target memory including color mipmaps is approximately 51.3 MiB; a 5120x1440 screen renders to 3200x900, approximately 25.6 MiB for that target. Lower-resolution responsive sources and texture clones change actual driver allocations; source image estimates above are not physical-device measurements. Compared with the previous production image set, cold desktop transfer falls by 41,004 bytes and cold phone transfer rises by 19,390 bytes. Total bundled title images fall by 68,666 bytes. No dependency or database operation is added.

Verification: 85 offline tests, lint and the production build pass. Browser checks cover 1672x941, 390x844, 320x568, 320x1800, 844x390 and 5120x1440, with screenshots inspected for ground contact, duplicate silhouettes, framing and readable controls. No horizontal overflow was found. The neutral shared loader and image-failure recovery were exercised with blocked/delayed image requests. With reduced motion enabled, a 2.37-second automated-browser sample rendered approximately 59.9 FPS; cropped frame differences changed 3,318 fire-region pixels and 24,638 party-region pixels above an 8-level RGB threshold. A 5.3-second local canvas recording provides a motion review artifact. These checks use intercepted account modules and blocked external requests; they do not verify real OAuth or physical-phone performance. The existing renderer chunk warning remains. Owner visual acceptance and exact final composition remain pending.


### Coherent responsive login scene (2026-10-18)

This revision supersedes independent object repositioning in the earlier composition follow-ups. Camera position and orientation, architecture, survivors, banner, foreground masonry and stairs now stay fixed in one world layout. Only the perspective view window changes with aspect ratio. Landscape uses a 14.5-unit vertical span; portrait preserves at least nine world units horizontally and shifts the window toward the party. Resizing does not redownload responsive sources. Very narrow views crop the outer architecture; very tall views show more scenery above and ground below. Short or zoomed screens retain accessible vertical scrolling. The owner approved upper-center title/account controls to clear the party.

The diagonal stair flight has nine equal risers, an upper landing, a lower walk and individually chipped tread stones. The terrain has an opening beneath the flight, verified with downward raycasts, rather than an overlapping ramp. Stair retaining walls use individual masonry blocks and correctly scaled surface UVs instead of stretched single-rock textures. Paving has shallow relief. Loose rubble follows terrain height. The physical left corner, right foreground return, rear-wall return and perimeter wall/rails remain attached to the hillside at every camera window. Physical masonry renders after seated cards with depth testing, preserving foreground occlusion despite the rear artwork's baked equipment. Replaced foreground cutout assets have been removed.

The landscape plate excludes occupied courtyard content. The arch artwork has no lower-left wing across the party; supplies are a separate barrel/crate cutout. Flame silhouettes, stable logs, smoke, sparks and cloth remain independent animated objects. Moonlit charcoal surfaces and muted hearth reflections preserve local material contrast. The graphics-failure capture was regenerated without UI. The bundled title image set is 333,190 bytes smaller than the previous checkpoint; cold desktop image transfer falls by 243,446 bytes and phone transfer by 107,724 bytes. Database operations and dependencies are unchanged.

Browser checks use offline account-module substitutions and block external requests. Nine checked sizes (256x568, 320x568, 390x844, 768x1024, 1024x768, 844x390, 1672x941, 3840x2160 and 5120x1440) have no horizontal overflow and retain reachable sign-in controls. Screenshots and a 5.3-second canvas recording are retained locally for review. With OS reduced motion enabled, a 2.21-second automated-browser sample measured 59.8 rendered FPS at 1672x941 in standard quality, with approximately 397 draw calls including shadow/post passes; this is not a physical-phone measurement. A delayed supplies texture shows only the centered shared spinner/status and hides underlying controls; an aborted texture shows the fallback and leaves sign-in enabled. Physical devices, production OAuth and owner visual acceptance remain unverified.

Validation for this revision: 86 offline tests, lint and production build pass. The existing renderer chunk warning above 500 kB remains. Portrait-to-landscape-to-portrait resizing preserves the running scene and selected assets; no renderer remount is required.


### Masonry, stair shoulders and hearth detail (2026-10-18)

Vertical fort faces, foundation skirts, broken wall blocks and stair risers now use a separate 512x512 masonry texture instead of overhead paving. The generated source stays outside the repository; only the compressed production texture is bundled. Rough wall faces have restrained bump relief and uneven block depth. This adds 94,134 bytes to both cold image sets and approximately 1.33 MiB of unique RGBA/mipmap source allocation. The updated fallback adds another 3,092 bundled bytes; total title images increase by 97,226 bytes from the preceding checkpoint. The current totals are reported in the budget section above. No dependency, external asset request or database operation is added.

Terrain beside the diagonal flight blends down with its grade while preserving the hearth level. The old depressed bed is removed because the existing terrain opening already clears the treads. Low individual broken stones replace the tall side wall; the hearth ring follows the terrain. A regression test bounds the shoulder height relative to each tread and verifies the hearth remains level. Foreground bare branches are native instanced geometry in the fixed scene, with the left trunk continuing down to the hillside so ultrawide views do not expose a detached end. Sparse distant red glints follow the landscape plate. Rear masonry and local hearth contrast are adjusted without a global brightness wash.

The three-legged cooking frame and hanging pot were removed; the hearth has two slim posts and a crossbar behind its existing animated flame. Flame poses, their stable emitter and the independent logs remain unchanged. Desktop, portrait, tablet and ultrawide screenshots and a 5.3-second local motion recording were inspected. With OS reduced motion enabled, 150 rendered frames over 2.49 seconds measured approximately 60.1 FPS in the automated browser at 1672x941, standard quality, approximately 399 draw calls including shadow/post passes. Observed intervals between rendered frames had p50 13.9 ms and p95 21.0 ms on the browser's approximately 144 Hz animation clock. These are brief automated-browser observations, not physical-phone performance guarantees or proof of final visual acceptance.

The owner subsequently asked to keep the five login/animation commits through `46a855d` local. Verified local checkpoints remain authorized; publishing is on hold until explicit renewed authorization. This does not change the visual acceptance requirements.

Validation for the material revision: 87 offline tests, lint, production build and diff checks pass. A blocked masonry texture activates the updated 960px fallback and leaves sign-in enabled. Login resource entries contain no signed-in courtyard or survivor images. The existing renderer chunk-size warning remains; physical-device and production OAuth validation remain separate.

### Perimeter timber and separate cloth (2026-10-18)

The perimeter uses tapered, forked timber with uneven rail joints, grounded on the same fixed terrain at all aspect ratios. Two taller posts beside the arch carry separate torn cloth. Both ties remain fixed while its lower edge deforms; existing banner and timber textures are reused, adding no image transfer or database operations. These foreground ties share the actor layer because the rear arch artwork contains opaque stone; physical foreground masonry still occludes them. Startup assertions reject non-finite cloth vertices and invalid timber spans. The graphics fallback retains the preceding static scene treatment.

Offline browser checks at 256x568, 390x844, 768x1024, 844x390, 1672x941 and 5120x1440 found no horizontal overflow and retained reachable sign-in controls with motion running. Desktop, phone and ultrawide screenshots were inspected. A 2.30-second desktop recording captured 139 rendered frames (approximately 60.4 FPS), with 431 draw calls including shadow/post passes. These checks use account-module substitutions and do not measure physical devices or real OAuth. The renderer chunk is 603.77 kB minified / 155.27 kB gzip; its existing size warning remains. All 87 offline tests, lint and production build pass. Composition and final owner visual acceptance remain open.

### Stair orientation and terrace support (2026-10-18)

Six short, equal risers replace the previous nine-riser flight. Tread edges rise toward screen right while the route descends into the foreground; architecture and camera positions are unchanged. The shared stair dimensions control terrain clearance, landings, tread stones and broken borders. The lower landing uses the actual last-step height. The occupied terrace stays level behind the stair edge, and its left retaining masonry covers the transition to the lower walk. This removes the broad sloping patch beside the old flight. Close walls now carry individual chipped blocks down their visible faces, with their existing solid cores filling mortar gaps. Tread stones have deeper chipped edges and restrained material fill in shadow.

Regression checks cover projected stair direction/location, the level upper terrace, supported stair shoulders and terrain clearance. All 89 offline tests, lint, production build and diff checks pass. Nine viewport checks from 256x568 to 5120x1440 retained sign-in controls without horizontal overflow, with OS reduced motion enabled. Desktop, portrait, tablet and ultrawide screenshots were inspected. A 2.50-second desktop sample rendered 150 frames, approximately 60.0 FPS, in standard quality with 394 draw calls including shadow/post passes. This remains automated-browser evidence, not physical-device verification or final visual acceptance.

The 960x540 graphics fallback was recaptured without controls or the page overlay and recompressed to 65,980 bytes, reducing bundled images by 2,914 bytes. A deliberately blocked masonry texture loaded that fallback; restoring requests resumed the running scene. Normal cold image transfer, source texture dimensions and database budgets are unchanged. The renderer chunk is 604.04 kB minified / 155.38 kB gzip and retains the existing size warning. Work remains local under the publishing hold.


### Storage bay, paving and landscape-only interface (2026-10-18)

The arch cutout now has a narrower receding broken wing, exposing the shelter's existing rear barrels. A cropped rear wall shares the current rear-wall texture to support the upper banner silhouette. The lower supplies move toward the near walk; an additional crate shares the existing supplies texture. Paving uses smaller instanced stones (capacity 1,596 instead of 528). Stronger near depth blur preserves the detailed focus plane. The vignette no longer obscures moonlight or local camp contrast. Both arch variants and the graphics-failure capture were replaced, reducing the deployed title image set by 102,908 bytes; normal loads still exclude the 65,004-byte fallback. No additional image downloads, dependencies or database operations are added.

The latest owner direction supersedes earlier portrait-only phone layouts and upper-center login controls. The login title and text-only account control are centered, with survivor overlap allowed; hover and keyboard focus remain visible. Every application screen now uses landscape layout. A shared fixed size container swaps the small viewport axes and rotates 90 degrees when the viewport is portrait. It wraps the error boundary and remains mounted during rotation. This rotates web content, without requiring fullscreen or an operating-system orientation lock. The initial HTML loader/recovery uses the same frame before JavaScript loads. Native top-layer dialogs receive their own matching rotation and logical viewport limits. Container queries respond to the unrotated layout dimensions; the renderer reads client dimensions rather than transformed bounding boxes. Short landscape shelter screens place the scene beside the timer/navigation, retaining accessible inner scrolling and 16px inputs. The install manifest requests landscape; physical installation remains unverified.

Before the orientation update, all 89 offline tests, lint and build passed. A 2.60-second automated desktop sample rendered 156 frames (approximately 59.9 FPS) at 1672x941 with 391 draw calls, including shadow/post passes. These are brief browser measurements, not physical-phone guarantees. Final verification: all 89 offline tests, lint and production build pass, retaining the existing renderer chunk warning above 500 kB. Automated login checks covered nine viewport sizes from 320x568 through 5120x1440, including both phone/tablet orientations; the logical canvas remains landscape, bounded by the existing render cap, without horizontal document overflow. Motion ran with OS reduced motion enabled. Offline signed-in checks covered all six game dialogs, Escape/focus restoration, scrollable long content and identical stored timer identity/deadline across rotation. A delayed texture showed only the shared spinner/status with controls inert and no fallback flash; an aborted phone arch texture showed the decoded fallback and usable account control. Screenshots of desktop login, rotated phone login, short-landscape camp and rotated Settings were inspected. Browser account/store substitutions blocked external requests. Earlier portrait screenshots describe superseded layouts; final owner visual acceptance and production authentication remain pending.

Short-landscape follow-up: safe flex alignment and non-shrinking console sections keep the first timer field reachable when content exceeds its slot. At 568x320 the console scrolls 25px internally; both its first field and final navigation row were verified reachable. Lint and build pass; no application logic changed.


### Banner support and foreground focus (2026-10-18)

The main cloth is wider and slightly lower/right on the rear pier. Its shared-texture backing reaches the hanger and has a stepped geometry silhouette to avoid a rectangular cropped edge. Foreground depth blur now ramps over ten world units with a six-pixel maximum instead of the previous five-unit/twelve-pixel setting, preserving masonry and near supplies detail. The focused survivor plane, fixed foreground wall positions, scene animation and centered text-only login controls are unchanged.

The graphics-failure image was recaptured at 960x540 and encoded as WebP quality 78, method 6. It is now 71,488 bytes (6,484 more); the deployed title image set totals 1,569,280 bytes. Normal cold desktop/phone image transfer remains 1,220,660/890,692 bytes because fallback is failure-only. Texture dimensions, database budgets and dependencies are unchanged. The renderer chunk is approximately 604.80 kB minified / 155.61 kB gzip, retaining the existing chunk-size warning.

All 89 offline tests, lint, production build and diff checks pass. Browser checks covered 320x568, 568x320, 844x390, 768x1024, 1672x941 and 5120x1440 with running motion and no horizontal document overflow. Desktop, short-phone and ultrawide screenshots were inspected. A cold 390x844 viewport used the phone images with an 844x390 logical canvas. Blocking the masonry image loaded the new decoded fallback, ended loading and left account controls usable. A 2.005-second desktop sample rendered 120 frames (approximately 59.9 FPS), standard quality, 391 draw calls including shadow/post passes. These are automated-browser observations; physical-phone performance and final visual acceptance remain unverified. Work remains local under the publishing hold.
