# Development

Requirements: Node.js 24, npm, and a Git clone.

## Firebase migration

GitHub Auth and Firestore Lite use the public configuration in src/lib/firebase.ts. OAuth client secrets stay in the Firebase console. Enable GitHub Authentication, set the GitHub callback to https://focuswilds.firebaseapp.com/__/auth/handler, and authorize faahkc.github.io (plus localhost for local testing). Session persistence stays scoped to the current tab.

Only the owner UID in src/lib/account.ts is allowed. Publish the contents of firestore.rules in the Firebase console before using this version: it restricts access to the owner, validates basic document shapes, keeps saved sessions immutable, and rejects session queries without a limit of at most 25 (daily summaries: 30). All unlisted paths and deletes are denied. The rules do not prove focus duration or independently recompute rewards; this is a personal app, not a competitive reward system.

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

React, TypeScript, Vite, Tailwind CSS, and shadcn/ui are configured. Components live in `src/components/ui`; add only those needed using the shadcn CLI or MCP. Tests live in `tests/`; `npm test` runs the JavaScript tests, while SQL tests run in SQL Editor. Development scripts remain in `scripts/` and database migrations in `migrations/`.

## Application version

```sh
npm run app:version
```

`package.json` is the single source of the application version. The lockfile and the website use the same value. Dev/build do not change tracked files. Restart the dev server or rebuild after committing to refresh the displayed version.

`npm install` and `npm ci` install the repository's pre-commit hook through the `prepare` script (skipped in CI). On an existing checkout, run `npm run prepare` once. The installer refuses to replace existing custom hooks. Before each normal local commit with staged changes, the hook increments patch and stages both package files in that same commit. A retry after a failed commit preserves the already-staged increment. Partially staged package edits block the commit rather than being overwritten.

Only change major or minor when explicitly requested by the owner:

```sh
npm run version:minor
# or
npm run version:major
```

These commands update both package files and reset patch to zero. Stage both files and commit; the hook preserves the explicit version instead of adding patch again. Never run these commands without the owner's request.

Commits made through GitHub's web UI, merges created by GitHub, and commits made with hooks disabled do not run the local hook. Make versioned changes from a configured local clone. CI builds the committed version and does not bump it. Empty commits do not bump version.

## Cloud data

Paths live under users/OWNER_UID:

- state/progress: schema version, monotonic revision, ready flag, session/second totals, encounter counts, latest discovery, selected companion, and resumable import metadata.
- days/YYYY-MM-DD: daily session/second totals in Asia/Bangkok. The same timezone is used on all devices, including imported records.
- sessions/UUID: immutable ID, title, start/completion times, and recorded seconds. UUIDs, titles and variable durations from the backup are preserved; every completed focus session still awards 25 EXP.

The timer runs locally and survives reload in sessionStorage. Old tab timers are recovered using the known source account ID. No cloud write occurs per tick, title edit, pause, reset, or break. Only completed focus sessions are saved. Progress revisions prevent delayed responses from rolling EXP or companion selection backwards in the UI.

### Quota budget

Normal successful operations before SDK conflict retries (overview reads are skipped when the same account/day is already cached in memory):

| Action | Document reads | Document writes |
| --- | --- | --- |
| Open journey / manually refresh progress / new Thailand day | 2 | 0 |
| Finish a new focus session | 3 | 3 |
| Retry an already saved session | 3 | 0 |
| Change companion | 1 | 1 (0 if unchanged) |
| Open 7/30-day history | At most 7/30 day documents | 0 |
| Open all-time daily history / load older days | At most 25 day documents per page | 0 |
| View individual sessions / load more | At most 25 session documents per page | 0 |

An empty query still has a minimum read charge. Transaction conflicts retry at most 3 times and can consume additional reads. These numbers describe app document operations, not a guarantee of the final billing meter; index reads or other service overhead can apply. No polling, realtime database listeners, visibility/focus refetch, automatic history scans, or automatic network retry loops are used. Concurrent identical reads and saves are coalesced. Overview results remain cached for the current account/day until an explicit refresh, successful write, or page reload; component remounts reuse them. Transaction results update the UI without a follow-up read. Changes from another device require Refresh progress / Refresh history or reloading the app.

History stays closed until requested. Each selected-period view remains in memory while open; changing periods or refreshing explicitly issues a new bounded query. All-time totals come from the progress document, never from counting every session. Summary tables and session pages load separately. A full page offers Load more; an extra empty query may be needed to learn there is no next page.

### Restore the backup

Keep the original JSON backup outside Git. After signing in, choose it on Restore your journey. File parsing, owner checks, duplicate/conflict checks, title/duration validation, discovery checks, totals, and SHA-256 fingerprinting are local; preview performs no cloud writes. Files over 20 MB are rejected locally for browser memory safety; keep such a backup and arrange a separate import rather than truncating it.

The importer includes completed focus records and skips breaks/unfinished records. It preserves the selected discovered companion and derives EXP/discoveries using the unchanged UUID mapping. Import chunks contain at most 25 sessions. Each chunk atomically writes new sessions, affected daily summaries and progress metadata. Previously completed chunks are skipped on resume, conflicting records or a different file are rejected, and ready stays false until final totals match the locally validated backup. Lost commit responses are safe to retry using the same file.

For N sessions, a fresh import has one initial progress read plus one progress read, up to 25 session reads and up to 25 distinct day reads per transaction chunk. Writes are new sessions, touched day summaries and one progress document per chunk. Chunk retries can add reads. The import is an explicit one-time operation, stops on error, and never runs in the background. If another device has already added new sessions after import, confirming the updated overview costs two additional reads.

Do not delete the source database or backup until live verification passes. Legacy SQL files remain temporarily for that verification; they are not used by the application. Git history is preserved.

### Bounded live verification

1. Publish firestore.rules. Sign in and preview the backup; compare session count, minutes, EXP and companion before importing.
2. Import once. Compare restored totals, title/history samples and companion against the preview. Reload once to confirm cloud persistence.
3. Open history once; check 7-day/30-day/all-time totals and one 25-row page as applicable. Do not loop refreshes.
4. Complete one real focus round. Verify +1 session, +25 EXP, +25 minutes and one discovery. Refresh once to confirm, then test changing to one unlocked companion.
5. If a write is uncertain, use the existing Retry action; do not create replacement sessions or reimport a different file. Keep the source backup until all checks pass.

Firebase Spark remains without Billing. No images, analytics, functions or file uploads use Firebase; the selected backup is parsed locally and only validated session/preferences data is written. Images and animations remain website assets on GitHub Pages.
