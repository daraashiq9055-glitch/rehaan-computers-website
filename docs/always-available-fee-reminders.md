# Always-available monthly fee reminders

Release `20261024-admin-6` follows the updated request: there is no date window
or inactive gap. An enrolled, non-cancelled student with an unpaid billing period
can be reminded on any day. The proposed 25th–15th rule is not included.

The reminder chooses the oldest unpaid period first, including partially paid
months and months already marked as reminded. A previous reminder never skips
an unpaid month. After that month's remaining balance is actually recorded as
paid using the existing payment form, the next unpaid period becomes eligible.
When there is no earlier debt, the existing upcoming tuition period is used;
there is no five-day limit. Fully paid periods are not requested.

Overdue drafts identify the fee month, original due date and exact remaining
balance, and ask for that period to be cleared first. Upcoming drafts retain
normal due-date wording. The saved student mobile and original payment contact
remain unchanged. A previously reminded period shows **Remind again**.
WhatsApp still opens a draft for the administrator to send manually. Only
explicit confirmation records the latest reminder timestamp for that period.
This timestamp is not proof of WhatsApp delivery. Dismissing confirmation saves
nothing. Reminder activity never marks a fee paid or changes a receipt.

The existing billing dates, 999-rupee monthly tuition, admission fee, partial
payments, old ledgers, provider metadata and receipt/correction transactions are
unchanged. The click rechecks administrator identity and the latest loaded
oldest unpaid balance before preparing its message. No database migration,
rule change, photo transfer, billing-plan change or messaging backend is needed.

## Windows release

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python prepare-admin-release.py
cd build\admin-release
type RELEASE.json
```

Confirm `20261024-admin-6` and `auditEnabled: false`, then publish Hosting:

```bat
npx --yes firebase-tools@15.34.0 deploy --only hosting --project rehaan-computers
```

This release retains the current homepage. The separate clean-home preview is
not integrated. Keep the previous Firebase Hosting release available for rollback.
For local UI review, run `python preview-admin.py` before building; sample data
is used, and WhatsApp opening is blocked by that preview's isolation policy.

## Checks

- `node --test tests/admin-fee-reminders.test.mjs tests/admin-features.test.mjs tests/visitor-release.test.mjs`
- `python3 tests/admin-fee-reminders-browser.py`
- `python3 tests/admin-candidate-browser.py`
- `python3 tests/admin-release-browser.py`
- `python3 tests/admin-build-encoding.py`

The targeted browser test uses the generated real-service bundle with intercepted
Firebase and a stubbed WhatsApp window. It checks reminders across all boundary
dates, Today/student/fee views, sent/paid states, exact month/balance in drafts,
metadata-only reminder saves and actual payment advancement to the next month.
No live student, payment, message or external write is created by these tests.
