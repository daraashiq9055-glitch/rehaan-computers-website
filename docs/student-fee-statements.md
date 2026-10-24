# Premium monthly student statements

Candidate version: `20261024-admin-8`. This is a read-only addition to the existing
dashboard, not a new ledger or payment engine. Nothing is deployed by the build.

## Review first

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python preview-admin.py
```

Open **Fees & payments → Fee statement** on a sample student's row. It is also
available under **Records centre → student profile → Fees & receipts → Monthly
fee statement**. The preview loads fictional local students; no private backup
upload, real login, student record or payment is required. Recording a payment
in this preview changes local samples only. WhatsApp is deliberately blocked by
the existing preview's outbound-message guard.

The statement has navy/gold controls and a cream paper layout. It shows:

- Learning month, original due date, recorded payment, remaining balance/status.
- Oldest unpaid due period highlighted, plus full monthly history.
- Total currently due, recorded monthly payments (including advances), and
  upcoming fees separately. Future bills are not counted as currently due.
- Screen filters for all/unpaid/paid/upcoming; exports always include all months.
- Full 2000px-wide PNG, multi-page A4 print, CSV and a saved-number WhatsApp draft.
- Older ledger payments without dated receipts labelled explicitly. Receipt
  references and current corrected receipt amounts are not counted twice.
- Overpayments shown separately; no silent credit transfer to another month.

Download the PNG, open WhatsApp, attach it and press Send manually. A chat URL
cannot attach a local file automatically. No record is modified by statements.
The document is labelled a statement, not a receipt or bank-payment verification.

## Calculation boundaries

The first tuition due is one month after admission. Anniversary dates clamp for
short months using the original admission day, as in the current fee register.
Learning month is the preceding calendar month: October fees can be due on
10 November. The fixed existing tuition is 999 rupees; admission is separate.

Statement generation uses the current loaded ledger, not a reconstruction of
historical balances at arbitrary past dates. Refresh the student register to load
newer payments. If loaded records change while a statement is open, export is
blocked until Refresh statement is used. No recurring bill, receipt, ledger date
or student field is added, migrated or rewritten. Lifecycle stages do not waive
fees or introduce a new billing-stop policy.

Undated admissions, inactive/cancelled records, unmatched/invalid ledger values,
invalid/inconsistent receipts, unsafe totals or more than 240 billing periods
show review notes and disable sharing/exports. Original unmatched entries remain
visible; nothing is guessed, reassigned or deleted. No payment dates are invented
for old monthly totals. Very long images beyond browser limits direct the user
to full printing instead of truncating months. Long WhatsApp drafts summarise the
first twelve unpaid months and refer to the full image for the rest.

## Integration and verification

Public modules are loaded only when a signed-in admin opens a statement. The
existing fee/mark/receipt controls and public admission/payment code remain in
place. Sign-out clears the dialog and its print copy, and cancels delayed exports.
No new collection, database rules, backend, billing-plan or Cloudinary change is
needed. The clean-home preview is not integrated; the current homepage stays.

Checks:

- `node --test tests/admin-fee-statement.test.mjs tests/admin-features.test.mjs tests/admin-fee-reminders.test.mjs tests/visitor-release.test.mjs`
- `python3 tests/admin-fee-statement-browser.py`
- `python3 tests/admin-candidate-browser.py`
- `python3 tests/admin-release-browser.py`
- `python3 tests/admin-build-encoding.py`

The browser checks use the generated real-service release with intercepted SDK
calls. They cover no-write exports, precise due/upcoming sums, receipt/legacy
handling, full PNG/PDF/CSV, saved-mobile draft, profile entry, mobile/tablet/desktop,
49-month image bounds, stale-record protection and sign-out during image loading.
No real student, fee, message, image upload or charge is created by these tests.

After preview approval, the normal release commands remain:

```bat
python prepare-admin-release.py
cd build\admin-release
type RELEASE.json
```

Confirm version `20261024-admin-8` and `auditEnabled: false`. Hosting deployment
is a separate final action using the existing project. The earlier code remains
in Git at `b1ee81d`; student data is not backed up by a Git commit.
