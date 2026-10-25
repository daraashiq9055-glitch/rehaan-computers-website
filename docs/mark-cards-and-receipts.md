> Latest marks-card preview: [professional card, typing metrics and private signatures](mark-card-premium.md), version **20261025-admin-12**. Review before deployment; no live changes have been published.

# Mark cards and fee receipts

This release adds one **Mark Cards** section to the existing admin dashboard and receipts to **Fees & payments**. The original layout, login, student register, offline enrolment and Cloudinary integration remain. No preview adapter, sample data, JSON loader, additional assessment tab, bulk import, new activity screen or certificate feature is included in Hosting.

## Persistent mark cards

All loaded students are available in Mark Cards, including legacy and pending records. Enter an assessment title/date, 1–12 subjects, maximum marks and obtained marks. Blank marks remain incomplete. Save before printing the A4 card.

Each student's latest saved card lives in `applications/{studentId}.markCard` with `title`, `date`, `subjects`, `updatedAt` and `updatedBy`. Saving uses a Firestore transaction. If another admin changed that card after it was loaded, the stale save is rejected. Only the mark card and modification metadata are updated; profile fields, admission payment, monthly fees, photos and unknown legacy fields are preserved. Existing cards load on the next admin sign-in without importing a JSON backup.

The section manages one current card per student, not an exam-history archive. Grading follows the accepted preview: at least 33% in every component, A+ from 90%, A from 75%, B from 60%, C from 45%, D from 33%. Incomplete/failed components cannot be hidden by a high overall percentage.

## Receipts saved with payments

The existing monthly payment dialog still adds a partial payment to the selected due's received total; the ₹100 admission fee remains separate. After confirmation, it now offers **Print / WhatsApp receipt**. The dialog stays open so the receipt can be reviewed.

Each payment form generates one 128-bit random reference. A single Firestore transaction re-reads the student's current record, checks enrolment, admission details and starting balance, then updates both:

- `monthlyFees.{dueDate}`: cumulative rupees received for that due.
- `feeReceipts.{receiptId}`: one saved receipt snapshot for the new amount. Original values are retained if an admin later corrects it.

A failed commit saves neither field. Transaction retries use the same reference, and retry after an uncertain acknowledgement returns the already-saved receipt without adding money twice. Concurrent admins cannot both save from a stale starting balance. The frontend also blocks repeated submissions. The existing admission-anniversary due calculation is retained.

Each receipt stores its student reference, name/admission/course snapshot, due date, fee month, payment date, amount, cumulative received amount, balance at issue, actor and creation time. Its amounts are integer paise; `monthlyFees` retains the existing rupee representation. The number is `RC-` followed by the full random reference, rather than an unsafe client-side sequential counter.

Saved receipts are listed inside Fees & payments and remain available after a new sign-in. Later payments do not rewrite old receipt balances. Existing monthly totals remain unchanged and are not converted into invented individual payment events. No automatic data migration runs on page load.

Receipt metadata is stored with the student document; PNG/PDF files are generated locally on demand and are not stored in Firestore or Cloudinary. As with any Firestore document, the 1 MiB document limit still applies; if a document reaches that limit, the whole payment transaction fails without a partial fee update.

## Audited receipt corrections

In **Fees & payments → Saved receipts → open a receipt → Edit / correct receipt**, admins can correct the printed student name/admission/course, payment date, amount, manually recorded method and optional printed note. A reason of 5–500 characters and confirmation are required. This edits the receipt's display details, not the student's profile. The student's current saved mobile is still used for WhatsApp.

The correction uses one Firestore transaction. It re-reads the receipt and due's monthly total and rejects stale values. Amounts are validated in integer paise; only the difference between old/new receipt amount is applied to `monthlyFees.{due}`. For example, correcting ₹400 to ₹300 changes a ₹600 monthly total to ₹500, with ₹499 due. It cannot exceed the ₹999 tuition, reduce a total below its receipt amount or save a zero/negative receipt. The ₹100 admission payment, online payment provider fields, other due dates, other receipts, photos and unknown fields are preserved. No gateway charge or refund occurs.

