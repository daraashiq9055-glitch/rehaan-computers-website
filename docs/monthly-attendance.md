# Monthly attendance and notices

Preview first; no live deployment has been performed for this addition.

Open `python preview-attendance.py`; **Attendance** opens automatically.
The preview uses fictional students and in-memory writes only. Choose a past
month, select a student, enter days attended from the paper register, and save.
Reopening the same student/month loads the saved values for editing.

Class days held is optional and refers to the days actually held for that student,
not the calendar month's planned days. A suggestion uses the entered totals:
90% or above encourages continued attendance; 75–89% asks for regular attendance;
50–74% notes several missed classes; below 50% asks the student to contact the
institute. Without class days held, wording is neutral. Suggestions are inserted
only when the admin clicks Suggest notice; the admin can edit or replace them.

WhatsApp summary previews show saved monthly attendance and the saved notice.
Unsaved changes must be saved first. The student's current saved mobile number is
used. Opening WhatsApp never automatically sends a message or reads its replies.
No daily present/absent record is inferred; unentered months are Not recorded.

Class follow-up is available in Attendance and Student Details. It uses the agreed
four-choice message and 24-hour reply request. The clock starts when the admin
sends the message, not when the panel opens. There is no automatic cancellation,
fee change, deletion, delivery tracking or scheduled messaging.

Monthly data is stored under `applications/{id}.monthlyAttendance.{YYYY-MM}`.
A transaction rechecks the admin session and expected saved month before updating
that field only. Concurrent changes require refresh/review. Existing admin-only
Firestore updates apply; public application fields do not allow attendance.
No new rules or backend deployment is needed for this feature.

Checked: 116 unit tests, isolated attendance browser save/edit/suggestion/share,
mobile/logout checks, and full generated admin candidate regression including
student creation, monthly payments, corrections and exports. No live records,
messages or payments were used in these tests.

## Approved ivory/navy preview

The working preview now uses the approved ivory panels, navy text and champagne
accents. It includes batch/search filters, Not recorded and Needs follow-up
(below 75% of entered class days), progress rings, and editable notice presets.
Missing class-day totals never produce a percentage or a follow-up flag.
WhatsApp summaries include classes held and percentage only when totals exist.
The dedicated launcher seeds fictional attendance for the previous month only;
those fixtures are never injected into a production release.

The redesigned preview passed attendance browser checks for saves, both status
filters, WhatsApp totals/percentage, mobile overflow and logout; the three focused
attendance unit tests and release generation also passed. No live calls were used.

## Release verification — 2026-11-01

Approved release candidate: `20261101-attendance-1`. Rebuilt successfully with
117 standalone unit tests, the legacy fee helper check, the attendance browser,
security/CSP browser, full generated admin candidate browser and Windows encoding
check passing. The legacy fee test was corrected to expect the approved bold ₹
amount rather than obsolete Rs. text; production payment logic was not changed.
The separate Firestore emulator suite was not run in this environment (its local
emulator/dependencies are not installed). No rules are changed for this release.
Firebase CLI reports no authorized account in this workspace, so Hosting must be
published from the owner's already authenticated Windows terminal. No deployment
has been performed by these checks.

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python prepare-admin-release.py
cd build\admin-release
npx --yes firebase-tools@15.34.0 deploy --only hosting --project rehaan-computers
```

Stop if the pull or build reports an error. This releases the full generated
website including Attendance; it does not replace student records or payments.
