# Development

## Current milestone

Login only, with a warm pixel cat mark, GNU Unifont, a shared portrait frame and owner-only GitHub account status. Landscape and square viewports hide the mounted application and show a portrait-mode notice, including before startup. No automatic rotation. The page remains the same after sign-in. There are no game routes, timer, shop, garden scene, custom keyboard or database calls yet. Future gameplay is described in IMPLEMENTATION_PLAN.md.

## Local development

Use Node 24 and npm. Run `npm ci`, `npm run prepare`, `npm run dev`, `npm test`, `npm run lint` and `npm run build`. Tests use the network-blocking preload and never production services. The pre-commit hook increments the patch version in package.json and package-lock.json together. GitHub Pages uses the existing `/focuswilds/` base path.

## Authentication and Firebase

The existing Firebase project is `focuswilds`. Public web configuration and App Check setup remain in src/lib/firebase.ts; do not commit OAuth secrets, admin credentials or debug tokens. Auth is session-scoped. Keep the existing GitHub provider, authorized domains and App Check security configuration. The owner UID is defined in src/lib/account.ts. Accounts other than the owner show an access-denied message and cannot reach game content. This is an application access check, not an Auth-server signup allowlist: GitHub Authentication can still create a non-owner account, but grants no application or database access. Firestore rules do not control Authentication sign-in.

This login-only client performs zero Firestore reads/writes. firestore.rules denies all document reads/writes until a concrete cat-game schema is implemented. Local rules edits are not deployed rules. Retain Firebase Authentication users and user/profile documents. The owner authorized clearing old session/game documents, not deleting profiles or the whole project/database. Inspect actual production document paths before deletion; do not guess profile locations from the retired schema. No Firebase CLI or Emulator is needed for development.

The owner chose to perform production data cleanup and rules publication in the Console. The owner reported both operations complete on 2026-10-19; they were not performed or independently verified by the agent. Never report remote deletion based solely on local file changes. No real data is touched by npm tests.

### Owner Console steps for the clean start

