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

The login now uses a fixed elevated courtyard composition with the Focuswilds title and account control centered together. It has an occupied timber shelter, four seated pixel survivors, a local hearth, broken arch, foreground parapet, actual raised ground and nine descending stair treads. Detailed architecture uses separate alpha-tested object cards; terrain, paving and stairs use meshes. The close left masonry is a foreground occluder drawn over the hillside so the ground cannot cut a straight edge through it. The distant valley is a separate background. This is a fixed-camera hybrid scene; the cards are not full models suitable for free camera rotation. The signed-in shelter renderer has not been migrated in this change.

The local Three.js module loads on the login screen. Its textures are separate from the signed-in courtyard/survivor images, which are requested only after sign-in. Surfaces and survivors receive moon/hearth light; custom depth materials preserve cutout shadow silhouettes. The survivor atlas is 512x512 with four character columns and four drawn hand/head poses. Generated rows have explicit trimmed vertical bounds in `survivorFrame`; UV cropping excludes neighboring poses and mesh height follows the sampled source height, preserving pixel density and a fixed foot anchor without stretching. The existing approved six-pose walk target applies to later walking characters, not this seated tableau. World scale is approximately one unit per meter; source padding leaves seated silhouettes approximately 1.7 units tall within a 2.05-unit cell. Texture density is preserved at source rather than created by reducing the whole canvas resolution.

A transparent 3-column, 2-row fire atlas changes at eight poses per second, with red tongues and a bone-white core, separate from stationary charred logs and stones. An independent iron tripod suspends a cooking pot above it. Seated idle poses change every 1.2 seconds with staggered character phases. Independent local effects include restrained reflected light, rising smoke, sparks, drifting valley mist and a textured subdivided cloth banner. The camera stays fixed. Per the 2026-10-18 owner override, all system animations run regardless of OS reduced-motion settings, with no pause control. This includes the title renderer, signed-in fire and loading indicators. Hiding the document suspends the renderer loop. Animation never reads or writes game state. Unmount disposes the renderer, target, shadow map, textures, geometry, materials and listeners.

There are loading indicators for startup, scene loading and account actions. Module/texture failures and a 20-second texture timeout show the small bundled courtyard fallback; the login remains usable. WebGL context loss shows the same fallback and restoration resumes the scene. Failure of the fallback image still leaves the CSS night background and readable controls. No automatic reload, asset retry, account retry or cloud-backed asset request is added.

### Login assets and generation

Assets were created with the built-in imagegen tool, then resized/encoded locally. All deployed files are under `src/assets/title-*.webp`; unused full-resolution source images are not committed. The following are the production prompt summaries, with no reference material embedded in the repository:

| Asset | Production prompt |
| --- | --- |
| `title-shelter.webp` | Isolated low crooked timber lean-to and connected broken rear wall, ragged pale awning, bed, pottery shelf, crates and barrel; detailed dark medieval materials; matching elevated camera; no floor, stairs, people, fire, sky or UI. |
| `title-arch.webp` | One broad broken wall and left arch pier, with the curve continuing out of the upper-right edge; dark detailed charcoal stone; narrow torn cloth at the inner arch edge only; no complete arch, detached right pier, large face banner, floor, people or landscape. |
| `title-back-wall.webp` | Continuous tall broken rear masonry, highest at the left, irregular stepped silhouette at the right; restrained moonlit stone detail; transparent surroundings; no shelter, roof, floor or people. |
| `title-near-wall.webp` | Connected heavy close masonry corner and parapet continuing out of the left and lower edges; detailed charcoal stone and soft near edges; no freestanding pillar, supplies, people or scenery. |
| `title-foreground.webp` | Isolated low ruined stone parapet, uneven broken piers, rubble, barrel and damaged crate; sharp detailed source; transparent background; elevated view; no complete environment. |
| `title-valley.webp` | Distant grayscale moonlit forest valley, ruined aqueduct arches, wet winding stream, layered conifers and mist; no near fort, characters, campfire or UI. |
| `title-survivors.webp` | Transparent four-column, four-row sheet preserving silver-haired, brown-cloaked, gray-hooded and back-facing seated medieval pixel survivors; rest, lift hand, warm hands and return-to-lap poses; fixed feet and neutral charcoal/burgundy lighting; no scenery, fire, red bands or UI. |
| `title-stone.webp` | Seamless overhead irregular charcoal medieval flagstones, chipped gray edges, cracks and mortar; neutral material lighting, no perspective, objects, border or vignette. |
| `title-fire.webp` | Transparent 3-column, 2-row sheet of six consecutive flame-only pixel poses, a steady bone-white core and narrow muted red tongues; fixed emitter, no logs, coals, ground, broad glow, scenery or UI. |
| `title-banner.webp` | Isolated long ragged dark burgundy heraldic cloth on a short worn rod; transparent holes and exterior; straight resting pose for mesh deformation; no wall or background. |
| `title-fallback.webp` | Compressed capture of the running courtyard renderer with account controls hidden, shown on graphics failure only; loading uses the shared neutral spinner/status treatment. |

Phone architecture and valley variants are selected when the scene mounts below 768 CSS pixels; resizing preserves the selected set rather than downloading another set during rotation. The survivor atlas stays shared and uses nearest sampling. Three.js uses its MIT license, included in `public/three-LICENSE.txt`.

### Measured login budget and checks

The bundled title image set totals 1,904,582 bytes including both responsive sets and the fallback. A cold desktop requests 1,442,698 image bytes; a cold phone requests 933,488. These deliberately exceed the former 500 kB baseline to retain required material detail. Current minified app/renderer JavaScript is approximately 969 kB combined, or 272 kB with gzip; CSS is approximately 36 kB, or 8 kB with gzip. Actual wire transfer depends on hosting compression and cache headers. One thousand uncached loads therefore cost approximately 1.44 GB of desktop title images or 0.93 GB of phone title images, plus code, fonts and icons; these are traffic calculations, not service quota claims. Repeat visits may reuse hashed cached files, but budgeting does not assume this.

Source dimensions imply approximately 28.99 MiB desktop or 14.95 MiB phone for RGBA scene textures with mipmaps, before driver copies; fallback decoding is separate. A color/depth target including color mipmaps uses approximately 9.33 bytes per render pixel (11.5 MiB at 1440x900); shadows, the browser canvas, cloned texture allocations and driver copies add memory. These are allocation estimates, not measured physical-device GPU memory. Render output is capped at 3200x1800; a slow-frame fallback caps it at 1600x1000, reduces shadows from 1024 to 512, halves mist and bypasses depth blur. No paid service or additional database read/write is introduced.

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
