# Development

## Current checkpoint

The shelter is the only signed-in experience at `/focuswilds/`. Existing hashes, including `#legacy`, open the shelter. The retired 25/5 timer, companion/EXP screens, forest renderer, their dedicated tests, Three.js dependencies and unused forest WebP/CSS have been removed. No cloud data was deleted by implementation or tests.

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

Fort/courtyard and three expedition scenes are local SVG code. The forest WebP and Three.js renderer are gone; the initial scene has no raster background transfer. GNU Unifont remains bundled for all text and controls, with its license. Editable phone fields remain at least 16px; viewport zoom and reduced-motion support remain enabled. Long dialogs scroll without visible scrollbars, and the timer stays mounted.

The font subset comes from `https://unifoundry.com/pub/unifont/unifont-17.0.05/font-builds/unifont-17.0.05.otf`. To reproduce it with FontTools and Brotli, run `pyftsubset unifont-17.0.05.otf --unicodes=U+0020-00FF,U+0E00-0E7F,U+2000-206F --flavor=woff2 --name-IDs='*' --name-languages='*' --name-legacy --output-file=unifont-thai-latin.woff2`. Retain upstream copyright/name metadata and the bundled OFL notice. Do not commit the full font or temporary conversion tools. Text outside this subset can use the system fallback.

The shelter/Firestore chunk loads after sign-in; cleanup performs no reads until its button is pressed. History queries run only when opened or explicitly refreshed. Vite content hashes preserve unchanged asset URLs. Host cache policy is unchanged; no service worker, unsupported header files or PWA support was added.

Tests use the existing network-blocking preload and in-memory stores. Cleanup tests cover bounds, all protected paths, missing/corrupt fort state, failures, lost responses, concurrent calls and resume. Intercepted browser checks exercised failed cleanup followed by four batches, leaving zero legacy records and identical fort data. UI tests for the retired journey were removed with their implementation; timer, rule-adjacent service, quota, language and accessibility checks for the shelter remain. The owner subsequently reported cleanup, post-cleanup phone checks and cross-device use passed. The agent has not independently audited production rule enforcement or detailed Thai mark placement. Installation as a web app remains unimplemented.

Playwright artifacts belong in ignored `.playwright-mcp/`; remove unused artifacts but retain logs open in the editor. Do not commit screenshots, secrets, debug tokens, unused full-resolution artwork or font conversion tools.

## Application version

```sh
npm run app:version
```

`package.json` is the single source of the application version. The lockfile and the website use the same value. Dev/build do not change tracked files. Vite imports package.json as a watched config dependency and automatically restarts when its version changes. Production requires a rebuild.

`npm install` and `npm ci` install the repository's pre-commit hook through the `prepare` script (skipped in CI). On an existing checkout, run `npm run prepare` once. The installer refuses to replace existing custom hooks. Before each normal local commit with staged changes, the hook increments patch and stages both package files in that same commit. A retry after a failed commit preserves the already-staged increment. Partially staged package edits block the commit rather than being overwritten.

Only change major or minor when explicitly requested by the owner:

```sh
npm run version:minor
# or
npm run version:major
```

These commands update both package files and reset patch to zero. Stage both files and commit; the hook preserves the explicit version instead of adding patch again. Never run these commands without the owner's request.

Commits made through GitHub's web UI, merges created by GitHub, and commits made with hooks disabled do not run the local hook. Make versioned changes from a configured local clone. CI builds the committed version and does not bump it. Empty commits do not bump version.
