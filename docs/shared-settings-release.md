# Complete admin Settings release

Candidate: `20261102-settings-2`. No production deployment has been performed
from this workspace. Use the guarded command below, not a Hosting-only deploy.

## Connected behavior

Settings is now part of the complete admin dashboard (`python preview-admin.py`).
The separate `preview-settings.py` remains a design study; it is not deployed.

- Institute contact/address details, per-document paper/footer defaults and
  custom attendance/fee/admission templates save to
  `instituteSettings/workspace`. Both verified admins can read and save it.
- A transaction compares the expected whole settings document; stale saves are
  rejected. Revision, saving admin and update time are retained. Unsaved edits
  are not applied; navigating away asks before discarding them.
- New receipts and marks cards capture institute details/footer in their own
  `documentProfile`. Existing documents without that snapshot retain legacy
  identity. Defaults do not rewrite existing documents or amounts.
- Fee templates receive the actual oldest unpaid month/amount selected by the
  existing billing code. The payment number stays fixed at 6006433125 and the
  overdue label remains visible. There is no configurable fee amount here.
- Blank custom templates retain the existing wording. Custom templates must
  include required fields. Attendance excludes missing optional notice/totals.
- Document examples and student-message examples are labelled samples. Signature
  management opens the existing private Marks Cards signature tools.
- Backups use the existing authenticated private JSON export. Cloudinary transfer
  uses the existing original-backup/transfer workflow. Neither is a bulk restore.
- Password reset requires explicit confirmation and targets only the current
  verified admin's email using Firebase Authentication. Sign-out clears records.
- Clock format/reduced motion remain browser-only display preferences. Exports of
  settings drafts are not student backups. No visitor homepage, Razorpay charge,
  fee calculation, receipt-counter policy or public admission field is changed.

If shared Settings cannot be read, the register still loads with a visible
warning and original document defaults. Shared saves are disabled until refresh
succeeds. Other admins must refresh to pick up newly saved shared settings.

## Verification evidence and remaining gate

Passed in this workspace:
- 122 unit checks, including guarded Settings writes, schema/template validation,
  document snapshots, escaping and preservation of payment fields.
- Connected Settings browser flow: saved reload, concurrent rejection, reset-email
  callback with mocked Firebase, private backup, six panels at five widths, logout, and receipt/marks PNG metadata using the saved institute snapshot.
- Full generated candidate tests: offline add/photo, atomic payments, receipt
  corrections/exports, marks, sign-in/logout, missing optional assets.
- Attendance, navigation/clock, CSP/XSS and admin-access browser checks.
- Scroll coverage at four widths: fixed sidebar branding, independently scrolling
  tabs, sticky opaque header and Settings reachable at the bottom.
- Windows encoding build and release-command failure-gating tests.
- All 122 unit checks also pass in an isolated Windows CRLF checkout
  (`python tests/release-windows-line-endings.py`). Source comparisons normalize
  line endings only; payment hashes and rule-content checks remain enforced.

The actual Firestore rule emulator could not run here: Google's emulator download
returned a network/proxy 403 even after retrying with expanded execution access.
The rules have **not** been declared emulator-verified. The new rules test and
existing public-admission/gender/privilege and actual-SDK payment/receipt/signature tests must pass locally before deploy.
No real student data, uploads, reset emails, WhatsApp sends or charges were used
in the workspace tests.

## Windows CMD release

Keep a current private backup from Reports. You need Node (the existing Firebase
CLI-compatible version), Python and Java 21 or newer on PATH. Reopen CMD after
installing Java if needed. The Firebase CLI must be signed into your project.

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python release-admin.py --deploy
```

The helper runs unit/encoding checks; installs pinned test-only packages under
ignored `build/settings-test-tools`; runs Firestore tests against the loopback
emulator using **demo-rehaan-settings**; builds the separate full candidate; then
publishes `firestore:rules` and finally Hosting for **rehaan-computers**. It never
migrates/imports student records. A failed command stops subsequent steps.

For checks without publishing: `python release-admin.py`.
If Java, an emulator download, test, login or deployment fails, keep the output
and stop. Do not bypass the checks with a direct Hosting deploy. If rules publish
but Hosting fails, existing live functionality remains compatible with the
additive Settings rule; retry only after diagnosing the failure.

After deployment, reload the dashboard, review existing records/photos/balances,
and open Settings. Save a deliberate real Settings change only after reviewing
its document/message previews. Existing receipts should retain their details.

Firebase Hosting rollback restores website files, not the database, receipts,
Cloudinary images or password changes. Do not bulk-restore an old student JSON
over newer payments. The new shared Settings permission can remain when rolling
back Hosting; it grants no additional access to students or public visitors.
