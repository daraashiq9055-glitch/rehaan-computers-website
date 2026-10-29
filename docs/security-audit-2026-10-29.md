# Security review — 29 October 2026

## Release status

**Hardening is prepared and tested locally. Nothing was deployed during this
audit. Existing student records, payment records, production secrets and the live
Razorpay Worker were not modified.** This is not a guarantee against compromise.

The working live payment service must not be replaced with the candidate in
`backend/payments` until its deployed source has been exported and compared.
The owner does not know whether it has been edited directly in Cloudflare.

## Scope and evidence

Reviewed `rehaan-computers-website`, its release builder, Firebase rules, private
photo service, optional history backend, and historical payment source. The
second supplied repository, `rehaan-computers`, had no available source/refs in
this workspace. Cloudflare secrets, Firebase account settings/IAM, API-key
restrictions, production logs, and the deployed Worker source were unavailable.

Read-only checks against production confirmed:

- Homepage and admin HTML returned 200. HSTS was present.
- Anonymous Firestore requests for applications and private mark-card signatures
  returned 403. No student data was downloaded.
- `/.env` and `/.git/HEAD` returned 404.
- HTML lacked CSP, nosniff, frame and referrer headers before these changes.

Cloudflare endpoint checks and download of the real Razorpay checkout SDK were
blocked by the environment's network proxy. Elevated retries were cancelled.
Consequently, live Worker CORS/rate-limit behavior and real checkout compatibility
have **not** been verified. No real payment, email, WhatsApp message, photo upload
or production database write was made.

## Findings and changes

| Area | Result and action |
| --- | --- |
| Public admission abuse — outstanding | Anonymous Firestore creation is still intentionally allowed for admission. Rules reject invalid/privileged fields, but a bot can submit valid drafts directly and consume quota. Edge API limits do not protect direct Firestore writes. Configure Firebase App Check or move draft creation to a protected server gateway before calling this closed. |
| Payment source provenance — outstanding | Historical source exists, but equivalence with production is unknown. Hardened candidate is held for comparison; see `backend/payments/README.md`. |
| Server dependencies — fixed in lockfile | Original optional history backend audit reported six high advisories. Updated body-parser to 2.4.0 and pinned the transitive gRPC override to 1.14.7; resulting npm audit has zero reported vulnerabilities. Firebase major versions were preserved. This backend is not deployed on Spark. |
| Admin authentication — strengthened | Firebase Authentication remains the password provider. Admin verification now requires an exact UID match, checks the session again after role lookup, clears the password field after every attempt, and avoids logging full verification errors. Existing database role checks remain authoritative. |
| Browser/XSS — strengthened | Generated Hosting headers enforce strict script CSP on `/admin.html`, block inline event/script injection, deny framing and MIME sniffing, and limit referrers/browser permissions. Stored malicious text is escaped in tested student/detail/marks views. |
| Visitor checkout compatibility — staged | Visitor pages enforce object/base/frame restrictions. The stricter script/network policy is Report-Only until the real Razorpay flow is verified. Reports are visible in browser developer tools; no remote report collector is configured. This staged policy does not claim to block all visitor-page XSS. |
| Public input — strengthened | New public drafts require a numeric ten-digit phone; when a payment object is supplied it must be awaiting ₹100; photos must be supported raster data or a bounded private reference in this institute's Cloudinary folder. Public paid fields, marks, receipts, reads, updates and deletes remain denied. Existing records/admin edits are not migrated or revalidated. |
| Private photos — strengthened candidate | Added a mandatory per-IP read limit, 300/minute, before upstream role verification. Existing public upload limit remains 10/minute. Removed localhost from production origin configuration; private images still require a valid admin token verified through Firestore. |
| Payment APIs — strengthened candidate | Exact browser origins, bounded JSON/webhook bodies, mandatory edge rate-limit bindings, safe errors, provider timeouts and fixed token endpoint. Existing signature/capture/currency/amount/ownership/atomic finalization checks are preserved in the tested historical implementation. |
| Exposed files — strengthened | Hosting excludes credential, environment, log, archive and source-map patterns. Release omits the unused legacy `admin-fix.js`. Git ignores local credentials. Security-header hashes are regenerated from the final release HTML. |
| Optional history rules — corrected | Its rules had fallen behind main rules. Synchronized current receipt-counter/signature permissions while retaining server-write-only history permissions. General secure history remains disabled; no Blaze upgrade or backend deployment was made. |

### Passwords and browser keys

Firebase Authentication manages password hashing; passwords are not saved in
Firestore by this website. No custom password hashing was added. Both authorized
admins retain their intended access; public users cannot gain admin privileges by
opening the HTML route. Static admin HTML may be public, while its data and writes
require a verified role. A server gate for the HTML itself would be a separate
architecture change.

Firebase browser API keys, Razorpay checkout key IDs and EmailJS public keys are
public identifiers. Removing them would break the site without securing the
database. Private Cloudinary/Razorpay credentials and service-account keys belong
in server secrets. Production secret values and restrictions still need account
verification. Keep EmailJS private credentials server-side and restrict public
templates/origins in the provider console.

