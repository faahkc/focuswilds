# Development

## สถานะการเปลี่ยนระบบ

ข้อกำหนดและลำดับส่งมอบอยู่ใน [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) เอกสารแผนไม่ใช่รายการความสามารถที่เปิดใช้แล้ว

- ทำแล้ว: ใช้ GNU Unifont ทั้ง UI พร้อมใบอนุญาต แปลส่วนบัญชีและข้อผิดพลาดเป็นไทย ตั้งภาษาเอกสารเป็น `th` ปุ่มหน้าแรกใช้ “เข้าสู่ที่พักพิง” และสถานะรอ “รอสักครู่…”
- ยังใช้ระบบเดิม: ตัวจับเวลา 25/5 นาที ประวัติ EXP เพื่อนสิ่งมีชีวิต และฉากป่า ข้อความส่วนนี้ยังเป็นอังกฤษ
- ยังไม่ทำ: งานในป้อม ผู้รอดชีวิต ทีมสำรวจ HP อุปกรณ์ คลังจำกัด การกู้ของ สมุดตำนาน และฉากป้อมใหม่
- README และ metadata เป็นคำบรรยายโลกใหม่แล้ว แต่ยังไม่ได้ล้างข้อมูลเดิม

ระบบใหม่จะเริ่มจากศูนย์ ไม่แปลงประวัติ เวลา EXP หรือความก้าวหน้าเดิม แต่การอนุมัติเริ่มใหม่ยังไม่ใช่การล้างข้อมูลที่เกิดขึ้นแล้ว ต้องมี schema ใหม่และขั้นตอนล้างข้อมูลเก่าแบบจำกัดขนาดและรันซ้ำได้อย่างปลอดภัยก่อนเปิดใช้ ห้ามให้ขั้นตอนล้างข้อมูลเก่าลบข้อมูลของระบบใหม่

### ข้อกำหนดสำหรับ implementation ถัดไป

- โฟกัสเริ่ม 15 นาที เลือก 5 / 15 / 25 หรือกำหนดเอง งานสะสมตามเวลาจริง แม้หยุดก่อนครบ ทุกคนทำงานพร้อมกันได้คนละหนึ่งงาน
- ทีมสำรวจสูงสุด 3 คน กระเป๋ารวมสูงสุด 10 ช่องตามความสามารถแบก คลังป้อมและที่พักขยายด้วยวัสดุและเวลาโฟกัส
- ผลเหตุการณ์ การใช้ของ HP และการตายต้องบันทึก atomic/idempotent เปิดใหม่ไม่สุ่มผลซ้ำ ทดสอบเน็ตหลุด ปิดหน้า และหลายแท็บ
- พื้นที่ป้อมปลอดภัย เลือกกลับแล้วปลอดภัยทันที ไม่ลงโทษการไม่ได้เปิดแอป
- คง Spark ไม่มี Billing ไม่มี polling/listeners ใช้ summary documents ไม่สแกนประวัติ อ่านประวัติไม่เกิน 25 ต่อหน้า daily-summary queries ไม่เกิน 30 และใช้ Asia/Bangkok
- ออกแบบ read/write budget ของ schema ใหม่ก่อนต่อ persistence ตารางด้านล่างเป็นของระบบเดิมเท่านั้น
- ลบโค้ด tests รูป และ dependency เดิมเมื่อไม่มีผู้ใช้ รวมการลบใน commit โดยไม่ rewrite Git history
- README เป็นคำบรรยายโลกและบรรยากาศล้วน ไม่ใส่รายการระบบ วิธีใช้ รายละเอียดเทคนิค หรือชื่อผลงานอ้างอิง

Requirements: Node.js 24, npm, and a Git clone.

## Planned bilingual Settings

The replacement app will support English (`en`, default) and Thai (`th`). Settings is available only after sign-in, through an icon dialog, and stores the preference in the account's Cloud Firestore data on the existing Spark project without Billing. The current Thai account text is an interim implementation; English defaults, Settings, and preference persistence are not shipped yet.

Load language with account data, reuse the loaded value when reopening Settings, and write only on a saved-value change. Saved preferences apply across devices on account load or explicit refresh; no listener, polling, or focus refetch is introduced. Report failed reads/writes and allow retry without claiming a successful save or overwriting an unread preference. Validate `en`/`th` in application code and rules, and document actual read/write costs with the new schema. Language changes must preserve the mounted timer and game state. Test these cases offline, including English defaults and save failures. README and IMPLEMENTATION_PLAN.md stay English.

Validate dependency changes with `npm ci` in a clean directory and the Linux CI build. Preserve lockfile metadata for bundled optional dependencies; an existing `node_modules` tree can hide an incomplete lockfile. Missing bundled dependency entries can stop deployment before tests run.

## Firebase setup

GitHub Auth and Firestore Lite use the public configuration in src/lib/firebase.ts. OAuth client secrets stay in the Firebase console. Enable GitHub Authentication, set the GitHub callback to https://focuswilds.firebaseapp.com/__/auth/handler, and authorize faahkc.github.io (plus localhost for local testing). Session persistence stays scoped to the current tab.

Only the owner UID in src/lib/account.ts is allowed. Publish the contents of firestore.rules in the Firebase console before using this version: it restricts access to the owner, validates basic document shapes, keeps saved sessions immutable, and rejects session queries without a limit of at most 25 (daily summaries: 30). All unlisted paths and deletes are denied. The rules do not prove focus duration or independently recompute rewards; this is a personal app, not a competitive reward system.

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

## Website loading and cache

