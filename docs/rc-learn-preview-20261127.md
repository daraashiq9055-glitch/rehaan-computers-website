# RC Learn preview — 27 November 2026

Continues `69b689c` on `codex/premium-leagues-navigation-20261123`. **Preview only; nothing deployed.** This is not a claim that the real-account release is complete.

## Changes

- Midnight navy student surfaces, compact welcome/current software, notification count, restrained gold accents, skeleton loading, clearly unavailable verified rewards. Four fixed tabs: Home, Updates, Journey, Account.
- Public login above the desktop leaderboard/updates columns; stacked on mobile. No fabricated rankings. Gold/silver/bronze placeholders, website back link and official admission anchor.
- One official checklist remains in `applications/{applicationId}.learningProgress.byCourse[course].topics`. The student view is its sanitized read-only projection, not a second editable tracker.
- Student completion requests are proposals, not awarded progress. Teachers confirm/reject them in the Portal Journey drawer. Confirmation modifies the existing checklist and refreshes the student projection transactionally. Manual teacher corrections survive later software selection. Selecting software alone no longer awards completion to earlier programs.
- Approved software display order: Computer Basics, Notepad, WordPad, MS Word, Excel, PowerPoint, Access, Tally Prime, Marg ERP, Photoshop, InPage, Outlook. Existing stored identifiers remain compatible.
- Account-level immutable Follow acknowledgement and bounded completion requests have **candidate rules only**. Follow permits access when browser notification permission is denied; it does not claim a push subscription.
- Separate Publish to All Students and Private Student Update entry points. Centre publishing supports all linked students, batch, boys, girls and selected students. Content, image, author, publication date and exact recipients are reviewed before publishing. Writes go to each student's private feed; they are not exposed publicly.
- Centre publication checks eligibility again inside the transaction, rejects a changed reviewed audience, preserves read/saved state on retries, and caps one publication at 100 recipients / 8 MB to stay within transaction limits.
- Unread centre/private updates and replies contribute to the bell. Reading reduces the count. Notes/Homework/Notices/Exams/Results/Saved filters and image previews remain available.
- Account contains useful student records, notification status and one bottom Logout button. Unnecessary Settings/Privacy panels removed from the signed-in path.
- Quiz management remains disabled: software, difficulty, exactly four options and answer, teacher review, weekly cycle, seven-day planning and activation checklist. Drafts remain session-local with explicit export/import; editing/importing resets review. No quiz service, scores, points or badges activated.

## Verification

All tests use local emulators or explicitly isolated browser fixtures, **not production student accounts**.

| Check | Result |
| --- | --- |
| Node suite `node --test tests/*.test.mjs` | 175 passed, 0 failed |
| Fee regression script and build encoding | Passed |
| Settings, gender, admin features, student rules emulator suites | Passed |
| Auth + Firestore integration | Passed: separate admin/student identities, provisioning, fees, attendance, private images, replies, official checklist, review, fanout, cross-account denials |
| Account Follow persistence | Passed emulator server reads after sign-out/sign-in and a second independent Firebase client; reset and other-student reads denied |
| Student browser fixtures | Two separate student views, requests, image preview, messages, read/saved state, logout, public column/stack order |
| Direct admin management browser | 14 quick actions, reviewed centre publishing, private categories, login/password clearing, access, attendance, replies, checklist and teacher request review, fees, quiz drafts; all six widths |
| Generated admin candidate | Existing 17 views at all six widths; manual sign-in, no demo controls or browsing writes |
| Fixed student navigation | All four tabs × six widths × top/middle/bottom: 72 measurements passed; content clears navigation, labels fit, no horizontal overflow or browser exceptions |
| First login flow browser | Follow → software selection → portal; repeat login/refresh skips completed setup in the fixture |
| Isolated preview launcher | Passed at 320px, notification permission denied, repeat login/refresh, no external requests, missing files or script errors |
| Quiz UI contract | Test-only enabled fixture: 10 questions, four choices, final result. Production configuration remains disabled |
| Production candidate build | `python prepare-admin-release.py` passed; generated under `build/admin-release`, not deployed |

