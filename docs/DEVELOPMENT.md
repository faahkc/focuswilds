# Development

Requirements: Node.js 24, npm, and a Git clone.

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

Copy `.env.example` to `.env.local` and set the project URL and publishable key. GitHub OAuth sign-in and local sign-out are implemented. Enable the GitHub provider in Supabase and allow both `https://faahkc.github.io/focuswilds/` and `http://localhost:5173/focuswilds/` as redirect URLs. OAuth uses PKCE and returns to the app root, so no server callback route is needed on Pages.

Authentication tokens and the PKCE verifier are stored in sessionStorage for the current browser tab. Reloading the tab preserves the session; a new browser session may require signing in again. Login does not restrict signup to one account.

### Focus sessions

The app uses the existing Supabase `public.focus_sessions` table: UUID `id` (primary key), `user_id` referencing `auth.users`, `session_type`, `status`, `duration_seconds`, `remaining_seconds`, `started_at`, `ends_at`, and `finished_at`. Completed focus sessions are inserted with `session_type = 'focus'`, `status = 'completed'`, 1500 seconds, and zero remaining time. Daily totals filter on `finished_at` and include existing completed focus sessions at their recorded durations. Results are paginated to avoid the API's 1000-row default limit.

No schema migration is required for the current database. Its existing RLS policy `owner_only` restricts reads and writes to the configured owner's account; other GitHub accounts can sign in but cannot save progress. The application does not change database grants, existing rows, or policies. Keep RLS enabled; client-side user filters are not a substitute for [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). Keep future SQL migrations in `migrations/` and commit them to Git; credentials and local caches stay untracked.

After signing in, start a 25-minute focus session, pause/resume it, or reset unfinished time. Completing focus prepares a 5-minute break; neither phase starts automatically. Deadlines use wall-clock time so background throttling does not slow the timer. A completed focus session retains its scheduled completion timestamp, even if the browser wakes later. Today's saved count and minutes use the viewing device's local timezone and refresh at midnight, on returning to the page, or manually.

Today's journey includes a fixed daily goal of four saved completed focus sessions (100 minutes for the standard 25-minute timer). The progress bar fills at four and stays full if the user continues, while the daily session and minute totals remain uncapped. Historical variable-duration sessions count as sessions, rather than converting minutes into extra sessions. The goal follows the same local-day boundaries and cloud refresh as daily totals; failed loads do not show a zero or completed goal. Breaks, resets, and pending unsaved sessions do not count. Completion shows encouragement without extra EXP or rewards, and the next local day starts a fresh goal without changing all-time EXP or discoveries. No new schema or migration is needed.

The active timer and one pending save are kept in sessionStorage under the account ID, so reloading this tab resumes them. Cloud progress is available across devices; active timers are not synchronized across tabs or devices. Closing the tab can discard an unfinished timer or unsaved session. Signing out hides that account's timer; signing back in in the same tab restores it. No account's progress is shown to another signed-in user. Existing running/paused database rows are not resumed or changed by this timer.

Completed sessions use a stable UUID and `ON CONFLICT DO NOTHING` via Supabase upsert, so retrying a save or reloading while a request is in flight does not double-count. A failed save stays pending, offers Retry, and blocks the next focus session until saved; the break remains usable. Load failures are shown separately from zero progress. If browser storage is unavailable, the UI warns that reload recovery is unavailable. Client clocks and completed sessions are not protected against deliberate manipulation; server-verified rewards should be added before introducing competitive or valuable rewards.

### Starter companion

Moss is the default starter companion, drawn as a simple SVG. Each saved completed focus session earns 25 EXP, including existing historical focus sessions regardless of their duration. Level starts at 1 and increases every 100 EXP. The EXP bar shows progress within the current level. EXP and levels belong to the account's journey and stay unchanged when switching companions.

At Level 5 (400 total EXP, or 16 saved completed focus sessions), Moss automatically evolves into Mossgrove. Its portrait, name, and description change, and the card shows the remaining saved sessions before evolution. This form derives from the existing journey level; it needs no database migration, extra reward, or confirmation button. The saved selection remains `moss`, so switching away and back or loading another device restores the correct form. Existing historical sessions count. Loading/error states do not assume an unevolved form. Only Moss has an evolution in this version; deleting saved focus history can reduce the level and derived form.

Companion progress comes from an exact all-time count of the account's completed focus sessions, using the existing RLS-protected table. It does not reset at midnight and needs no new table or migration. Breaks, cancelled/unfinished sessions, and pending unsaved sessions do not contribute. Retrying or reloading does not award extra EXP because the count uses saved rows rather than a separate reward balance. Progress refreshes after saving, on returning to the page, or through Refresh progress. Loading failures show an error with Retry rather than resetting the companion to Level 1.

### Discovery journal

Each saved completed focus session reveals one of three species: Fern Hare, Dawn Finch, or Amber Squirrel. Discoveries are added automatically; repeats increase that species' encounter count. The journal shows the latest saved encounter and hides undiscovered species. Discovered creatures can be chosen as the travelling companion; catching is not implemented.

Species derive deterministically from the final eight hexadecimal digits of the saved session UUID, modulo 3. The journal loads the account's completed focus sessions, including historical ones, in paginated completion order with UUID ordering as a stable tie-breaker. Reloading, retrying a save, or using another device reconstructs the same journal without extra tables or browser reward storage. Breaks and unfinished sessions are filtered out. Failed journal loads show Retry rather than an empty or partial collection. The mapping is fixed; persist discovery records before changing the species order or mapping. This is a simple noncompetitive discovery system, not a server-verified random reward.

### Companion selection

Run `migrations/202610150001_companion_preferences.sql` once in the existing project's SQL Editor. This creates `companion_preferences` with one selected companion per account, without changing existing focus sessions or their owner-only policies. Its RLS policy allows authenticated users to read/write only their own preference; writes additionally require Moss or a species discovered in that account's completed focus history. The database applies the same unsigned hexadecimal modulo-3 mapping as the browser. Anonymous access and deletion are not granted. The migration includes mapping assertions.

Run `tests/companion-preferences.test.sql` in SQL Editor to test actual grants and RLS, using the most recent account with a completed focus session. It tests selecting Moss and a discovered species, cross-account read/write isolation, and rejection of an undiscovered species. Test writes are rolled back.

Choose Travel with a discovered creature in the journal, or Travel with Moss on the companion card to return to the starter. The portrait, name, and description update only after the server confirms the selection. The same preference reloads on another device or after returning to the page. A missing preference defaults to Moss; failed loads show an error and disable initial selection rather than overwriting an existing preference. Save failures keep the last confirmed selection and offer reload or another attempt. Reload after an uncertain response retrieves whatever the server committed. Concurrent devices use the last successful write; no live subscription is added.

For deployment, set repository Actions Variables named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The workflow injects them at build time. These values are public frontend configuration, not secrets. Never substitute database passwords, OAuth client secrets, or service-role keys. `.env.local` must stay ignored and untracked.

## GitHub Pages

The workflow builds and tests pushes to `main`, then deploys `dist`. In repository Settings > Pages, select GitHub Actions as the source. Repository permissions may require the owner to enable Pages first. The base path is `/focuswilds/`.
