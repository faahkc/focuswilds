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

React, TypeScript, Vite, Tailwind CSS, and shadcn/ui are configured. Components live in `src/components/ui`; add only those needed using the shadcn CLI or MCP.

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

The active timer and one pending save are kept in sessionStorage under the account ID, so reloading this tab resumes them. Cloud progress is available across devices; active timers are not synchronized across tabs or devices. Closing the tab can discard an unfinished timer or unsaved session. Signing out hides that account's timer; signing back in in the same tab restores it. No account's progress is shown to another signed-in user. Existing running/paused database rows are not resumed or changed by this timer.

Completed sessions use a stable UUID and `ON CONFLICT DO NOTHING` via Supabase upsert, so retrying a save or reloading while a request is in flight does not double-count. A failed save stays pending, offers Retry, and blocks the next focus session until saved; the break remains usable. Load failures are shown separately from zero progress. If browser storage is unavailable, the UI warns that reload recovery is unavailable. Client clocks and completed sessions are not protected against deliberate manipulation; server-verified rewards should be added before introducing competitive or valuable rewards.

For deployment, set repository Actions Variables named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The workflow injects them at build time. These values are public frontend configuration, not secrets. Never substitute database passwords, OAuth client secrets, or service-role keys. `.env.local` must stay ignored and untracked.

## GitHub Pages

The workflow builds and tests pushes to `main`, then deploys `dist`. In repository Settings > Pages, select GitHub Actions as the source. Repository permissions may require the owner to enable Pages first. The base path is `/focuswilds/`.
