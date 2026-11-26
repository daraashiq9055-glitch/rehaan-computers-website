# Student Portal preview status

The existing Home, Account, Updates and Journey tabs remain in place. This
branch has **not been deployed**. The demo account is separate from Firebase
student accounts. Live student screens never use demo fee, attendance, score or
rank values.

## Connected candidate

| Area | Preview implementation | Remaining release gate |
| --- | --- | --- |
| Login | Admin creates, disables and restores a Firebase Email/Password account; student reads only their enabled UID view. | Test two real disposable students and one admin in the actual Firebase project. |
| Profile, fee, receipts, attendance | Sanitized admin projection, validated fee statement and scoped Firestore read. | Compare against live admin edits, receipt deletion and both student screens. |
| Updates and images | Admin can publish private per-student class notes, homework, announcements, exams, results and holidays; a resized JPG is stored in the private update document. Student can filter, open, mark read and save; bell shows unread items. | Real Firebase publication and image tests, including mobile and offline cases. |
| Messages | Student sends to their own thread; admin replies in Student Details; read state and bell are stored. The admin register shows unread student threads and links to each conversation. | Test both real sessions, notifications and denial of cross-student access. Firestore messages have size/identity validation; per-student sending quotas are not implemented. |
| Journey selection | Student chooses a listed learning program; Admin Student Details shows it live. Teacher-assessed checklist stays separate. | Verify both student choices against the admin view and course policy. |
| Scored quiz | Separate Cloudflare Worker/D1 candidate holds keys, ten-question attempts, final score, seven-day rotation, points, streak and reviewed weekly/overall ranks. Student and admin client controls are prepared. | Worker and D1 are **not provisioned or deployed**; the service config remains disabled. Populate a reviewed question bank and test real Auth/D1 end to end. |

## Security rules in this candidate

The existing `applications` collection remains admin-only. Under
`studentPortalViews/{uid}`, a student can read only their own enabled view,
updates, messages and learning choice. They can mark their own updates
read/saved, send a bounded message, mark an admin reply read and select a
listed program. They cannot edit fees, attendance, notes, results, admin
replies, another student's data or question keys. Admins publish and reply.
The Firestore emulator checks two distinct students, admin access, disabled
access, cross-account denial and denied field edits.

## Verification and release

Automated tests cover the projection, Firestore rules, one admin and two
students in Firebase emulators, student UI fixtures and official quiz UI at
320/360/390 px, the trusted quiz core and Worker with an in-memory D1
adapter, the admin browser regression suite, and the candidate build. These
tests do not prove the production Firebase Auth provider, real D1 binding,
Worker endpoint or live account synchronization. The full checklist is in
`backend/student-portal/README.md`. Keep `quizServiceConfig.enabled=false` and
do not deploy Hosting or rules until the real-account checks pass and the user
chooses the release.

The standard `python release-admin.py` checker now also requires the student
Firestore rules and two-account Auth emulator integration to pass. Its default
mode builds a separate candidate without deploying. Node, Java 21 and the
Firebase emulator dependencies are required. Browser checks remain separate:
`python tests/student-live-browser.py`, `python tests/student-quiz-browser.py`
and `python tests/admin-candidate-browser.py`.

The owner currently has one student test account and one shared admin account.
A second disposable student account is still needed for the live isolation
check. Do not substitute the demo login or emulator accounts for that check.
