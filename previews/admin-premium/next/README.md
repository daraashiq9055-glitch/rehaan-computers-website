# Admin improvements — isolated preview

From the repository root: `python preview-admin-next.py`. A localhost preview
opens automatically. Keep CMD open; Ctrl+C stops it. This launcher is separate
from `preview-admin.py`, the clay colour study and the release builder.

## Review

- Compact navy/gold header: wider central search, time/date on the right, no
  email display. Search opens the existing finder; rotating hints and a helpful
  strip respect reduced-motion preferences and pause in background tabs.
- Fee Statements starts with a monthly review. Choose a learning month and
  Paid/Partial/Unpaid/Upcoming, or view payments *received* in a selected month.
  Full statement and saved receipt buttons use existing read-only entry points.
  Search by student, admission or receipt number.
- All due reminder: unpaid matured periods, oldest first, partial balances and
  a total in rupees. Ayaan has three unpaid months; Zoya has one partly paid
  month; Sara has all three paid, including a receipt paid in a later month.
  Upcoming periods are excluded. Invalid/cancelled/new not-yet-due records cannot
  produce a shareable reminder. Images are 1600px wide and grow to fit all rows.
- Download PNG and inspect the WhatsApp text. Preview never contacts a student.
  In a future live integration WhatsApp text can open the saved-number chat;
  the image still needs attaching manually. No automatic sends or marking paid.
- Attendance explains the selected month's day limit and offers Current/Previous
  month shortcuts. On November 2, November permits 0–2 attended days; October
  permits 0–31. Only classes already held count, not future planned classes.
  Validation/session/transaction rules remain unchanged; clearer messages are
  served only by this preview launcher. Notice/save/share work with demo records.

## Safety and release boundary

No production files, deployment settings, payment processing or Firestore rules
are edited. The launcher uses the existing mock Firebase/photo/message adapters
and additional fictional fixtures. No live JSON backup is loaded. Demo changes
reset on reload. Reminder opening/exporting does not write reminder status.
New reminder copy is a design proposal; custom shared message template integration
and production rollout are not part of this preview. Do not deploy to install it.

`python tests/admin-next-preview-browser.py` checks three widths, search, dated
receipt links, all/partial/single-month reminders, future/invalid/cancelled guards,
PNG export, attendance month guidance/save/notice and preservation of payment
fields. All external requests are blocked during the test.
