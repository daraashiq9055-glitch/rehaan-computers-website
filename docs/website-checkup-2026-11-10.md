# Website checkup — 10 November 2026

The approved homepage release was checked against production-source commit `ae629666e318be902e40e24d1f470fbbdd4e11f3` on `codex/admin-dashboard-redesign`. No production application, fee, payment, notification, email or student data was created or changed. No Hosting, rules, Worker or backend deployment was performed during this checkup.

## Results

All **31 additional browser/emulator/release check suites** passed on their final runs, including Windows CRLF/encoding and release-settings guards. Production files under `public/` did not change during the checkup.

- **143 automated checks passed**, with zero failures or skips after installing isolated test dependencies and running the Firestore rules against a verified local emulator. Coverage includes records, attendance, marks and grades, fees, receipts, reminders, settings, photos, audit history, catalogue/PDFs, notification APIs and payment security.
- **39 additional payment-worker integration assertions passed**, using mocked provider/Firestore/email services with real cryptographic verification.
- **25 admission/payment browser scenarios passed**, including the original gender choices, photo modes, denied writes, upload failure, verification, interrupted checkout, failed SDK/order calls, lost acknowledgements, unresolved reconciliation, already-paid orders and missing drafts.
- Visitor browser checks cover all seven covers, category/search/duration filters, saved courses, three-course comparison, course routing and tabs, multi-page PDF brochures, finder choices, both WhatsApp contacts, all admission steps/review/photo validation, the skill challenge, image gallery, mobile navigation and reduced motion.
- Motion checks cover the laptop and its pause/resume control, learning slideshow, skills strip, RC-style skill animation, original creator signature and local image loading. Core layouts were checked at 320, 390, 700, 768, 1024 and 1440 pixels. The bottom Apply fix was separately checked at 320, 360, 390, 430 and 700 pixels.
- **21 baseline admin browser workflows and six admin-feature browser groups passed**. Further checks cover cached sign-in/navigation, private records, statement directories/exports, group marks, automatic/manual grades, private-photo export failures and retry/session isolation, shared settings, reminder images, monthly payment review, cancellation notices and receipt/photo/signature exports.
- Current contact/location checks cover exact map coordinates, on-demand map loading, hide/reopen/Escape, the current official social destinations, no-JavaScript fallback and phone/tablet/desktop layouts.
- Notification checks cover explicit permission, denial/failure/success, subscription/unsubscription and shared state on the homepage and dedicated Follow page, with all services mocked.
- Security-browser checks enforce the configured CSP, reject inline script/event injection, escape malicious stored fixture text, deny non-admin views, clear passwords/private state and use no live writes.
- Real-SDK tests against local demo Firestore projects verify public/non-admin denial, bounded shared settings, signatures, atomic payments/receipt counters, correction history, concurrency protection, immutable audit history and preservation of existing fields.
- **159 local references across all four public HTML pages and their CSS/JavaScript dependencies resolved**, with no missing assets or syntax errors.
- The credential scan covered **392 worktree files and 1,010 reachable blobs across 216 commits** at the start of the check. It found no confirmed credential-pattern matches. This is a pattern scan, not proof that no credential has ever been exposed.

## Findings and limits

The lockfile audit of the optional `backend/audit` package reports **six moderate, zero high and zero critical advisories**. Affected dependency chains include `glob`/`minimatch`, `rimraf`, `gaxios`, `gcp-metadata` and `google-gax`. Fixes are reported available. That package is the separate history backend; it is not part of the static homepage deployment. No dependency upgrade or backend deployment was made as part of this presentation change.

Firebase/Razorpay/Cloudinary/notification account settings, active production rules and provider settlement were not verified with owner credentials. Real payments, live notification deliveries and real student edits were deliberately not exercised. The checks establish behaviour in isolated browser fixtures and the repository rules in a local emulator; they do not certify the full production environment.

## Test-harness corrections

Older tests were updated to reflect the approved removal of laptop shortcuts, new course covers, hero-fee replacement, retained responsive contact behaviour and current footer/social links. The expected anonymous visit request is now locally stubbed so it cannot reach the production counter. Skill-answer privacy checks distinguish that pre-existing anonymous visitor identifier from challenge data.

Receipt export tests now wait for the asynchronous print-ready callback; logout checks wait for private-view cleanup to finish. Payment-preview expectations count the atomic receipt-counter write as well as the single student-record write. Reminder tests exercise the current all-due, read-only draft flow and verify that opening/repeating a message does not mark it sent. A development-only receipt preview callback now accepts the preview handler's existing argument. None of these corrections modifies production UI or payment/data logic.

## Reproduce

See `docs/mark-cards-and-receipts.md` for the pinned local emulator and isolated SDK setup. With it listening at `127.0.0.1:8088` and `NODE_PATH` pointing to the isolated dependencies:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8088 NODE_PATH=/path/to/test-dependencies/node_modules node --test tests/*.test.mjs tests/*.test.cjs
node tools/payments-worker-test.mjs
python tests/admission-payment-browser.py
python tests/premium-home-browser.py --production
python tests/premium-home-motion-browser.py --production
python tests/visitor-startup-browser.py
python tests/site-details-browser.py
python tests/visitor-contact-browser.py
python tests/visitor-skill-browser.py
python tests/admin-browser.py
python tests/admin-features-browser.py
python tests/admin-fee-reminders-browser.py
python tests/admin-operations-browser.py
python tests/security-browser.py
```

All fixture-based browser suites require Playwright and Chromium. Emulator tests must use local demo projects, never production Firebase. Full raw run logs and screenshots are retained in the task workspace, outside the deployed `public/` directory.
