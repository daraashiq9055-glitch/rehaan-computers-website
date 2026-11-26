# Student Portal preview — 26 November 2026

No website, Firebase rules, Cloudflare resource or backend was deployed in this
revision. The quiz service remains disabled. The existing four signed-in tabs
are Home, Account, Updates and Journey.

## Learning sync

The student's existing `studentPortalViews/{uid}/learning/current` document is
still the source of their selected program. The signed-in admin subscribes to
that selection and transactionally updates a separate `applications/{id}`
`portalLearning` projection. The listener reads the latest selection inside
the transaction, checks the linked UID, and never changes `learningProgress`,
lifecycle, marks, fees or another student. When admin is closed, the selection
still persists; the admin projection catches up on the next admin session.

The approved order comes from `student-quiz.js`. Selecting MS Word marks
Computer basics, Notepad and WordPad as inferred learned, MS Word as currently
learning, and later programs as upcoming (25% of the twelve-stage path).
This is **not teacher assessment or a certificate**. The original teacher
checklist stays editable and separate. Admin can correct the program from
Student Journeys → Learning checklist. That correction writes the same
selection document and is reflected in the student's portal.

## Screens and actions

- Dedicated Admin Student Portal navigation: search approved students, linked
  access status, username, current program, validated fee balance, attendance,
  unread messages and last data refresh. Existing guarded details, access,
  private publishing and reply tools are reachable from the cards.
- Student landing: login above leaderboard and public notices; mobile order
  is Login → Leaderboard → Updates. Gold/silver/bronze podium styling has no
  invented scores. Official standings are loaded only when the service is
  enabled. Public notices require explicit publication in
  `public/student-centre-updates.json`; private updates are never made public.
- Required onboarding: acknowledge following centre updates inside the portal,
  then save a current program if none exists. Follow acknowledgement is scoped
  to the UID **on this browser**, not a server-verified push subscription.
  Browser notifications use the existing separate Follow page and browser
  permission. The preview does not pretend that push subscription succeeded.
- Account includes the sanitized profile, fees, receipts and attendance.
  Journey includes the ordered path and the separate teacher assessment.

## Deliberately incomplete

Password reissue is not enabled: the existing client cannot securely reset
another Firebase user's password while preserving their UID and private
history. The Reissue login action explains that a trusted recovery service is
needed. It does not create replacement credentials or delete history.
Official quizzes remain disabled pending backend verification. No real test
student was accessed from this workspace: the owner must run the real-account
check below in their authenticated browser. Emulator and fixture checks are
not represented as real Firebase checks.

## Verification

- Node suite: 173 tests passed, 0 failed, 0 skipped.
- Firebase Auth/Firestore emulators: admin and two students; program selection,
  admin projection, persistence on server reads, admin correction, unchanged
  teacher assessment and isolation passed. Existing rules were used unchanged.
- Student browser fixtures: 320, 360, 390 and 1366 px; public layout order,
  absence of sample standings, private updates/images/messages, four tabs and
  account switching passed.
- Onboarding fixtures: required follow → program selection → dashboard,
  MS Word path and refresh persistence passed at all four widths.
- Quiz UI fixtures: ten questions/four choices, final result and responsive
  fit passed at all four widths. Official live service stays disabled.
- Admin candidate browser: all 17 views at 320, 360, 390, 768, 1024 and 1512 px,
  portal search and disabled quiz state, existing records/payment/receipt/marks
  flows and logout checks passed. Fixture records are unlinked; linked live
  accounts still require the owner's check.
- Release checker and separate candidate build passed. No deploy flag used.

## Owner's real-account check

1. Build this commit with `python prepare-admin-release.py` and serve
   `build/admin-release/public` locally on port 8000.
2. Open `http://127.0.0.1:8000/admin.html` and sign in. Keep admin open.
3. Open `http://127.0.0.1:8000/student.html` in a private window and sign in
   with the existing test student. Complete the in-portal follow step.
4. In Journey, select MS Word and save. Admin Student Portal should show
   MS Word; Student Journeys should show 25% learning-path progress and
   Currently learning MS Word. The teacher-assessed percentage is independent.
5. Refresh both pages and confirm it persists. Correct the program in Admin
   Student Journeys → Learning checklist; confirm the student sees it.
6. Confirm the second student and existing teacher checklist have not changed.

## Changed files

Implementation:
- `prepare-admin-release.py`
- `previews/admin-premium/bridge-exports.js`
- `previews/admin-premium/portal-workspace.js`
- `previews/admin-premium/workbench.js`
- `previews/admin-premium/workbench.css`
- `public/admin-app.js`
- `public/student-admin-portal.js`
- `public/student-learning-path.js`
- `public/student-centre-updates.json`
- `public/student-experience.js`
- `public/student-portal.css`
- `public/student-view-model.js`
- `public/student.html`

Tests:
- `tests/admin-candidate-browser.py`
- `tests/student-auth-integration.cjs`
- `tests/student-learning-path.test.mjs`
- `tests/student-live-browser.py`
- `tests/student-onboarding-browser.py`
- `tests/student-quiz-browser.py`

This report: `docs/student-portal-preview-20261126.md`.
