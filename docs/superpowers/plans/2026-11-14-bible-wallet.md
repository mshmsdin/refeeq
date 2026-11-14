# Bible temporary wallet implementation plan

**Goal:** Implement the wallet approved in this chat, in both Bible builds.
**Architecture:** SQLite stores expiring wallets and ordered reader snapshots. Two independent 14-character capabilities distinguish editing from viewing; the server enforces access. React restores the book/chapter/verse and ordered translations.
**Execution:** Inline in the existing workspace; preserve unrelated untracked translations. No push or deployment is authorized.

## Approved specification
- Header wallet button with item count; adjacent arrow toward it adds the current reader state.
- First addition creates a wallet for 48 hours; later additions use the same wallet.
- Editing and viewing links each have 14 random ASCII letters/digits. Viewers cannot mutate or retrieve editing credentials.
- Extend sets expiry to now + 24 hours only below 24 hours; otherwise show the remaining-time notice (exactly 24 is unchanged).
- Rows contain ordinal, pencil to move to a new ordinal, editable user label, excerpt, book/chapter/verse, deletion with confirmation.
- Preserve selected translations, their order, and book/chapter/verse when opening saved entries.
- Editors can rotate both links (invalidating both old ones) or delete the wallet, with confirmation.
- Expired wallets cannot be opened, edited or extended. They are removed on subsequent API access.
- Update help and both builds' public documentation; exclude capability URLs from indexing.

## Review focus
- Viewer requests for every mutation and absence of credential leakage.
- Expiry boundary, extension below/above/exactly 24 hours, and delayed browser timers.
- Rotation/deletion invalidate both links while keeping items on rotation.
- Moving items up/down, invalid positions, and references unavailable in a translation.
- Fresh/shared links, browser history, modal overlay, mobile width, and ordered translation restoration.

## Tasks
1. [x] Write and run failing API tests against an isolated SQLite database: create, scope/translation validation, snapshot/excerpt, viewer denials, ordering/labels/deletion, expiry, extension, rotation, deletion.
2. [x] Implement `server/utils/bible_wallet.js` and `server/routes/bible_wallet.js`; mount after JSON middleware in `server/server.js`. Run API tests.
3. [x] Test reader URL round-trips for both bases; implement wallet routes and translation query preservation.
4. [x] Implement `useBibleWallet.js` and `BibleWallet.jsx`; integrate header controls, modal controls and snapshot restoration in `BibleSection.jsx`, passing initial wallet state through `App.jsx`.
5. [x] Update `FeaturesPage.jsx`, public documentation and SEO variants. Keep random wallet URLs out of sitemaps and explicitly blocked in robots.
6. [x] Run API/route tests, server syntax, both client builds, whitespace checks; exercise actual UI and data locally, then independent review and targeted fixes.

## Verification
- `node --test server/utils/bible_wallet.test.js client/src/utils/bible_wallet_routes.test.js`
- `node --check server/server.js`
- `npm.cmd --prefix client run build`
- `VITE_BIBLE_ONLY=true VITE_BASE_PATH=/bible npm.cmd --prefix client run build` (PowerShell environment variables)
- `git diff --check`


## Results
- Wallet-focused tests: 15 passing; the shared route test file also now contains 2 concurrent search tests, all 17 pass.
- Full repository suite under Node 22: 123/125 pass. Unrelated failures: `server/db/arabic_translations_startup_import.test.js` expects 81 works but the existing untracked translation files bring the count to 88; `server/importers/qumran_4q246.test.js` reports an edition-file checksum mismatch. These files were not changed for this feature.
- Both Vite builds succeeded. Public files are nonempty; standalone SEO output exactly matches the SEO sources; sitemap XML parses and wallet routes are disallowed in robots.
- Syntax and whitespace checks passed.
- Actual full-server smoke test on an isolated copy of the database: editor 2 items; viewer cannot retrieve editor token; viewer extension rejected 403; rotated old link 404; wallet HTML has noindex and no-referrer; real Arabic 1 Esdras chapter returned 58 verses.
- Browser checks: add verse and chapter comparison, restore Greek-first/Arabic-second order, rename, move item, extension warning, rotate links with confirmation, Back/Forward, fresh viewer URL, mobile viewer and editor with no horizontal overflow, modal header and close on mobile.
- Independent review findings fixed: transient network errors never replace a wallet; stale mutation responses cannot leak editor UI into a viewer route; database reconnection; expiry cleanup outside rollback; history replacement on rotation; isolate countdown from reader; correct displayed translation ordering. Regression tests observed failing before fixes.
- Extra history regression fixed and tested: revisiting the same wallet token reloads it.
- Concurrent search changes in shared reader/routing files were preserved; no commits, pushes, or deployments performed.
