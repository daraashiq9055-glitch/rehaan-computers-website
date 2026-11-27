# RC Learn private review handoff — 27 November 2026

Base: `0066fc0`. This implementation is a **private review candidate**, not a live release.

**Remote review Worker URL: not created yet.** `wrangler whoami` reported that this workspace is not authenticated. No Cloudflare account login or Firebase service-account secret is available here. No remote D1 database, Worker, Hosting, Firebase rules or public quiz was deployed. Remote real-account verification is still required.

## Implemented

### Persistent official Journey

The separate review Worker authenticates the student through Firebase/Firestore on every request and checks the explicit review UID allowlist. A service-account-backed Firestore transaction then reads the student's link, approved application, selection and requests, and updates **the existing** `applications/{id}.learningProgress.byCourse[course].topics` and its sanitized student view. It never creates another checklist or independent percentage field.

Student requests do not award completion. The official checklist distinguishes requested, teacher confirmed, currently learning and upcoming. Teacher-confirmed/manual items survive student changes. Teacher review also updates that same official checklist transactionally.

The generated review client submits selections to this server, rather than depending on an admin browser. A minute-based Worker cron independently reconciles saved selections/requests and teacher corrections as recovery. It processes two allowlisted accounts per tick; with the required two-account setup both are covered each minute. Larger manually configured review allowlists are capped at ten and rotate. Direct student saves synchronize immediately within the server transaction. If the Worker/credential is unavailable, saves report the failure instead of pretending to synchronize.

Account Follow is also handled through this authenticated server in review mode. This permits testing without deploying new Firebase rules. The original deployed rules and the normal website configuration are unchanged.

### Centre publishing and notifications

Admin → Student Portal → **Publish to All Students** opens the review publishing workspace in the generated review build. Available targets: all, batch, boys, girls and selected students. The server further restricts every audience to the explicit review UID allowlist.

- Notices/general announcements, homework, class notes with image, exams, results and holidays.
- Required content/author, optional scheduled date/time, and exact recipient preview before confirmation.
- Durable D1 queue; cron delivers even when the admin browser is closed. Two recipients per delivery tick, with an idempotent delivery journal.
- A stable publication identity prevents duplicate announcements after a timed-out confirmation.
- Edit and delete operate on the delivered private copies. Revision checks and delivery leases prevent concurrent edits from silently overwriting delivery work. Changes/deletions are queued and the displayed state indicates completion or a retryable error.
- Existing read/saved flags survive content corrections and delivery retries. Deleted copies disappear from student feeds.
- Per-recipient delivered/read/unread inspection. Student bell includes centre copies, private updates and admin replies. Read-details, mark-read and opening an update image update read status.
- Admin dashboard has an unread student-message area with direct conversation actions.
- Private Student Update remains separate and continues using the existing private publishing service.
- Account reports browser notification permission accurately. No new push subscription or delivery claim is made.

Only eligible, explicitly linked review accounts receive data. Centre copies remain private student records; this does not publish student content or images to the public landing page.

### Trusted private quiz

The review Worker uses a separate D1 binding and requires an allowlisted Firebase identity for every data route, including leaderboard reads. CORS preflight is the normal unauthenticated exception. Public official quiz configuration remains disabled.

- Exactly ten questions with exactly four choices; no answer keys in the issued attempt.
- One immutable scored submission per UID/India date. Retrying returns the original result.
- Monday–Sunday India cycles, no repeated question ID or normalized question text for the same student in the cycle.
- Six earlier-software questions and four current-software questions; Computer Basics uses ten current-software questions.
- Answer feedback uses the existing green correct/red selected-wrong result display after final submission.
- Weekly publication requires a closed week, a preview of the exact result snapshot and a matching review token. Top-three bonuses are 50/30/20, applied idempotently. Overall publication has its own reviewed snapshot.
- Points, streaks, badges and individual ranks come from server data. Public anonymous leaderboards remain off in the generated review candidate.
- Attempt activation is a separate admin action, restricted to selected review software and blocked when seven-day question supply is insufficient.

### Question bank

Persistent private D1 bank: software, difficulty, question, four options, correct answer, explanation, Draft/Review/Approved/Archived, search/software/status filters and JSON import/export template.

Approval is a separate teacher action after a saved Review state. Content changes cannot silently retain approval. Revisions reject stale edits/approvals. Imported questions are always Draft. Draft answer keys are bundled only in the authenticated Worker, **not in public website files**.

