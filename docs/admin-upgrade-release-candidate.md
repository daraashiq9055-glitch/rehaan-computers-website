# Admin upgrade and homepage follow-up — release candidate

Nothing in this document deploys automatically. The live admin remains the
existing dashboard until the reviewed candidate is explicitly published.

The visitor source now includes the requested homepage corrections: the sole Dar
Yasir credit is the existing premium footer treatment, personal Facebook is
removed, the requested personal Instagram and one official Facebook link remain,
and visitor gallery wording describes practical learning. Both top bar phone numbers,
header Call us, both institute phone links and a floating WhatsApp enquiry are
present in HTML, so contact details do not depend on JavaScript. The floating WhatsApp chooser and the existing enquiry dialog both offer
+91 9149551258 and +91 9797205429. Nothing is sent automatically.

Tuition is explicitly **₹999/month** in exactly two static areas: the overview
gold-highlighted hero panel and the explanation below batch choices. The separate **₹100 admission
fee**, original public form, Cloudinary/photo flow, payment Worker integration and
verification logic are preserved. The visitor module graph uses a new cache
version to avoid mixed cached code after a later release.

## Try the safe previews from Windows CMD

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python preview-home.py
```

Stop with Ctrl+C, then use `python preview-admin.py` for fictional student data.
Both launchers choose a free localhost port. The visitor preview cannot submit
applications/payments. The admin preview uses local adapters and resets sample
records on reload. Do not serve `public/` as an isolated demo: it uses real services.

## Build a separate real-service candidate

```bat
python prepare-admin-release.py
```

This creates `build/admin-release/public/` plus a **Hosting-only** config in
`build/admin-release/firebase.json`. It never edits normal `public/admin.html` or
`public/admin-app.js`, runs deployment commands, or contacts Firebase. Generated
files are ignored by Git; the builder and source modules are committed. Rebuilding
only replaces a previous generated candidate bearing its release marker.

The candidate includes all homepage/public assets plus the approved sapphire/gold
admin presentation, records centre/profiles, Today, accounts book, richer atomic
payment form, lifecycle stages, per-course learning checklists, preferences per
admin, and exact-student Ctrl+K actions. It reuses the existing auth checks,
student validation, Cloudinary integration and original financial transactions.
The original `admin-app.js` is retained byte-for-byte as the leading source, with
a small guarded workspace interface appended. Optional new workspace module
failure cannot block the original login or fee register. No mock SDK, automatic
sign-in, fictional records, demo admin switch or browser audit journal ships in
the generated files.

Secure history is disabled by default and says so honestly. The read-only UI,
reader, pagination, student filtering, details and loaded-page export are prepared.
The separate [audit backend](../backend/audit/README.md) must be deployed and
verified in a test project before `python prepare-admin-release.py --audit-ready`
is used. A completed local test is not production readiness for Eventarc, billing,
IAM, trigger identity or Cloudinary/payment connectivity.

Use the existing private backup before a later release. Compare a representative
enrolled record, an offline record, photos, corrected receipt, ledger and marks
before/after deployment. Hosting changes do not migrate or clear data. Keep a
Firebase Hosting release/version for rollback. No bulk import, attendance,
assessment certificate or extra admin role system is introduced.

## Verification

- `node --test tests/application-audit.test.mjs tests/visitor-release.test.mjs`
  checks trusted-context identity, redaction/size limits, retries/idempotency,
  unchanged original rules and public payment/photo/admission code fingerprints.
- `tests/application-audit-emulator.mjs` uses actual SDKs and local candidate
  rules, two admins, denied client history writes, logged payment changes and
  private pagination. See backend README for local setup.
- `python3 tests/visitor-contact-browser.py` checks contact/social/credit/tuition
  requirements at five widths both with and without JavaScript.
- `python3 tests/visitor-startup-browser.py` and
  `python3 tests/admin-navigation-browser.py` cover warm-cache loading, unavailable
  SDK/storage, both homepage admin links, same-tab navigation and Back.
- `python3 tests/admission-payment-browser.py` exercises admission/photo/payment
  success and failure/retry paths with all services intercepted.
- `python3 tests/admin-candidate-browser.py` builds the actual separate bundle and
  tests manual sign-in, all 15 views at five widths, student/photo addition,
  payments/corrections/PNG, marks, lifecycle/checklists, preferences, secure history
  UI and the optional-module failure fallback. It never contacts live services.

No deployment or production student, payment, image, email or message is created
by these tests.

The owner confirmed Firestore `asia-south2` and the **Spark** plan. The region is
recorded in the backend example; no billing change was made. Server history cannot
be deployed on the current plan. All other dashboard changes can be reviewed on
Spark with secure history disabled; they do not require a billing upgrade.

## Mobile learning follow-up

The 30-second typing test is replaced with a three-question tap-based skill
challenge, instant explanations, a local summary and an alternate question set.
It requires no typing or timer, saves no answers and never affects official marks,
admission or payments. The laptop screen has a small animated stack of learning
cards that follows the existing scene pause/reduced-motion controls.
`python3 tests/visitor-skill-browser.py` validates the activity, motion and privacy.

The final manual review and Hosting-only commands are in
[complete release review](complete-release-review.md). Deploying the generated
`build/admin-release` bundle includes both the homepage and upgraded admin.
