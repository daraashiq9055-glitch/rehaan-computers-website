# Premium visitor website release — 20 October 2026

The approved visitor design is integrated into `public/index.html` and `public/visitor/` on `codex/admin-dashboard-redesign`. The animated computer hero, moving skills below navigation, course discovery/comparison/finder, public PDF brochures, typing practice, rounded footer links, social logos and creator animation are included. The existing on-demand location map is retained: it loads only after a footer click, supports hide/Escape, and opens directions to **34.026895, 74.643088**.

## Admissions and payment integration

The five-step form now submits real applications through the existing production functions in `public/script.js`. It retains every student field and original qualification/gender/source choice. Passport-photo validation/cropping uses the original processor; submission uses the original private Cloudinary upload. Sample-photo and preview-completion controls are absent from production.

The production admission validation/submission, photo processing and complete Razorpay order/verification/reconciliation/resume sections are byte-identical to the live-matching baseline at `26505c0`. `tests/visitor-release.test.mjs` pins SHA-256 digests of those sections. The only script changes expose those existing functions to the new step controller and prevent the legacy homepage UI from also initializing.

Applications are created only on the final submit action, with the original `Pending Payment` / `payment.status: awaiting` / **₹100** payload. A frontend checkout callback does not mark a student paid. Original backend verification and reconciliation determine success; tokens and pending references use the existing storage key. A resume button reopens the saved payment, and form clearing preserves that reference. Duplicate submits and edits while saving are blocked. An unavailable SDK blocks submission while course browsing remains available.

Visitor code and CSS have versioned URLs. Hosting revalidates the homepage, script and `/visitor/**`; existing admin/photo cache headers are retained. Fonts are served locally. No administrator page/module/style, Firestore rule, photo configuration, Worker or secret is changed. There is no student-data import, migration or deletion.

## Verification

All tests use local files, mocked third-party services or explicitly local demo Firestore projects. No real application, payment, email or student write was created by these checks.

- **25 admission/payment browser cases:** all gender choices/legacy omission, inline and Cloudinary photos, denied application writes, failed upload, successful verification, checkout cancellation/reload/resume, duplicate submission, unavailable order service, failed checkout SDK, rejected verification, lost verification response, unresolved reconciliation, already-paid order and deleted draft. Draft amounts remain awaiting until the backend's verified result; uncertain cases retain the recovery reference and never show the success modal.
- **53 Node checks:** 41 photo/private-access/worker/admin transaction/receipt checks, 10 catalogue/PDF/integration/fingerprint checks and 2 existing fee/reminder helper suites.
- Production visitor browser flows cover catalogue filters, saves, comparisons, course links, detailed syllabuses, PDF contents, both institute WhatsApp drafts, all form steps/review edits/photo checks/clearing, typing and six widths: **320, 390, 700, 768, 1024, 1440**.
- Motion/branding checks cover whole-scene animation, moving-line placement, reduced motion, private admin navigation, automatic guidance images, footer pills and local image loading.
- Startup/cache checks cover stale unversioned module URLs, unavailable Firebase SDK and blocked browser storage; public browsing remains usable with zero unintended writes.
- Six location/social checks cover map privacy, exact coordinates, hide/reopen/Escape, social destinations and direct directions without JavaScript.
- Existing admin checks pass: 39 baseline browser workflows across both photo modes, 6 marks/receipt groups, plus the warm-cache sign-in regression. Offline entry, photo viewing, fees, corrections, duplicate protection, exports and sign-out are covered.
- Actual Firebase SDK checks on the **local emulator** pass against the unchanged repository rules for gender/payment-field validation, privilege injection, private access, retained fields, atomic payments/receipts, concurrency and correction history. The gender test clears its local fixture database before each run so rerunning tests exercises creation rather than updating previous fixtures. Permission-denied messages in negative tests are expected.

Representative commands:

```sh
node --test tests/visitor-release.test.mjs tests/premium-home-model.test.mjs tests/photo-storage.test.mjs tests/photo-worker.test.mjs tests/admin-features.test.mjs tests/admin-records.test.mjs tests/admin-fees.test.cjs tests/fee-reminder.test.cjs
python3 tests/admission-payment-browser.py
python3 tests/premium-home-browser.py --production
python3 tests/premium-home-motion-browser.py --production
python3 tests/visitor-startup-browser.py
python3 tests/site-details-browser.py
python3 tests/admin-browser.py
python3 tests/admin-features-browser.py
python3 tests/admin-release-browser.py
```

Real-SDK emulator startup/dependency commands remain in [mark-cards-and-receipts.md](mark-cards-and-receipts.md). Tests must never target production Firebase.

The current live homepage and script were downloaded read-only and matched the local baseline before integration. Direct Worker health checks were blocked by this cloud environment's egress proxy (HTTP 403); this does not establish a Worker outage. No live gateway charge was used for validation. The original backend URLs, credentials and processing contract are retained.

## Saved rollback

`backup/before-visitor-redesign-2026-10-20` is pushed to GitHub at `26505c0`, with the live-matching previous homepage and existing working admin/Cloudinary/payment integration. This is a code backup, not a database snapshot. A Hosting rollback changes website files; it must not restore old payment/student values.

## Deploy from the owner's Windows CMD

The cloud Firebase CLI reported **No authorized accounts**. The owner previously authenticated in Windows; deploy there. No API secret is needed in chat. Stop the preview server with Ctrl+C, then:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git status --short
git pull --ff-only
npx --yes firebase-tools@15.34.0 login
npx --yes firebase-tools@15.34.0 deploy --only hosting --project rehaan-computers
```

Run these from `codex/admin-dashboard-redesign`. If Git reports local edits or conflicts, keep them and resolve them before deployment; do not hard-reset the folder. `firebase.json` deploys **public/**. `preview-home.py` still opens the disconnected design preview and does not deploy it.

The command above deploys Hosting only. Do not deploy rules or either Worker for this release. Deployment is complete only when the CLI prints **Deploy complete**.

After publishing, open `https://rehaan-computers.web.app/?release=20261020-visitor-1` and use Ctrl+F5. Check the animated hero, course details, maps and form navigation without submitting a test student. Open `/admin.html`, sign in and read the existing student count/photos/fee balances. Do not charge a payment merely as a deployment check. Share the deployment output so the published files can be checked read-only.

If necessary, use Firebase Console → Hosting → Release history → the previous release → Roll back. Alternatively publish the code backup from a new folder:

```bat
cd /d "%USERPROFILE%"
git clone --single-branch --branch backup/before-visitor-redesign-2026-10-20 https://github.com/daraashiq9055-glitch/rehaan-computers-website.git rehaan-visitor-rollback
cd rehaan-visitor-rollback
npx --yes firebase-tools@15.34.0 deploy --only hosting --project rehaan-computers
```

Choose another new folder name if that destination exists. Neither rollback method changes Firestore or Cloudinary data.