### Scene and typography

The current signed-in scene uses a 144,946-byte WebP background on a flat plane, with pixel companions on separate perspective planes, drifting fog, rain and embers. It does not contain modeled terrain or buildings, or depth-of-field postprocessing. Three.js loads in a separate chunk after the timer UI mounts. Point lighting flickers during focus and becomes warmer at camp. The login title screen reuses the same WebP as a static full-viewport background before sign-in, adding 144,946 bytes to the initial image transfer without a second scene asset. The animated journey and graphics renderer load after sign-in. Artwork stays local to the site; there are no cloud asset requests or additional document reads/writes. The interface uses bundled GNU Unifont 17.0.05, including body text, editable fields, dialogs, headings, controls and the clock. The Thai/Latin/punctuation WOFF2 subset is 5,976 bytes and includes upstream copyright metadata and the OFL license. It replaces the previous font assets. Account controls and account errors are Thai; the existing journey screens remain English until their replacement. Scene and font assets total 150,922 bytes, below 500 kB. The new fort artwork is not implemented.

The font subset comes from `https://unifoundry.com/pub/unifont/unifont-17.0.05/font-builds/unifont-17.0.05.otf`. To reproduce it with FontTools and Brotli, run `pyftsubset unifont-17.0.05.otf --unicodes=U+0020-00FF,U+0E00-0E7F,U+2000-206F --flavor=woff2 --name-IDs='*' --name-languages='*' --name-legacy --output-file=unifont-thai-latin.woff2`. Retain upstream copyright/name metadata and the bundled OFL notice. Do not commit the full font or temporary conversion tools. Text outside this subset can use the system fallback.

Motion off and the device reduced-motion preference stop both CSS and WebGL animation. Hidden tabs stop the render loop; returning resumes only when motion is enabled. Scene replacement disposes GPU resources and resize observers. The HTML image and companion remain as the fallback if WebGL cannot start. The renderer does not save data or add document reads/writes; the quota table below is unchanged.

Visual verification on 2026-10-16 used isolated Edge with intercepted authentication and an in-memory store; external requests were blocked. Desktop 1280×720 / 1440×900 and portrait 390×844 / 320×568 layouts fit the viewport. Pixel comparisons confirmed animation, Motion off and reduced-motion behavior. Timer countdown continued through a guide dialog; Escape restored focus. The main scene was checked in focus and rest. New rendering on physical Safari remains unverified. The separate graphics chunk increases the signed-in JavaScript download; the production build can still report a chunk-size warning.

The subsequent GNU Unifont/account translation check verified loaded font and login bounds at 1280×720, 390×844 and 320×568, and reviewed a phone screenshot. It did not repeat the earlier signed-in scene checks with the new font or test real OAuth sign-in. A later cleanup fixed account styling that still depended on the old English accessibility label: styles now use `.wilds-account`, independently of the translated label. Browser checks confirmed the current shelter button fits those three viewport sizes with its intended font size, 48px minimum height and arrow decoration. Physical-device Thai mark placement and long Thai paragraphs remain to be verified during the full UI replacement.

Playwright screenshots and console logs belong in ignored `.playwright-mcp/`. Remove artifacts once they are no longer needed after verification; retain files still used for diagnosis or open in the user's editor. Do not commit temporary screenshots, full-resolution unused originals, font conversion tools or downloaded full fonts. Commit deletions of tracked assets that no longer have callers.

The journey and Firestore Lite code load after sign-in. The history view loads only after Open history; its existing bounded queries remain unchanged. React lazy imports cache loaded modules for the page lifetime. Loading states are announced with role=status. This reduces initial transfer, not necessarily the total bytes when every feature is opened.

Vite keeps content hashes in JavaScript and CSS filenames so unchanged assets retain their URLs. GitHub Pages was checked on 2026-10-15: HTML and JavaScript returned Cache-Control: max-age=600; JavaScript also returned ETag and Last-Modified. Browser cache can reuse fresh assets and revalidate expired ones. Cache headers are managed by GitHub Pages, not this Vite config. Do not add unsupported header files or a service worker merely to hide the bundle warning; stale app code can interfere with authentication and schema changes. No cloud prefetch, polling, or extra document reads were introduced.

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

## Cloud data — current legacy journey

This section describes the running journey implementation, not the planned shelter schema. Keep its behavior intact until the replacement and reset path are ready.

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

### Saved progress — before the shelter reset

The one-time migration is complete. The application loads existing Firebase progress directly; there is no backup upload or restore screen. Missing or incomplete progress shows an error without initializing, resetting or overwriting cloud data. Existing migration metadata remains readable for compatibility. Keep the original JSON backup outside Git; normal use does not require it.

These are the legacy loader's current safeguards. The approved shelter rollout intentionally starts fresh, but no reset is implemented yet. Current Firestore rules deny deletes and unlisted paths; any new schema or bounded reset procedure requires corresponding validated rules changes before deployment. Do not add an automatic client reset to work around missing or incomplete progress.

### Bounded live verification — legacy behavior only

1. Sign in and compare saved totals and companion. Reload once to confirm persistence.
2. Open history once and check the selected period and one session page as applicable. Do not loop refreshes.
3. Complete one real focus round. Verify +1 session, +25 EXP, +25 minutes and one discovery. This live completion check was previously skipped by the owner.
4. If a write is uncertain, use the existing Retry action; do not create replacement sessions.

Firebase Spark remains without Billing. No images, analytics, functions or file uploads use Firebase. Images and animations remain website assets on GitHub Pages.
