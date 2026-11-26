# Trusted student quiz candidate — not deployed

This Cloudflare Worker is a separate candidate for the existing four-tab
Student Portal. Firebase Spark blocks the Firebase Functions backend used by
the audit candidate, so the quiz uses a Worker and private D1 database instead.
No Worker, D1 database, question bank or production student account was created
by this branch. `public/student-quiz-service.js` keeps the official UI disabled.

## Data and identity

- Firebase Auth remains the identity provider. On every student request the
  Worker presents that student's bearer token to Firestore to read only
  `studentPortalViews/{uid}`. Firestore verifies the token and deployed rules
  authorize the UID. The Worker never trusts a decoded JWT UID alone.
- For a new quiz it reads `learning/current` with the same bearer token. One
  learning program is locked across the seven-day cycle after the first quiz.
- An admin request reads the caller's own `admins/{uid}` using the same token.
  Students cannot add question keys or publish ranks.
- D1 stores the private question bank, answer keys, locked daily attempts,
  final scores, visit dates, award points and reviewed league snapshots.
  `/quiz/today` sends ten questions and four choices each without answer keys.
  `/quiz/submit` stores one final result. Repeated submissions return the
  original result. The correct key is revealed only after completion.
- Each seven-day cycle is Monday through Sunday in India time. A question ID
  or equivalent question text already used by that student in the cycle is
  excluded. A submission can only use the date attached to the quiz by the
  service. Advanced programs use
  six earlier-program questions and four current-program questions. The first
  program uses ten current-program questions. A quiz stays unavailable when
  there are too few unused questions; it never repeats or silently shortens.
- Points are ten per correct answer. Publishing reviewed weekly standings adds
  50/30/20 bonus points for the top three. The overall leaderboard ranks by
  verified points; weekly ranks use summed scores. A visit streak counts
  authenticated quiz-service visits on consecutive India dates. Badges come
  from verified scores, visits and published weekly rank.
- Public leaderboard requests return only the published top ten. An enrolled
  student sees their own rank even when it is lower than ten. Weekly publication
  opens after the week ends and defaults to the most recent completed week.
  The published board stays visible when the next week begins.
- Publication currently supports up to 300 participants in one atomic D1
  batch. Larger cohorts need a reviewed pagination design before publishing;
  the Worker returns an explicit error instead of a partial leaderboard.

## Preview data paths

The candidate Firestore rules add subcollections under the existing private
`studentPortalViews/{uid}` document:

| Path | Student | Admin |
| --- | --- | --- |
| `updates/{id}` | Read own; mark own item read/saved | Publish and delete title, details, category and a resized private JPG |
| `messages/{id}` | Read own; send immutable message; mark centre reply read | Read and reply; mark student message read |
| `learning/current` | Read and choose one listed program | Read selection live in Student Details |

All student operations require their parent view to be enabled. The source
`applications` collection remains admin-only. A class image is resized to a
JPG data URL of at most 350 KB and stored in that student's private update
document, avoiding a public image URL. This is suitable for a small centre;
large-scale broadcasts need a shared private image store to avoid copies.

## Local checks

```text
node --test tests/student-quiz-core.test.mjs tests/student-quiz-worker.test.mjs
node --test tests/student-view-model.test.mjs
python tests/student-live-browser.py
python tests/student-quiz-browser.py
python prepare-admin-release.py
python tests/admin-candidate-browser.py
```

The Worker test uses SQLite in memory as a D1-compatible adapter and stubs
Firestore's token-verified response. The Firestore emulator test verifies the
student-scoped rules separately. `tests/student-auth-integration.cjs` creates
one admin and two student users in the Firebase Auth emulator and verifies
actual SDK provisioning, private reads and disabled access. These are emulator
accounts, **not** real Firebase project accounts or a live D1 test. The
`wrangler.example.toml` dry-run can verify bundling without deploying.
The candidate was also exercised in local workerd/Miniflare with a local D1
database and a stubbed Firestore response; this verified the actual Worker
entry point, authentication forwarding and question insertion. This is not a
deployed Cloudflare or production Firebase verification.

## Deployment checklist (hold until real-account verification)

1. Review the Firestore rule diff and test two real, disposable Firebase Auth
   student accounts plus one real admin account. Confirm Email/Password is
   enabled and the admin can create credentials without losing their session.
2. Confirm the existing admin rules and settings are unchanged by the merged
   rule publication. Publish the student view/subcollection rules only in a
   coordinated release; verify cross-student reads and writes are denied in
   the live project before enrolling real students.
3. Create a private D1 database; review its database ID, billing and access.
   Apply `schema.sql` and copy the example Wrangler config only after review.
   Use exact allowed origins. No private keys are needed in the Worker.
4. Deploy the Worker to a nonproduction review address first. Test two real
   students against each other's records, a real admin, the question bank,
   seven distinct daily quizzes, one final score, locked retries, visits,
   badges and rank publication. Check error and rate-limit behavior.
5. Add enough teacher-reviewed questions: at least 70 unused questions for
   the first program per seven-day cycle; advanced programs need at least 42
   available earlier and 28 current questions per cycle. Verify four choices
   and the correct key for every question. The admin question form can then
   publish questions to the trusted bank.
6. Test admin-published notes, homework, exams, results and private images;
   student read/save/unread; message replies and notifications; learning
   selection; receipts, fee balance, attendance and the assessed journey with
   two separate real student sessions. Test 320, 360 and 390 px on real phones.
7. Review public display names and obtain any needed centre/student consent
   before publishing a leaderboard. Confirm weekly and overall snapshots and
   points after admin review.
8. Only after all checks pass, set `quizServiceConfig.enabled` to `true`,
   update the content security policy's `connect-src`, build the final Hosting
   candidate, and request the owner's release decision. Do not run production
   deployment from this checklist automatically.