**Readiness: 33 teacher-review drafts, 11 requested software categories, 0 approved.** Each category has three starter drafts. These are not a complete seven-day bank. Teachers must check the facts, application version, wording and answer before approval, and add enough questions:

- Computer Basics: 70 distinct approved current questions for seven days.
- Later software: 28 distinct approved current questions plus 42 distinct approved earlier-software questions, with overlapping question text excluded.
- The workspace shows available/missing counts per software and blocks activation until sufficient supply exists.

The supplied set covers Computer Basics, Notepad, WordPad, MS Word, Excel, PowerPoint, Access, Tally Prime, Marg ERP, Photoshop and InPage. Existing identifiers are preserved; WordPad drafts explicitly note that newer Windows releases no longer include it.

## Local verification

| Test | Result |
| --- | --- |
| Node regression suite | 179 tests passed, zero failures |
| Review backend integration tests | Passed canonical Journey preservation/recovery, audience targets, schedule, idempotent publish, edit/read preservation/delete, review approval, readiness, seven-day rotation, immutable score, reviewed awards and Firestore timestamp codec |
| Firebase Auth + Firestore emulator | Two genuine disposable student identities and an admin; server REST transaction with admin browser absent, scheduled recovery, teacher confirmation, account Follow, canonical view parity and cross-student/write denials |
| Worker publishing against Firestore emulator | Targeted delivery, private image, read state, admin read inspection, edit/delete and other-student read denial |
| Bundled Worker + workerd + actual local D1 over HTTP | Credential signing, Journey REST transaction, private auth gates, readiness, ten-question issuance without keys, final-score immutability, account separation and private leaderboard; upstream Firebase stubbed in this runtime test and tested separately above |
| Admin review browser | Question review/approval/filtering, scheduled preview, exact audience, read status, edit/delete at 320/360/390/768/1024/1366 px |
| Existing management and generated admin browser | Existing direct actions and all 17 views retained, fees/receipts/marks/sign-in and guarded operations passed |
| Student browser | Two distinct account fixtures, requests, messages, read/saved state, images and logout at all six widths |
| Quiz result browser | Unready review attempts/rewards blocked; after submission correct options are green and the selected wrong option is red; verified at mobile and laptop widths |
| Fixed navigation | Four tabs × six widths × top/middle/bottom = 72 checks; no horizontal overflow, clipped labels, hidden final content or drifting bottom navigation |
| Production candidate and Worker bundle | Builds passed; Worker compilation used `--dry-run` only |

Emulator and fixture results are **not remote production-account tests**. Local assertions intentionally trigger permission-denied errors when verifying isolation; these are expected denials, not ignored failures.

## One-time setup on your computer

Use a fresh worktree from the preview commit given in chat. Node.js 24+, Python and Google Cloud CLI are needed. Keep service-account files outside the Git checkout. Do not send passwords, tokens or JSON keys in chat.

First create a dedicated Firebase-project service account (Google Cloud CLI, one time):

```powershell
gcloud auth login
gcloud iam service-accounts create rc-learn-review-sync --project rehaan-computers --display-name "RC Learn private review sync"
gcloud projects add-iam-policy-binding rehaan-computers --member "serviceAccount:rc-learn-review-sync@rehaan-computers.iam.gserviceaccount.com" --role "roles/datastore.user"
gcloud iam service-accounts keys create "$env:USERPROFILE\rc-learn-review-service-account.json" --iam-account "rc-learn-review-sync@rehaan-computers.iam.gserviceaccount.com" --project rehaan-computers
```

This dedicated credential has Firestore access; the reviewed Worker restricts operations to linked, allowlisted test accounts. Keep the key private. These commands do not deploy Firebase rules. If the dedicated service account already exists, reuse it rather than recreating it. Organization policies may require an administrator to authorize key creation.

Then, from the preview checkout:

```powershell
npx.cmd --yes wrangler@4.50.0 login
python setup-student-review.py
```

The setup tool asks for **the admin Firebase Authentication UID, two distinct disposable student Firebase UIDs, and the local JSON-key path**. UIDs are not student usernames/admission numbers. It runs local backend checks first, creates only `rc-learn-quiz-review`, validates the database identity, applies the candidate schema, deploys only `rc-learn-private-review`, sends the credential through `wrangler secret put` stdin, and generates the local authenticated preview with the actual Worker URL. It never prints the secret or writes it to TOML. Local config and secret files are Git-ignored. Live website origins are rejected by the setup validator.