Every correction appends `amendments[]` with its stable random ID, reason, timestamp, admin UID, before/after snapshots, requested changes and ledger delta. Original receipt number/creator/time stay fixed. A lost-acknowledgement retry with the same reference cannot apply the change twice. Concurrent corrections allow one update and reject the stale one. History stores flat snapshots, not recursively nested histories; at 100 corrections the UI requires separate review rather than silently dropping history. Firestore's document size limit also applies. This is application-maintained history under the existing admin rules, not a separately enforced immutable audit collection.

After an amount correction, print/PNG/WhatsApp explicitly label the updated total/balance **at correction**. Later payments leave that saved snapshot alone. A text-only correction keeps the existing balance snapshot. The private reason and admin ID appear only in Correction history, not the student receipt. The fixed-size PNG canvas encodes immediately, avoiding deferred detached-canvas encoding after print/download cycles. Reprint or resend the corrected image when needed; previously downloaded images cannot update themselves.

## Photo display and transfer counts

A successful authenticated admin upload seeds a temporary viewer URL from the crop just uploaded, so the dashboard can show the saved photo without waiting for a second private Cloudinary fetch. Only the private Cloudinary reference is saved to Firestore. Public applicant uploads do not seed admin viewing. All viewer URLs/caches are in memory and revoked on sign-out.

Older private photos still load through the authenticated proxy. The register/details/viewer show loading feedback and offer **Retry photo** when that read fails. There is no public-URL fallback. Settings now separates already linked Cloudinary photos from valid older inline photos eligible for transfer. **Transfer 0 photos** means there are no eligible old inline photos to move; it does not mean storage is empty. New offline photos upload directly and require no manual transfer.

## Printing and WhatsApp

- One receipt: A5 landscape, warm yellow/gold stationery.
- Two blank handwritten forms: A4 portrait.
- Mark card: A4 portrait, existing green/ivory paper colours with readable text.

Use the in-app print button, disable browser headers/footers and enable background graphics. Physical printer margins depend on the printer. Three-subject cards are checked for a single page; many subjects can require more pages.

For WhatsApp, download the receipt PNG, open the student's saved Indian mobile number, attach the image and press Send. The link addresses the current saved student number and fills the receipt details. It cannot attach a local image automatically. Missing/invalid student mobiles disable the link; guardian numbers are not substituted. No automated message or delivery claim is made.

## Access and compatibility

These fields remain within the existing `applications` collection. The currently deployed rules already restrict reads/updates to valid admins. Public application creation's field allowlist rejects `markCard` and `feeReceipts`. No rules deployment or new collection permission is needed.

The public admission form, gateway flow, photo worker, Cloudinary configuration, main website files and existing Firestore rules are unchanged. Student photos continue to use the configured Cloudinary upload/private-view flow. No live write, test payment, admission or message was made during development.

## Validation performed

- 41 Node tests: record compatibility, mark validation, guarded saves, atomic receipts, idempotent retries, concurrent admins, permissions failures, photo upload/private viewing, immediate admin-upload display, retry handling, receipt correction/audit history and photo worker checks.
- Existing fee/reminder timing checks: pass.
- Existing admin browser regression: passes with Cloudinary integration disabled and enabled (including offline enrolment, photo upload/view, payment conflict protection, exports and sign-out).
- New-feature browser tests: saved marks/receipts load in a fresh admin session, all original fields survive, denied writes create no receipt, A4/A5 PDF and PNG output works, WhatsApp addresses the saved mobile, 100 student fixtures are selectable, and desktop/mobile layouts fit.
- Public payment regressions: 17 scenarios pass, including successful, denied, pending, reconciled and photo-upload failure flows. Site-details browser regressions: all 6 checks pass.

The browser Firebase SDK is intercepted with isolated fixtures. No production services are written. The additional **real-SDK Firestore emulator check passed** against the unchanged deployed rules: complete data preservation, mark persistence, atomic payment/receipt commits, duplicate retries, simultaneous admins, atomic audited receipt corrections, stale receipt/ledger rejection, stale marks, public/non-admin denial and public privileged-field injection were verified.

The default Firebase CLI emulator download remained blocked by the environment proxy, so the test used Google's official Cloud SDK registry distribution instead. The immutable image was `gcr.io/google.com/cloudsdktool/google-cloud-cli:589.0.0-emulators`, amd64 manifest `sha256:e0f1f4b18f4f3389022d8222f5bbbad6e53b585ec1f71602fe71af7b1c83a31f`. The layer SHA-256 was verified as `bed7b1871148a3d0f23b8995bba16ce043df9a16e5f18c6aed3eecf90e2f9fd9`, and the extracted JAR as `6262939c48d3d6b08495931706b8920399e57d5f5918e6af133a3d30cb3ae369`. The emulator reported **1.22.0**. TLS and digest verification were retained.

