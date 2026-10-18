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
- `feeReceipts.{receiptId}`: one immutable receipt snapshot for the new amount.

A failed commit saves neither field. Transaction retries use the same reference, and retry after an uncertain acknowledgement returns the already-saved receipt without adding money twice. Concurrent admins cannot both save from a stale starting balance. The frontend also blocks repeated submissions. The existing admission-anniversary due calculation is retained.

Each receipt stores its student reference, name/admission/course snapshot, due date, fee month, payment date, amount, cumulative received amount, balance at issue, actor and creation time. Its amounts are integer paise; `monthlyFees` retains the existing rupee representation. The number is `RC-` followed by the full random reference, rather than an unsafe client-side sequential counter.

Saved receipts are listed inside Fees & payments and remain available after a new sign-in. Later payments do not rewrite old receipt balances. Existing monthly totals remain unchanged and are not converted into invented individual payment events. No automatic data migration runs on page load.

Receipt metadata is stored with the student document; PNG/PDF files are generated locally on demand and are not stored in Firestore or Cloudinary. As with any Firestore document, the 1 MiB document limit still applies; if a document reaches that limit, the whole payment transaction fails without a partial fee update.

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

- 36 Node tests: record compatibility, mark validation, guarded saves, atomic receipts, idempotent retries, concurrent admins, permissions failures, photo upload/private viewing and photo worker checks.
- Existing fee/reminder timing checks: pass.
- Existing admin browser regression: passes with Cloudinary integration disabled and enabled (including offline enrolment, photo upload/view, payment conflict protection, exports and sign-out).
- New-feature browser tests: saved marks/receipts load in a fresh admin session, all original fields survive, denied writes create no receipt, A4/A5 PDF and PNG output works, WhatsApp addresses the saved mobile, 100 student fixtures are selectable, and desktop/mobile layouts fit.
- Public payment regressions: 17 scenarios pass, including successful, denied, pending, reconciled and photo-upload failure flows. Site-details browser regressions: all 6 checks pass.

The browser Firebase SDK is intercepted with isolated fixtures. No production services are written. The additional real-SDK Firestore emulator check is **pending**: this cloud environment's network policy returns HTTP 403 when downloading Google's emulator JAR from `storage.googleapis.com`. A domain addition was saved for environment review; it has not been claimed to be active. Deployment is held until this check runs.

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

After applying the saved cloud network change, install isolated emulator-test dependencies and run the emulator (no production credentials required):

```sh
npm --cache /tmp/rehaan-npm-cache install --prefix /tmp/rehaan-feature-tests --package-lock=false --no-audit --no-fund @firebase/rules-unit-testing@5.0.0 firebase@12.2.1
XDG_CONFIG_HOME=/tmp/rehaan-firebase-config FIREBASE_EMULATORS_PATH=/tmp/rehaan-firebase-emulators NODE_PATH=/tmp/rehaan-feature-tests/node_modules npm --cache /tmp/rehaan-npm-cache exec --yes --package firebase-tools@15.34.0 -- firebase emulators:exec --only firestore --project demo-rehaan-features --config firebase.emulator.json "node tests/firestore-gender.test.cjs && node tests/admin-features-emulator.mjs"
```

The demo-project guard prevents the test script from running against live Firestore. Firebase CLI pins the emulator version/checksum; do not bypass TLS or checksum verification to obtain the JAR.

## Backup, deployment and rollback

`backup/before-markcards-receipts-2026-10-18` on GitHub preserves `3df4dea`, the working release before these additions. It is a code backup. Download a fresh private JSON backup from the live dashboard before deployment and keep it outside `public/`.

After the pending emulator check passes, follow `docs/deploy-and-rollback.md` for a Hosting-only deployment from `codex/admin-dashboard-redesign`. Do not deploy the disconnected `preview/next-features-cmd-2026-10-18` branch, Firestore rules or either worker for this update.

Hosting rollback to the prior release restores code without deleting new `markCard` or `feeReceipts` fields; the older dashboard ignores those fields and preserves them during normal field-specific edits. Do not restore an old full JSON backup over newer student payments. A rollback is not a data restore.
