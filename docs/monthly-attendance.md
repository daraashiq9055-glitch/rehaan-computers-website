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
