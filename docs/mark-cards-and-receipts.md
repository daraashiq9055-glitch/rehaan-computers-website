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

The browser Firebase SDK is intercepted with isolated fixtures. No production services are written. The additional **real-SDK Firestore emulator check passed** against the unchanged deployed rules: complete data preservation, mark persistence, atomic payment/receipt commits, duplicate retries, simultaneous admins, stale marks, public/non-admin denial and public privileged-field injection were verified.

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

`backup/before-markcards-receipts-2026-10-18` on GitHub preserves `3df4dea`, the working release before these additions. It is a code backup. Download a fresh private JSON backup from the live dashboard before deployment and keep it outside `public/`.

The emulator check has passed. Follow `docs/deploy-and-rollback.md` for a Hosting-only deployment from `codex/admin-dashboard-redesign`. Do not deploy the disconnected `preview/next-features-cmd-2026-10-18` branch, Firestore rules or either worker for this update.

Hosting rollback to the prior release restores code without deleting new `markCard` or `feeReceipts` fields; the older dashboard ignores those fields and preserves them during normal field-specific edits. Do not restore an old full JSON backup over newer student payments. A rollback is not a data restore.
