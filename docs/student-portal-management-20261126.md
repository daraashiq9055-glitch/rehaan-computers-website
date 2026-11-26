# RC Learn management preview — 26 November 2026

This replaces the previous `7b9eff3` preview design. No website, Firebase rules,
Cloudflare service or backend was deployed. The legacy hard-coded demo sign-in shortcut was removed; student login uses
Firebase authentication. No live student record was accessed
from this workspace. Official quiz service configuration remains disabled.

## Management workspace

Seven compact overview metrics: linked, active, disabled, unread messages,
fee-due students, attendance attention (below 75% of recorded class days), and
pending quiz status. Missing attendance is not counted as absence.

Thirteen direct quick actions: create/manage login, publish update, notice,
homework, class notes/image, exam, result, attendance, fees/receipts, Journey,
Quiz Management and messages. Per-student actions open profile, access,
private publishing, fees/receipts, attendance, Journey, messages and access
control. These use dedicated management dialogs. Student Details is not used
as the action router. Payment/receipt dialogs reuse the original guarded
payment and receipt workflows without navigating away from this workspace.

Create Login selects an approved student with an admission number, accepts a
username and temporary password, provisions a separate Firebase Auth user,
and links that UID. Passwords are not written to Firestore or retained in the
list. Entry is cleared after an attempt and on dialog close. The admin's own
Auth session is retained. An uncertain rollback is reported for review.

Private publishing uses existing UID-scoped update rules and bounded images.
Messages use the existing immutable thread protocol. Attendance uses the
existing revision-checked monthly attendance transaction. No rules changed.

## One official Journey checklist

`applications/{id}.learningProgress.byCourse[encodedCourse].topics` is the
only editable official checklist. There is no second checklist or percentage
tracker. Progress percentages are computed from those topics in both admin
and student screens. The student private view is the existing sanitized
read-only projection, not another independently editable progress record.

The student's existing `learning/current` document is a selection request.
The signed-in admin listener reads the latest request inside a transaction,
checks the linked UID, and merges software entries into the existing course
checklist. Earlier unassessed software becomes completed, selected software
is marked Currently learning, and later software stays upcoming. Existing
matching topics are reused. Existing custom topics, other courses and saved
teacher values remain; teacher corrections take precedence over inference.
Teacher overrides are recorded on their existing topic, so later student
selections do not reset them. Course metadata records the current program and
last applied selection version; no parallel progress percentage is stored.
The old preview-only `portalLearning` field is removed during this merge.

Admin changes to the official checklist refresh its private student projection.
Software corrections from the management dialog use the same selection and
merge flow. The student Journey tab renders only the official checklist, plus
the software-selection control and private class content.

**Permission boundary:** applications remain admin-only. Therefore selections
persist immediately, but checklist application requires a signed-in admin
preview session. If admin is closed, the student sees that sync is pending;
it catches up on the next admin session. Always-on background application
would need a trusted backend change, excluded by this task.

## Quiz workshop

Question-bank drafts have software, level, question, four distinct options and
one correct answer. Admin can add/edit, approve/reopen draft review, filter,
export/import JSON and inspect a seven-day 10-question schedule preview.
Editing an approved draft resets review. Results/leaderboard show an empty
state, not invented scores. Activation remains disabled.

Drafts are held only for this admin page session and cleared on sign-out.
Export before refresh. They are not an official published question bank.
Password reissue remains unavailable until trusted account recovery is ready;
existing accounts are never replaced or their private history discarded.

## Mobile repair and precise layout results

The student bottom navigation is now a direct child of `body`, outside all
scrolling/animated content. One final viewport-fixed style applies at every
width. It has four equal columns, icons and labels, safe-area padding and
reserved content space. The bar stays hidden during public login/onboarding.
There is no sticky fallback that can lift it while the page scrolls.

Verified at 320, 360, 390, 768, 1024 and 1366 px:

- All four signed-in tabs were checked at scroll top, middle and bottom:
  24 tab/width combinations, 72 scroll positions.
- Navigation bottom matched viewport bottom within 1 px at every position.
- Last content was above the navigation at maximum scroll.
- No horizontal overflow, clipped navigation labels or browser page errors.
- Public layout stayed Login above left leaderboard/right updates on desktop;
  Login → Leaderboard → Updates on phones. No sample standings were shown.

Screenshots generated under `build/` (fixture accounts only):
`student-fixed-{home,account,updates,journey}-{390,1366}.png`,
`management-admin-{390,1366}.png`. These are local test artifacts, not live
student data or deployed assets.

## Tests

- Node suite: 173 passed, 0 failed, 0 skipped.
- Existing release checker: passed, including existing fee/payment/receipt,
  shared settings, signature, counter and student Firestore rules tests.
- Auth/Firestore emulator integration: student selection updates the single
  official checklist and its private projection; saved assessment and another
  student's record remain; teacher correction persists through later selection.
- Direct management service emulator test: homework publishing, admin reply,
  monthly attendance and linked account provisioning passed; no password stored.
  The provisioning test uses a Firebase Auth emulator adapter, never production.
- Direct UI action fixtures: all six widths, searchable approved student
  selection, credential entry/clearing, disable/restore, private categories,
  attendance, reply, checklist correction, payment action and quiz draft
  add/edit/review/schedule/empty-results passed without opening Student Details.
- Admin regression browser: all 17 views at 320/360/390/768/1024/1512 px;
  existing payment, receipt, marks, student and logout workflows passed.
- Student browser and onboarding fixtures passed; quiz UI fixture regression
  passed with a test-only service. Production quiz service stays disabled.
- Production candidate build and syntax/diff checks passed.

These local/emulator/fixture results do not claim a new live-account test.

## Real-account preview check

1. Build this commit and serve `build/admin-release/public` on port 8000.
2. Open `http://127.0.0.1:8000/admin.html`, sign in and open Student Portal.
3. Keep admin open. In a private window open
   `http://127.0.0.1:8000/student.html` using your existing test student.
4. Select MS Word. Check Student Journeys → Learning checklist and the student's
   Journey: same topics/completion percentage and current software. Existing
   teacher overrides must remain. Refresh both screens to confirm persistence.
5. Correct one existing checklist entry as admin; confirm the student's matching
   entry changes. Test direct private homework, reply and attendance actions.
6. Scroll each student tab to the bottom on your phone. Confirm content clears
   the fixed navigation and the second student's private data stays separate.

No deployment command is included.

## Changed files

- `docs/student-portal-integration.md`
- `docs/student-portal-management-20261126.md`
- `prepare-admin-release.py`
- `previews/admin-premium/bridge-exports.js`
- `previews/admin-premium/journey-service.js`
- `previews/admin-premium/portal-quiz-workshop.js`
- `previews/admin-premium/portal-workspace.js`
- `previews/admin-premium/workbench.css`
- `previews/admin-premium/workbench.js`
- `public/admin-app.js`
- `public/student-admin-portal.js`
- `public/student-experience.js`
- `public/student-learning-path.js`
- `public/student-portal-admin-service.js`
- `public/student-portal.css`
- `public/student-view-model.js`
- `public/student.html`
- `tests/portal-management-browser.py`
- `tests/student-auth-integration.cjs`
- `tests/student-fixed-navigation-browser.py`
- `tests/student-learning-path.test.mjs`
- `tests/student-live-browser.py`
- `tests/student-onboarding-browser.py`