## Secret and history review

- Reviewed all 179 reachable commits and 671 unique blobs before this audit's
  commit, plus the current nonignored worktree.
- A redacted high-signal scanner found no confirmed private credentials.
- A second scan used detect-secrets 1.5.0 with provider verification disabled:
  646 text blobs, 539 hashed findings. Reviewed findings were public Firebase
  browser identifiers (168), package integrity checksums (282), embedded image
  data (37), test fixtures/checksums (47), and five preview/test fixture strings.
- Current-worktree scanner findings were also reviewed as public identifiers,
  checksums, image bytes and fake test values. No credential values were included
  in audit output.
- Only a placeholder `backend/audit/.env.example` project environment file was
  found. Runtime credential values were not printed or copied. Production
  Cloudflare/Firebase environment values cannot be checked from this workspace.

No confirmed leak required rotation or destructive Git-history rewriting.
Pattern/entropy scans can miss encoded secrets and cannot prove that credentials
were never exposed outside this repository. If a real private credential is found,
revoke/rotate it before considering coordinated history cleanup.

## Validation

All service calls in browser/payment regression tests were intercepted or mocked.
Database tests used localhost-only demo projects in the Firestore emulator.

- 109 Node unit tests: passed, including origin/body/rate-limit abuse tests and
  existing finance/photo/payment implementation-preservation checks.
- Historical payment candidate's functional harness: 39 passed, zero failures;
  covers provider verification, retries, recovery and webhook behavior.
- Admin release browser regression: passed, including offline enrollment with
  cropped photo, atomic monthly payment, receipt correction, HD exports,
  logout, optional-asset failures and 16 views at five viewport widths.
- Security browser regression with real response headers: passed. Non-admin
  reads denied; malicious student text rendered as text; injected scripts/event
  handlers blocked by enforced admin CSP; passwords/private UI cleared.
- Public admission/payment browser regression: all 25 scenarios passed; exercises legacy and Cloudinary
  photos, gender choices, denied writes, upload failure, interrupted checkout and
  verification recovery. Uses the actual production service hostname in mocks
  so CSP tests reflect the configured allowlist.
- Firestore rules and finance emulator tests: public/non-admin denial, invalid
  phone/amount/photo rejection, valid legacy/private photos, two-admin receipt
  numbering, idempotency, concurrent corrections, private signatures and original
  field preservation passed.
- Optional server-history emulator regression passed with the merged rules and
  installed dependency lockfile: two-admin reads, client write denial, pagination,
  payment/correction preservation and logging failure/retry. History stays disabled.
- Windows-default-encoding release build regression passed.

Mocked checkout tests cannot validate real bank redirects, provider settings or
the entire external Razorpay SDK. No automatic claim of live compatibility is made.

## Rollout and remaining account work

1. Save the current Firebase Hosting release identifier, deployed rules and
   Cloudflare deployment identifiers privately for rollback. Git HEAD before
   this audit was `7b220b9`; that is a source reference, not proof of which version
   production currently runs. Retain private student backups outside Git/Hosting.
2. Review Firebase Authentication users, authorized domains and password policy.
   Remove unknown users/admin documents; use unique strong passwords and enable
   appropriate account MFA. Verify that only the intended two admin UIDs have
   matching `uid` and `isAdmin:true` records. Do not change valid admin UIDs blindly.
3. Register/configure App Check for the actual web app, integrate its browser
   token initialization, monitor legitimate traffic, then enforce Firestore.
   **Do not enable enforcement before the application sends valid tokens**:
   doing so would break admissions and admin access. Test both admins and check
   the payment service's IAM/server access. Check product/plan availability first;
   a protected admission gateway is the alternative.
4. Review Google browser API-key API/referrer restrictions, Cloudflare secret
   bindings, Cloudinary authenticated delivery/preset restrictions and Razorpay
   webhook URL/signature settings in their respective accounts. Never place
   secret values in browser configuration. CORS is not a credential boundary.
5. Deploy reviewed Firestore rules separately, then verify admin and public flows.
   Build frontend via `python prepare-admin-release.py`; review the generated
   `build/admin-release` candidate. Deploy Hosting only from that directory when
   approved. A Hosting deploy does not publish database rules or Worker changes.
6. Photo Worker deployment must include the new `PHOTO_READ_LIMITER` binding
   alongside the existing upload limiter. Test with a controlled image and admin
   session before releasing broadly; missing limits fail closed.
7. Keep the payment candidate on hold until the deployed-source comparison and
   isolated provider tests described in its README are complete.
8. Verify actual Razorpay checkout on the released staged visitor policy. Inspect
   browser Report-Only violations, allow only necessary provider origins, then
   separately enable the strict visitor script policy after checkout/recovery
   validation. Do not add unrestricted scripts or unsafe-eval merely to hide errors.

No development server/debug mode is introduced into the release. Test fixtures,
scanners, private backups and source credentials are outside Hosting's public
directory. The existing optional history service stays disabled on Spark.
