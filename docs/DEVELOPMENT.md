# Development

Requirements: Node.js 24, npm, and a Git clone with full history.

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

The displayed application version is computed from `version.json`: its base patch plus the number of commits reachable from HEAD after its anchor. Every new commit counts, including documentation and merge commits. Multiple commits in one push each count. No automated version commits or Git hooks are needed. Restart the dev server or rebuild after committing to refresh the displayed version.

`package.json` identifies the private application package; its version is not the live Git-derived application version. `version.json` is the release base. Full Git history is required; for a shallow clone, run `git fetch --unshallow`.

Only change major or minor when explicitly requested by the owner:

```sh
npm run version:minor
# or
npm run version:major
```

These commands reset the base patch to zero and set the anchor to the current commit. The commit recording that change then adds patch 1. Review, commit, and push `version.json` normally. Do not rewrite published history: it can change commit counts and therefore versions.

## Cloud data

Copy `.env.example` to `.env.local` and set the project URL and publishable key. GitHub OAuth sign-in and local sign-out are implemented. Enable the GitHub provider in Supabase and allow both `https://faahkc.github.io/focuswilds/` and `http://localhost:5173/focuswilds/` as redirect URLs. OAuth uses PKCE and returns to the app root, so no server callback route is needed on Pages.

Authentication tokens and the PKCE verifier are stored in sessionStorage for the current browser tab. Reloading the tab preserves the session; a new browser session may require signing in again. No game progress is stored in browser storage. Cloud saves and owner-only database policies are not implemented yet; login alone does not restrict signup to one account.

For deployment, set repository Actions Variables named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The workflow injects them at build time. These values are public frontend configuration, not secrets. Never substitute database passwords, OAuth client secrets, or service-role keys. `.env.local` must stay ignored and untracked.

## GitHub Pages

The workflow builds and tests pushes to `main`, then deploys `dist`. In repository Settings > Pages, select GitHub Actions as the source. Repository permissions may require the owner to enable Pages first. The base path is `/focuswilds/`.