The tool prints the **actual review Worker URL**. No URL in this document is claimed to be deployed. If setup stops after creating the database, reuse its printed UUID with `python setup-student-review.py --database-id YOUR_REVIEW_UUID`; do not create repeated databases.

Serve the generated candidate:

```powershell
python -m http.server 8000 --bind 0.0.0.0 --directory build/student-service-review/public
```

- Admin: **http://localhost:8000/admin.html**
- Student: **http://localhost:8000/student.html**
- This is the real authenticated review build, not the old `preview-student-design.py` sample screen.
- For phone testing, add the exact laptop LAN origin to `--origin` during setup, alongside `http://localhost:8000` and `http://127.0.0.1:8000`. No wildcard origins. Use the laptop IP on the same hotspot/network.
- To regenerate after a code change without deploying anything: `python prepare-student-review.py --worker-url YOUR_ACTUAL_REVIEW_WORKER_URL`.

The generated review directory deliberately has an invalid Hosting public path, preventing accidental standard Firebase Hosting deployment from that candidate. Do not copy its enabled review configuration into the live website.

## Required remote review before any live activation

1. Verify the Worker URL and D1 database in the Cloudflare account; inspect the UID allowlists and exact preview origins.
2. Sign in to review Admin → Student Portal → Review System Status. Confirm credential configuration and successful scheduled sync timestamps. No admin browser should be required for subsequent student saves.
3. Close every admin browser. In separate student sessions, select current/learned software, refresh and sign in from another device. Reopen admin and verify the one official checklist; confirm/correct a request and verify the student view.
4. Test all publishing targets using disposable records with known gender/batch. Schedule delivery, close admin, verify the intended accounts only, read it, inspect the admin read state, then edit/delete it. Private student updates and replies must remain private.
5. Confirm bell/read behaviour and admin unread-message actions. Notification preference must not claim push delivery without a verified subscription.
6. Import the draft pack, review/correct it, add sufficient approved questions and check readiness. Enable **private review attempts only** for ready software.
7. Test two students through the deployed review URL: ten questions, four options, no key before submission, no score-changing retry, separate attempts and ranks. Test seven-day nonrepeat behaviour with controlled review data rather than changing a production system clock.
8. Review and publish a completed test week; verify 50/30/20 awards and the separately reviewed overall snapshot. No production scores, points or ranks should be invented.
9. Retest 320/360/390/768/1024/laptop layouts with the real review service.
10. Obtain separate authorization for any live Hosting/rules/production Worker or quiz activation. This handoff does not authorize or perform those releases.

Review constraints: two accounts via the setup helper (backend hard cap ten), at most 100 listed publications, 5,000 bank rows and the existing 300-participant league publication limit. Scheduled delivery/recovery may take additional minutes after transient failures; the status panels expose failed/retrying work. Larger production scale and credential lifecycle must be reviewed before removing these limits.

## Changed files

- `.gitignore`
- `backend/student-portal/README.md`
- `backend/student-portal/firestore-server.mjs`
- `backend/student-portal/journey-server.mjs`
- `backend/student-portal/migrations/0002_review.sql`
- `backend/student-portal/publications.mjs`
- `backend/student-portal/question-bank.mjs`
- `backend/student-portal/question-drafts.json`
- `backend/student-portal/quiz-core.mjs`
- `backend/student-portal/review-worker.mjs`
- `backend/student-portal/worker.mjs`
- `backend/student-portal/wrangler.review.example.toml`
- `docs/rc-learn-private-review-20261127.md`
- `prepare-admin-release.py`
- `prepare-student-review.py`
- `previews/admin-premium/bridge-exports.js`
- `previews/admin-premium/portal-review-ui.js`
- `previews/admin-premium/portal-workspace.js`
- `previews/admin-premium/workbench.css`
- `public/student-admin-portal.js`
- `public/student-experience.js`
- `public/student-portal-auth.js`
- `public/student-portal.css`
- `public/student-review-service.js`
- `public/student.html`
- `setup-student-review.py`
- `tests/student-quiz-browser.py`
- `tests/student-review-browser.py`
- `tests/student-review-emulator.cjs`
- `tests/student-review-runtime.cjs`
- `tests/student-review.test.mjs`
