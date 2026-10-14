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

The Supabase client library is installed, but authentication and database access are not implemented yet. `.env.example` reserves public configuration names. No personal progress is stored in browser localStorage. When cloud saves are implemented, restrict access with database policies before storing personal data.

## GitHub Pages

The workflow builds and tests pushes to `main`, then deploys `dist`. In repository Settings > Pages, select GitHub Actions as the source. Repository permissions may require the owner to enable Pages first. The base path is `/focuswilds/`.
