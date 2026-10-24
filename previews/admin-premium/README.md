# Premium administration preview

From Windows CMD in the existing checkout:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python preview-admin.py
```

Python opens the exact preview in a browser using a free port. Keep CMD open.
There is no Firebase login or installation step. If the browser does not open,
copy the printed address. `--no-browser` only prints that address.

### Approved student photo on mark cards

Open **Mark Cards** and select a sample student. To test a portrait, first add a
fictional offline student with a local photo using the existing **Add student**
form. Enter and save marks, then use the main **Download HD image · PNG** button.
The selected student's saved photo appears at the top-right automatically on
screen, in print and in the downloaded image. No second upload/button is needed.

Choose **4K · 3840 pixels wide** (default) or **HD · 1600 pixels wide**. The photo
is fitted without stretching or cropping; detail depends on the original source.
The approved renderer is shared with the production release. Real private photos
are loaded only after administrator sign-in in that release; this local preview
continues to use fictional records and local photo adapters.

This is the current complete dashboard with a new sapphire/gold presentation,
matching the homepage, rather than a replacement with missing sections:

- Overview and its four working summary buttons; admissions and student register.
- All four original register tabs and course/batch/search filters.
- Offline enrolment, editing, photo crop/viewing, approvals and deletion controls.
- Fees, partial monthly payments, saved receipts and amount-correction history.
- Existing receipt images, printing and mark cards, with the paper designs kept.
- Course/batch directories, CSV/JSON exports and settings.
- New quick search (Ctrl+K), navigation search, and list/card register views.
- Records centre with name/guardian-phone/admission search, course/batch/status
  filters, sorting, pagination, filtered CSV and up to six saved session views.
- Review queues for incomplete core details, possible shared-contact/admission
  matches, and optional photos without deleting, merging or changing records.
- Student profiles with personal details, photos, fees/receipts, marks and the
  available saved activity; full private JSON export preserves unknown fields.
- Today workspace with new applications, overdue/reminder counts, recent saved
  activity and direct links to the original enrolment, record and fee controls.
- Accounts book with Today/month/custom ranges, admission/tuition and method
  filters, current corrected receipt totals, CSV export and mobile entry cards.
- Richer monthly payment form with required method, received date, optional
  reference/note, balance review and saved receipt/image actions.
- Fee follow-up shortcuts read the existing billing functions and open the
  original overdue/reminder/partial-payment views. No new billing engine.
- Restyled sign-in; use Sign out to view it, then any demo email/password to return.

The launcher renders the current public/admin.html and runs its original app,
record-validation and transaction modules. The launcher appends a preview-only
bridge that reads loaded records and opens those existing controls; it never
modifies the public source files. A preview-only import map replaces
Firebase and the photo service with local memory adapters. A content security
policy blocks external service connections. External messages/sharing are blocked;
print/download actions operate on fictional data. No real password is required.

Open **Records centre** in the sidebar to try the new tools. Sample shared-family
phone numbers and an incomplete course demonstrate the review queues. Saved views
are held in page memory and are cleared on sign-out or reload. Available activity
is derived from saved dates, marks and receipts; older edits without stored history
cannot be reconstructed. Optional photo suggestions never block fees/admissions.

The eight sample students are fictional. No current live student is loaded or
copied into this preview. Added students, cropped photos, fees and marks exist
only in page memory; Reset demo/reload removes them. Cloudinary migration is
disabled in this preview, and original paid admission/payment behavior is retained
by the app but affects samples only. This does not test a real payment or upload.

All preview files are outside public/, so Firebase Hosting does not deploy them.
The live admin dashboard and production photo/payment modules are unchanged.
Preview the UI before integrating an approved design with the real services.

Validation: `python3 tests/admin-premium-preview-browser.py` covers all nine
sections at five widths, local offline enrolment with a crop, fee/receipt correction
history, receipt PNG/PDF, saved mark cards, sign-in/logout/reset and zero external
requests or network writes. Production login navigation has a separate regression
in tests/admin-navigation-browser.py.

Additional validation:

- `node --test tests/admin-records-centre.test.mjs`: read-only review rules,
  legacy fields, shared contacts, impossible dates, sorting and receipt activity.
- `python3 tests/admin-records-centre-browser.py`: original data preservation,
  duplicate comparison, saved views/CSV/private exports, existing fee and marks
  forms, corrections/history, full backup, five widths and 108 sample records.

No production admin UI, Firestore rules, Worker or payment source is changed in
this preview update. Hosting deployment remains deferred until the UI is agreed.

## Today / accounts / payment update

Open **Today** or **Accounts book** from the sidebar. For payments, open the
existing fee register, choose a student, and select Cash, UPI, Bank transfer or
Manually recorded. The received date defaults to the India calendar date; future
dates are rejected. The optional reference and note are combined into the existing
printed receipt note. Method/date/note are staged in the same original transaction
as the fee increment and receipt, with the existing stale-record and stable-ID
retry checks retained. There is no separate metadata write or bank charge.

Accounts totals use saved paid admission entries and valid dated tuition receipts.
Admission date fallbacks are labelled. Current corrected receipt values are counted
once; this is not an immutable historical bank-reconciliation report. Unknown
methods remain Unspecified. Older monthly ledger amounts without dated receipts
stay visible separately and are not invented into dated totals. Nothing is merged,
deleted or automatically marked paid.

The daily-work tools are complemented by the remaining UI features described below.
A backend-enforced general audit log remains a production integration requirement.

Validation:

- `node --test tests/admin-operations.test.mjs`: atomic method/date/reference save,
  denied/stale writes, stable-ID retries, simultaneous administrators, corrections,
  legacy/invalid/duplicate receipt handling and India date boundaries.
- `python3 tests/admin-operations-browser.py`: Today/accounts navigation, actual
  form/receipt/PNG/PDF/CSV values, correction totals, denied saves, lost acknowledgement
  recovery, stale updates, five widths, invalid date ranges and logout cleanup.
- Both existing premium-preview and records-centre browser regressions also run
  with the new mandatory method selection. Public payment fingerprints still pass.

These are isolated sample-data checks. No deployment, live bank verification, real
charge, email, message or production student write is performed.

## Remaining feature preview

- **Student journeys:** Active, On hold, Completed and Archived views, reversible
  stage changes with reasons and saved lifecycle events. These are organisation
  stages: they do not change admission approval, waive balances or stop billing.
- **Learning checklist:** presets from the assigned course syllabus, extra practical
  topics, assessed-topic percentages and saved checklists kept separately for each
  course. Marks and payments are unchanged; completion is never automatic.
- **My workspace:** separate start page, density, motion, list/card layout and up to
  four shortcuts for each administrator. Only validated presentation settings are
  stored in this browser. Student records, passwords and search queries are not.
  With browser storage blocked, preferences fall back to the page session.
- **Direct Ctrl+K student actions:** open the exact student's profile, fees, marks
  and personal receipt section. Fee actions use an exact record ID, avoiding partial
  admission-number matches with another student's phone.
- **Change history demo:** the local transaction adapter appends successful changes
  with before/after values, actor and time, including original edits/payments/deletes.
  Failed saves and idempotent payment retries create no additional history. Filter
  by student or administrator and export the clearly labelled preview log.

Use My workspace's **Switch demo administrator** control to try the two independent
sets of preferences against the same sample students. This does not create a real
Firebase administrator. Learning/lifecycle writes compare the relevant saved fields
and enrolment/course after reading the transaction snapshot. Newer payment fields
are never replaced by these writes. Saved progress for other courses is retained.

### Production audit requirement

The demo journal is in browser memory, resets on reload, and is not tamper-proof.
It must not be deployed as a trusted audit trail. Before live integration, implement
server-controlled logging of application create/update/delete events with reliable
authenticated actor identity, restricted admin reads and no client update/delete
permission for log documents. Review retention and export requirements, and test
logging failure/retry behavior. Older edits without stored history cannot be rebuilt.
No audit collection, Firestore rules, cloud trigger, billing plan or live backend was
changed by this preview work. Lifecycle/learning fields in the demo are included
in the existing private student JSON backup; the separate demo journal has its own
explicit export button.

Validation: `node --test tests/admin-journey.test.mjs` and
`python3 tests/admin-workbench-browser.py` cover preservation of financial/legacy
fields, archive/restore, per-course progress, stale/denied saves, both demo admins,
nonprivate preference storage/fallback, exact student quick actions, five widths,
history attribution/export, and logout cleanup. Existing dashboard, accounts,
records-centre and payment regression suites remain applicable.

## Separate release candidate and audit backend

The full reviewed UI can now be assembled with `python prepare-admin-release.py`.
It creates an ignored, separate Hosting candidate without altering the published
admin source. No demo SDK, automatic sign-in or browser journal is included.
The server-controlled audit implementation and candidate rules are prepared in
`backend/audit/`; actual deployment and principal identity still require the
checks in its README. Secure history remains disabled in the generated UI until
those backend checks pass. See [release details](../../docs/admin-upgrade-release-candidate.md).

## Monthly fee statements

Open **Fees & payments → Fee statement** on any sample student, or use the new
button in the profile's **Fees & receipts** tab. The navy/gold and cream statement
shows learning months, due dates, received/balance/status, the oldest unpaid month,
total due and upcoming fees separately. Try screen filters, full PNG, print and
CSV. WhatsApp remains blocked in this disconnected demo. All statement actions
are read-only; local payment examples can still be recorded using the original
payment form. See [calculation and release details](../../docs/student-fee-statements.md).