1. Open [Firestore Data](https://console.firebase.google.com/project/focuswilds/firestore/databases/-default-/data) and select the existing database. Keep every Firebase Authentication user. Keep `users/7FnLLAGqAFYO269Jl1j2I8lEQbx2` itself and all user/profile/account documents and fields. Do not delete the `users` collection, its owner document, or the database.
2. Under that owner's document, inspect the named paths below. They are the retired game's known paths, not permission to delete arbitrary collections. Delete the old gameplay collections `shelterSessions`, `shelterDays` and `shelterOperations` if present. Delete only `shelter/state` within `shelter`. Legacy `sessions`, `days` and `state/progress` may already be gone; remove them only if present. Preserve every other document, including any profile sibling under `state` or `shelter`. Console deletion of a collection is destructive; confirm the exact path before accepting it. Do not delete the owner parent to try to remove its children.
3. Verify the old game/session paths are gone, while the owner/profile records and Authentication account remain. If actual paths differ or a document mixes profile and gameplay fields, stop on that document instead of guessing which information to discard.
4. Open [Firestore Rules](https://console.firebase.google.com/project/focuswilds/firestore/databases/-default-/rules), replace the rules with the exact contents of the repository's `firestore.rules`, and click **Publish**. This denies client reads/writes for the login-only milestone; Console administrators can still manage data. Publishing GitHub Pages does not publish Firestore rules.
5. Open the new site and sign in with the existing owner account. It should stay on the login page with the signed-in message, without recreating game/session documents. Report completion of data deletion and rules publication separately. Future game screens will introduce a validated owner-only schema and narrowly scoped rules; do not temporarily enable public access.

No new database schema or dummy game documents are needed for this page: it uses Auth only. See [Firebase's deletion guidance](https://firebase.google.com/docs/firestore/manage-data/delete-data) for the difference between deleting a document and its subcollections.

When game screens arrive, define versioned account summaries and atomic/idempotent commands with documented read/write budgets, bounded collection sizes and validated catalog prices. No listeners, polling, refetch-on-focus or animation-driven reads. Keep Spark without Billing. Use Asia/Bangkok for account days; history pages at most 25 and daily-summary queries at most 30. Do not enable unrestricted writes to speed up prototyping.

## Mobile and assets

The manifest requests standalone portrait display and uses new cat icons. It is not proof of physical-device installation. There is no service worker or offline startup. Viewport/gesture controls request fixed scale; browsers and OS accessibility settings may override them. Verify real iOS/Android behavior separately from emulation. External provider pages keep their own keyboard and orientation. The custom keyboard is deferred until an editable first-party screen exists.

The login icon is a small code-native SVG. Future game art is warm pixel art produced with Aseprite: cats, home, garden and props. Install Aseprite locally and verify the actual executable path with `& 'C:\Program Files\Aseprite\Aseprite.exe' --version` in PowerShell (replace the example path). No MCP or Codex configuration change is needed for CLI use. Store editable sources/backups outside deployed assets. Define the first cat's frame dimensions, foot anchors, timings and transparency before writing its export/import code. No previous sprite layout is a requirement for new cats.

## Git and cleanup

The current cleanup removes retired gameplay, visual assets and dependencies. A local ignored backup of the four pre-existing artwork/code drafts is kept under `.cache/pre-login-cleanup`; it is not shipped or retained in Git history. Old Playwright artifacts were deleted (287 files, 542,690,665 bytes); retain only evidence from current checks afterward.

The owner selected history filtering, preserving code commits rather than starting a new root. Back up the repository outside tracked files, inspect the exact obsolete asset paths, filter only those paths, validate rewritten refs and push with an explicit lease against the observed remote heads. Do not delete unrelated remote branches/tags. Historical commits can retain references to removed assets and need not build. GitHub may retain unreachable objects/caches after a rewrite; pushing does not prove immediate space reclamation. Do not use a remote mirror push or indiscriminate size threshold.

The main-branch filter removed 31 exact retired image/font paths and two old icon blobs, retaining the new icons and current GNU Unifont. All 82 original commit subjects/order were preserved and the verified current tree hash stayed identical across filtering. A packed reachable-history comparison decreased from 6,189,581 to 603,764 bytes before this report commit. That measures the filtered main history, not GitHub's billed storage or caches; local tool refs and `.cache/pre-image-filter.bundle` still retain recovery copies. Only main is scheduled for a force-with-lease update against the observed remote head; unrelated refs are not deleted.

## Verification

Verification on 2026-10-18: 13 offline tests, lint and production build passed. Browser checks at 390x844, 844x390, 320x568, 1024x1024 and 1440x900 showed a portrait logical frame, a reachable sign-in button and no horizontal document overflow. Mocked owner and non-owner accounts stayed on the one login screen; popup failure left a usable retry button. All external requests were blocked during these checks. The inspected phone capture uses the new pixel cat icon. The application JS is about 325 kB minified / 101 kB gzip, with no old scene chunk or 500 kB warning. Real GitHub authentication, production Firebase cleanup/rules, installed-device zoom/orientation behavior and real-phone performance must be reported separately. No game features are implemented by this cleanup.


2026-10-19 update: warm App Check attestation before showing the GitHub sign-in button to avoid spending Safari user activation waiting on the first token. Preparation failures expose a separate setup retry; no popup is attempted until a subsequent fresh tap. Keep App Check enabled. Do not substitute cross-origin signInWithRedirect on GitHub Pages: Safari third-party storage restrictions require a supported hosting/auth-domain arrangement (see https://firebase.google.com/docs/auth/web/redirect-best-practices). A fully blocked popup still needs browser permission; real Safari acceptance of this fix remains pending. No additional database reads/writes. The owner reported real deployed owner sign-in, installation and zoom checks successful before this fix; device/browser versions were not supplied.

Verification for the 2026-10-19 update: 16 offline tests, lint and production build passed. Browser checks at 390x844, 844x390 and 600x600 confirmed portrait content, landscape/square notice, no rotation transform and the same mounted application after returning to portrait. Safari popup behavior still requires a real-device retest.
