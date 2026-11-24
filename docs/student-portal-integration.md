# Student portal integration status

The existing four-tab page in `public/student.html` has a working demo path and
a separate, **preview-only** Firebase student login path. The live path reads
only `studentPortalViews/{authenticatedUid}`. The demo values never appear in
the live account tabs. This branch has not been deployed.

## Connected in this candidate

| Area | Source | Status |
| --- | --- | --- |
| Login | Firebase Email/Password; admin-created username | Admin can create, disable, restore and refresh a linked account in Student Details. A separate Auth instance keeps the admin signed in during provisioning. Production Auth provider and real credentials still need verification. |
| Profile and admission | Sanitized projection of `applications/{id}` | Student sees name, admission number, DOB, guardian, phone, course, batch and joining date. Admin-only notes, photo refs, tokens and Aadhaar fragments are excluded. |
| Fees and receipts | Existing monthly ledger and validated fee statement | Student sees recorded periods and non-deleted receipts. Pending amount appears only if `feeStatement()` marks the ledger reliable. Concessions are separate from cash. |
| Attendance | `monthlyAttendance` | Published through the linked view; attendance saves also refresh the view. |
| Journey | Existing admin learning checklist | Teacher-assessed topics and completion percentage appear. Student-selected software is still demo-only. |
| Updates | No student-facing source yet | Live tab has filter chips and an honest empty state; demo tab keeps labelled sample updates. |
| Quiz, points, rank | No trusted scoring service yet | Live account says the scored quiz is not published. The demo quiz remains a browser-local preview only. |

## Firestore rules added in this candidate

`studentPortalViews/{uid}` is a separate sanitized collection. A verified admin
can get/list/write a view that has only the approved top-level keys. A signed-in
student can **get only their own enabled UID document**. Students cannot list
views or write them. `applications` stays admin-only. The emulator test covers
two students, disabled access, cross-account reads and denied student writes.

## Still required before production release

1. Verify Email/Password is enabled and test provisioning with two real test
   accounts against the production Auth configuration, without using real
   student records.
2. Add admin-authored updates, notes, uploaded images, group links and teacher
   messaging with suitable private storage and rules.
3. Add a trusted quiz service for question publication, once-per-day attempts,
   seven-day question rotation, scoring, badges and approved leaderboard rank.
   Browser storage cannot enforce these rules.
4. Connect selected learning software to an admin-reviewed source of truth and
   show it in the live Journey and quiz.
5. Verify admin edits, fees, receipt deletion, attendance and journey changes
   against two real student sessions, plus offline logout and recovery.
6. Deploy the new Firestore rules together with the candidate only after the
   production checks and the user's final release decision.

## Checks run

- `node --test tests/student-view-model.test.mjs`
- `tests/student-portal-rules.cjs` under the Firestore emulator
- `python tests/student-live-browser.py` at 320, 360 and 390px with two
  distinct stubbed Auth views (UI isolation only)
- `python prepare-admin-release.py`
- `python tests/admin-candidate-browser.py`

The browser Auth stub is **not** a real Firebase login test. Do not call the
Student Portal complete or deploy it as a finished private account system yet.