Responsive widths: **320, 360, 390, 768, 1024 and 1366 px**. Screenshots are generated under `build/student-fixed-{home,updates,journey,account}-{390,1366}.png`, `build/portal-home-{390,1366}.png` and `build/management-admin-{390,1366}.png`.

## Safe visual preview on Windows PowerShell

Use a separate worktree to preserve the current checkout and its uncommitted files:

```powershell
cd "$env:USERPROFILE\rehaan-admin-preview"
git fetch origin codex/premium-leagues-navigation-20261123
git worktree add --detach "$env:USERPROFILE\rehaan-rc-learn-preview-8" FETCH_HEAD
cd "$env:USERPROFILE\rehaan-rc-learn-preview-8"
python preview-student-design.py
```

Open **http://localhost:8000/student.html**. Sample login: `alpha` / `StudentPass123`, or `beta` / `StudentPass123`. **Do not enter real credentials into this isolated design preview.** It displays a persistent sample-data banner, has no Firebase client connection, and stores setup choices only in preview browser storage. This deliberately differs from the real implementation's server-side Follow state. It is for reviewing appearance and interaction, not verifying production synchronization.

For a phone connected to the laptop's mobile hotspot/network, use `http://LAPTOP-IPV4:8000/student.html`; obtain the laptop address with `ipconfig`. Keep the terminal open. If port 8000 is occupied, use `python preview-student-design.py --port 8001` and change the URL accordingly.

## Remaining release gates — no deployment authorization implied

1. Real production-account verification has **not** been performed from this workspace. Existing accounts have not been accessed or modified.
2. The new account Follow and completion-request paths need the reviewed candidate rules in an approved test environment before real-login testing. The current deployed rules have not been changed. Do not use the old rules with this new authenticated build and assume a permission denial is a student-password problem.
3. Current-software synchronization still runs in the signed-in admin listener inherited from the existing implementation. With admin closed, the student selection persists but the official checklist projection waits for admin to reconnect. No background service was enabled.
4. Verify one admin and two separate real test students: first and subsequent Follow, current software, teacher review/corrections, fees/receipts/attendance, all audience targets, private updates/images, messages, unread counts and account isolation.
5. Public centre notices use the existing explicitly public source. New centre publishing sends private student-feed copies, not public homepage notices.
6. Password reissue still requires the verified account-recovery service. No insecure password reset shortcut was added.
7. Quiz activation, real points/streaks/badges, reviewed question supply and leaderboard synchronization remain blocked pending backend and real-account verification. Worker/D1 and push services were not changed.
8. Review the full flow and explicitly approve deployment separately. No Hosting, Firebase rules, Cloudflare Worker or D1 deployment is part of this preview.

## Changed files

- `backend/audit/firestore.rules`
- `docs/rc-learn-preview-20261127.md`
- `firestore.rules`
- `prepare-admin-release.py`
- `preview-student-design.py`
- `previews/admin-premium/bridge-exports.js`
- `previews/admin-premium/portal-broadcast-ui.js`
- `previews/admin-premium/portal-quiz-workshop.js`
- `previews/admin-premium/portal-workspace.js`
- `previews/admin-premium/workbench.css`
- `public/student-broadcast.js`
- `public/student-experience.js`
- `public/student-learning-path.js`
- `public/student-portal-admin-service.js`
- `public/student-portal-auth.js`
- `public/student-portal.css`
- `public/student-programs.js`
- `public/student-view-model.js`
- `public/student.html`
- `tests/portal-management-browser.py`
- `tests/student-auth-integration.cjs`
- `tests/student-broadcast.test.mjs`
- `tests/student-design-preview-browser.py`
- `tests/student-learning-path.test.mjs`
- `tests/student-live-browser.py`
- `tests/student-onboarding-browser.py`
