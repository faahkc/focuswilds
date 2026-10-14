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

Authentication tokens and the PKCE verifier are stored in sessionStorage for the current browser tab. Reloading the tab preserves the session; a new browser session may require signing in again. No game progress is stored in browser storage. Cloud saves and owner-only database policies are not implemented yet; login alone does not restrict signup to one account.

For deployment, set repository Actions Variables named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The workflow injects them at build time. These values are public frontend configuration, not secrets. Never substitute database passwords, OAuth client secrets, or service-role keys. `.env.local` must stay ignored and untracked.

## GitHub Pages

The workflow builds and tests pushes to `main`, then deploys `dist`. In repository Settings > Pages, select GitHub Actions as the source. Repository permissions may require the owner to enable Pages first. The base path is `/focuswilds/`.