## Repeat the local checks

```sh
node --test tests/admin-features.test.mjs tests/admin-records.test.mjs tests/photo-storage.test.mjs tests/photo-worker.test.mjs
node tests/admin-fees.test.cjs
node tests/fee-reminder.test.cjs
python3 tests/admin-browser.py
python3 tests/admin-features-browser.py
python3 tests/admission-payment-browser.py
python3 tests/site-details-browser.py
```

For local real-SDK tests, install isolated dependencies and obtain the pinned official emulator (Python 3.11+, curl, Node and Java 21+):

```sh
npm --cache /tmp/rehaan-npm-cache install --prefix /tmp/rehaan-feature-tests --package-lock=false --no-audit --no-fund @firebase/rules-unit-testing@5.0.0 firebase@12.2.1
python3 tests/setup-firestore-emulator.py
java -Duser.language=en -cp /tmp/rehaan-firestore-emulator/cloud-firestore-emulator.jar com.google.cloud.datastore.emulator.firestore.CloudFirestore --host=127.0.0.1 --port=8088 --rules=firestore.rules --project_id=demo-rehaan-features
```

Leave that process running, then in another shell from the repository root:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8088 NODE_PATH=/tmp/rehaan-feature-tests/node_modules node tests/firestore-gender.test.cjs
FIRESTORE_EMULATOR_HOST=127.0.0.1:8088 NODE_PATH=/tmp/rehaan-feature-tests/node_modules node tests/admin-features-emulator.mjs
```

The setup helper retains a verified cache in the system temporary directory; it downloads the official registry layer only if needed. The demo-project/localhost guards prevent these tests from running against live Firestore. No production credentials are required.

## Backup, deployment and rollback

`backup/before-photo-receipt-fixes-2026-10-18` preserves `7ebbdf7`, the previously deployed marks/receipts release before these photo and correction changes. This is the preferred code rollback point for this update. Deploy only Hosting from the main dashboard branch; no Firestore rule, Worker or secret changes are required. Download a fresh private JSON backup before updating. A code rollback does not undo already saved corrections; use their history for review rather than restoring a stale full backup.


`backup/before-markcards-receipts-2026-10-18` on GitHub preserves `3df4dea`, the working release before these additions. It is a code backup. Download a fresh private JSON backup from the live dashboard before deployment and keep it outside `public/`.

The emulator check has passed. Follow `docs/deploy-and-rollback.md` for a Hosting-only deployment from `codex/admin-dashboard-redesign`. Do not deploy the disconnected `preview/next-features-cmd-2026-10-18` branch, Firestore rules or either worker for this update.

Hosting rollback to the prior release restores code without deleting new `markCard` or `feeReceipts` fields; the older dashboard ignores those fields and preserves them during normal field-specific edits. Do not restore an old full JSON backup over newer student payments. A rollback is not a data restore.

## Sign-in compatibility after a Hosting update

The 2026-10-18 correction release exposed a warm-browser-cache failure: a new `admin-app.js` could import a still-cached old `admin-feature-store.js` without the new `correctReceipt` export. The browser rejects the module graph before Firebase sign-in initializes. This exact error was reproduced locally; the live files themselves matched the release after normalizing Windows line endings, and the fresh live module graph initialized successfully using TLS-verified read-only downloads.

The admin HTML now imports a versioned entry point, and all changed dependencies use the same release query. Increment this query throughout the changed admin module graph for future releases that change module contracts. Hosting sets `Cache-Control: no-cache` on `/admin**` and `/photo-storage*.js` so browsers revalidate these files. This header change does not modify database permissions or records. The entry HTML itself may still be cached from the previous policy during the first corrective update; open `admin.html?release=20261018-login-fix-1` or perform a hard refresh after deployment.

Run `python3 tests/admin-release-browser.py` for the warm-cache regression. It serves obsolete module APIs at the original unversioned URLs and verifies that the versioned graph bypasses them, initializes sign-in and allows fixture admin login without record writes. Existing admin and feature browser suites also cover the versioned files.
