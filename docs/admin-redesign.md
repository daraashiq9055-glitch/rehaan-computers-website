# Admin workspace redesign

The dashboard redesign uses admin-only assets and the existing Firebase project
and applications collection. Later public-page additions change index.html and
add site-details.css for the map and creator credits. Optional gender changes
application capture and its field allowlist. The separately configured Cloudinary
integration changes photo storage only; payment logic and Firebase configuration
are preserved. There is no automatic database write or migration on page load.

## Feature baseline

The selected app-version checkout contains an older admission list. The admin
operations and full student schema were taken from website-updates commit
d738bb2dc62efdad039318349e9536d05791b17d (16 October 2026), with its admin logic
isolated into admin-app.js. This preserves offline enrolment, photographs and
cropping, details and single-field edits, admission numbers, approval, admission
fees, monthly tuition, partial payments, WhatsApp confirmations and reminders,
and deletion. It uses the existing applications and admins collections.

Overview counts and charts come from loaded records. Course and batch directories
combine the existing catalog/assignments with legacy course names and open the
appropriate student register. They do not introduce writable catalog collections
or alter the public course catalog. Student course/batch assignments are editable
in Details. Reports include filtered CSV and a full private JSON backup with IDs
and all stored fields. There is intentionally no bulk restore/import button.

## Data protection

- Firebase email/password authentication and admins/{uid} authorization remain
  required. Sessions use in-memory persistence, ending on page reload.
- Reads do not use orderBy(createdAt), which would omit older records without
  that field. ISO and Firebase Timestamp dates are sorted locally.
- Edits update only changed fields, retaining unknown legacy fields. Payment
  updates use dotted paths to preserve provider metadata. Transactions reject
  changes to fields edited by another administrator since the record was loaded.
- Monthly payments use transactional ledger updates, retaining existing periods
  and rejecting stale totals rather than silently replacing them.
- Admission numbers are checked against a fresh register. Offline records use a
  deterministic document ID to prevent duplicate offline submissions. This is not
  a global uniqueness constraint for simultaneous approvals of different online
  records by multiple administrators: that needs server-enforced number
  reservation and reviewed rules/backend changes.
- Saving offline enrolment requires explicit confirmation of receipt of the
  existing Rs.100 admission fee. Successful forms cannot be submitted twice.
- Pending-application deletion uses a clear on-page confirmation. Enrolled records
  additionally require typing their admission number/name. The same transaction
  protects both flows; errors stay visible and cancellation keeps the record.
  Record comparisons ignore map key order while detecting real data changes.
  There is no automatic deletion or cancellation.
- WhatsApp opens a personalized draft. A reminder is recorded only after the
  administrator confirms they pressed Send. There is no automatic messaging.
- Approval email uses the existing EmailJS service and approval template name.
  Failure is reported separately from successful approval. The template
  template_rehaan_approval must exist in the institute's EmailJS account; this
  cannot be verified from repository source or mocked tests.
- CSV values are quoted and spreadsheet formulas neutralized. Stored HTML and
  image values are constrained/escaped. Private data is cleared on logout.

## Validation

From the repository root:

```sh
node --test tests/admin-records.test.mjs
node tests/admin-fees.test.cjs
python3 tests/admin-browser.py
```

The browser test needs Python Playwright and Chromium (available in this cloud
environment). It serves public on an ephemeral local port. Every Firebase call
and EmailJS load is intercepted; all other external traffic is blocked. Fixtures
cover authorization, legacy records, filters, editing, concurrent changes,
approvals, offline enrolment, duplicate numbers, payments, reminders, exports,
permission failures, mobile navigation and logout. Screenshots are saved under
the ignored tests/artifacts/ directory. These checks do not prove deployed
Firestore permissions or external email/WhatsApp delivery.

## Review and deployment

Do not deploy the complete older app-version public folder over the live site.
The live website may contain newer homepage and payment features. First confirm
the branch/commit that produced the current live Hosting release.

Apply just these admin files on top of that confirmed live source:

```
public/admin.html
public/admin-app.js
public/admin-records.js
public/admin-dashboard.css
public/admin-gold.css
public/admin-login-effects.js
public/photo-storage.js
public/photo-storage-config.js
public/admin-fonts/
```

Matching root copies are included because this repository keeps root/public
mirrors; Firebase Hosting is configured to serve public. The deployment artifact
prepared in /workspace/admin-redesign-overlay.zip contains only these admin
public/ assets. It is an overlay, not a full Hosting deployment folder.

Before replacing the live dashboard, use a Firebase Hosting preview channel from
the full current live source and sign in with the existing administrator account.
Verify the loaded student count and representative details against the existing
dashboard. Download and securely store a JSON backup before any real record edits.
An authorized read-only check is still required: this workspace's outgoing proxy
denied Firebase/Hosting requests, and no administrator login was supplied.

Apply only the optional gender additions described below to existing rules.
Cloudinary uses the existing photo field and needs no new Firestore permission.
No rules file is deployed by this implementation. Confirm that the current deployed rules authorize admin reads/creates/
updates/deletes; permission errors must be resolved before release. Validate any
write against an emulator or a deliberately created test record, rather than a
real student's data. Do not test email delivery using a student's address.

No production deployment, live record read/write, email delivery, or WhatsApp
message send has been performed as part of this implementation.


## Gold design and navigation update

The login and workspace now use the public site's black/gold palette, bundled
Inter and Playfair Display fonts, larger register text, and high-contrast tabs.
The four summary cards navigate directly to students, pending applications,
courses, and batches. Register tabs reset stale filters and support arrow keys,
Home, and End. Passwords remain masked with no Show/Hide control. The animated
learning artwork and soft panel light honor reduced-motion preferences.
Fonts are served locally with the admin assets, so they do not require Google
Fonts network access. Preserve the included font license notices when copying.

The browser suite covers the pending record name Cloudinary Test Student in its
isolated fixtures, including cancellation, denied deletion, a concurrently changed
record and reordered Firestore maps. It does not delete the live record. If the
live action is denied by deployed Firestore rules, the dashboard reports that
error; this UI change does not bypass permissions or modify the deployed rules.

For an existing Windows preview clone, stop the server with Ctrl+C, then run:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python -m http.server 8000 --directory public
```

Open the local admin page and use Ctrl+F5 to refresh cached styles. The preview
still connects to the live Firebase project, so real data edits are real writes.


## Learning-focused login artwork

The login illustration now centers on learning: an open book, lesson cards, and a
Learn / Practice / Grow path inside a laptop. Decorative animations include a
floating laptop/book, moving lesson cards, a light path and a gentle mouse-driven
tilt. The form stays stationary. The Pause Motion button has been removed at the owner's request;
reduced-motion device preferences still disable the decoration automatically. The password remains
masked and there is no Show/Hide control. admin-login-effects.js is a standalone
visual module with no credential, database, or payment access.


## Public location and creator details

The public page includes a top Created by Dar Yasir badge linking to a styled
footer creator credit, preserving the Managed by Dar Yasir attribution. Large
pill-shaped Instagram, Facebook and Official Facebook Page links remain in the
footer. The official page is https://www.facebook.com/share/14tvvFj3od1/ .

The location section is hidden initially. A normal click on the footer map link
reveals it, loads the map iframe for the first time and scrolls to its heading.
The footer toggle, Hide Map control and Escape key can close it. The embedded
map uses the owner-supplied coordinates 34.026895, 74.643088 rather than an area
search or app-style short link.

Open Google Maps opens this standard browser directions link in a new tab:
https://www.google.com/maps/dir/?api=1&destination=34.026895%2C74.643088&travelmode=driving&dir_action=navigate

The origin is omitted so Maps can use the visitor's current location. Maps may
need location permission or a manually selected start point. Google chooses its
recommended driving route; the website does not guarantee the mathematically
shortest route. A separate View Exact Pin link opens a coordinate search. No
geolocation permission is requested by our website, and no Google API key is
needed. Without JavaScript, the footer link opens directions directly.

Public changes are scoped to public/index.html, public/site-details.css and
public/site-details.js, with matching root copies. Existing public assets,
admissions scripts, payment code and Firebase rules are preserved. Test with:

```sh
python3 tests/site-details-browser.py
python3 tests/admin-browser.py
```

The public test mocks Google Maps and verifies reveal/hide behavior, no map load
before a click, exact destination parameters, popup behavior, keyboard controls,
creator navigation, mobile/tablet/desktop layouts, existing course/form startup
and the no-JavaScript fallback. It does not calculate routes or certify Google's
live services. No student writes, payments, emails or message sends occur.

## Optional gender and storage capacity

The main form now offers Male, Female, Other and Prefer not to say. Leaving it
blank omits the field from the new public record. Existing records need no
migration. Active admin details, editing, offline admission and CSV export use
the same options and readable labels. Untouched legacy values survive edits.
Only application capture/validation and the optional-field allowlist changed;
the Razorpay order, verification, resume and reconciliation implementation is
unchanged. Cloudinary upload and an administrator-started existing-photo transfer
are prepared separately below; they remain disabled until the service is configured.

100 student records is a modest Firestore dataset. The dashboard currently adds
students individually; there is no bulk spreadsheet importer. Capacity depends
on actual document sizes, reads/writes and the project's plan, rather than a
100-student limit. Firestore's document limit is 1 MiB. This preview still stores
cropped base64 images in documents; moving photos to Cloudinary can reduce
Firestore document size and read traffic. Only photo URLs/public IDs should be
stored in Firestore after a separately reviewed integration. Cloudinary API
secrets must stay on a server, and photo access controls must reflect that
student photographs are personal data. Do not assume an ordinary public image
URL provides private access.

### Production rollout gate

The deployed rules have not been retrieved or verified. An existing allowlist
that excludes gender will reject selected-gender applications before checkout.
Compare the *currently deployed* Firestore rules and apply only these additions:
add `"gender"` to public allowed keys, and add this optional value check:

```text
&& (!("gender" in d) || d.gender in ["", "male", "female", "other", "prefer_not_to_say"])
```

Keep the existing admin authorization and payment protections. Do not overwrite
unknown production rules wholesale with this checkout. Verify the merged rules
in an isolated emulator first, publish the reviewed rules before the frontend,
and verify a controlled admission using a payment test environment. No rules,
frontend or backend deployment and no live student/payment writes were made here.

The emulator download was blocked by this environment's network proxy (403 from
storage.googleapis.com), so the new rules tests remain **unexecuted**. They cover
optional/valid/invalid gender values, public read/update/delete denial, forged
paid/payment metadata rejection, privileged-field injection, and admin edits of
legacy records while preserving the payment map. On a machine with Java 21+
and access to Firebase's official emulator downloads, from the repository root:

```sh
npm install --prefix /tmp/rehaan-rules-check --no-audit --no-fund --ignore-scripts firebase-tools@15.34.0 @firebase/rules-unit-testing@6.0.0 firebase@13.0.0
NODE_PATH=/tmp/rehaan-rules-check/node_modules /tmp/rehaan-rules-check/node_modules/.bin/firebase emulators:exec --only firestore --project demo-rehaan-gender --config tests/firebase-emulator.json "node tests/firestore-gender.test.cjs"
```

This command uses a demo project and localhost only. It does not need production
credentials. The test refuses to run without the expected localhost emulator.

Additional isolated regression checks:

```sh
python3 tests/admission-payment-browser.py
node --test tests/admin-records.test.mjs
node tests/admin-fees.test.cjs
python3 tests/admin-browser.py
python3 tests/site-details-browser.py
```

Admission tests intercept every external request. They exercise all gender
choices and omission, Firestore permission rejection before order creation,
₹100 checkout, verified success, cancellation/resume without creating a second
order, and accepted verification followed by status reconciliation. Services are
simulated, so passing results do not certify the deployed payment Worker,
Razorpay settings or production Firestore rules.

## Cloudinary preparation (not an upload integration)

The active dashboard can now display standard HTTPS `res.cloudinary.com`
raster-photo URLs stored in the existing `photo` field. Inline photographs
continue to work. Register thumbnails, details, full-size viewer, CSV photo
presence and JSON backup use the same validation. Other hosts, HTTP URLs,
credentials, SVGs, query strings and HTML injection are rejected. This first
step supports conventional JPG/PNG/WebP URLs, including signed delivery paths;
it does not implement private-photo authorization or generate delivery tokens.

With photo-storage-config.js left disabled, the form and offline/photo editor
continue saving cropped inline photos. No existing images were migrated, no Cloudinary service
was contacted and no payment code or Firestore rules were changed in this step.
The account-specific service is now prepared for Cloud Name salatmdv and signed
preset ml_default; see backend/photos/README.md for activation. A protected upload backend and appropriate student-photo access policy
must be configured before enabling Cloudinary uploads; never put an API Secret
in public JavaScript. The admin browser fixture covers Cloudinary thumbnails,
details, viewer and backup with an intercepted image response only.


## Signed Cloudinary photo storage and existing-photo transfer

See [photo service setup](../backend/photos/README.md). The separate Worker is
prepared for cloud salatmdv and signed preset ml_default. API key/secret stay in
Worker secrets. New online applications, offline enrolment, replacement photos
and the administrator-started transfer use the same service. Firestore's photo
field stores an authenticated Cloudinary reference when enabled; the admission
payment code is byte-identical to the preceding preview. Upload failure leaves
the form/old record intact and does not create a payment order.

Private photographs are served through the separate Worker after Firestore
verifies the administrator's Firebase ID token and authorizes admins/{uid}.
The browser receives a temporary object URL; signed Cloudinary delivery URLs
and API credentials are never returned. Signing out revokes cached object URLs
and prevents outstanding requests from repopulating the interface. Previously
public Cloudinary URLs and inline photographs continue displaying as before;
legacy public URLs are not made private retroactively.

Settings has an existing-photo transfer action, available after storage is
enabled. It requires downloading a full original JSON backup before transfer.
Only valid inline raster photos are candidates; existing linked URLs are skipped.
Each image is normalized to 360px JPEG, uploaded, then photo and standard audit fields are updated in
a transaction that checks for concurrent changes. Fees, metadata and other
student fields remain untouched. A failed image/write stops the batch. Reopening
skips already transferred records, so a partial batch can resume. Requests are
spaced seven seconds apart, so 100 photos take roughly 12 minutes plus upload
latency. Keep the tab open. Stop after current photo cancels further work. Modal
close is blocked while running; sign-out stops further writes. The original
photos remain in the downloaded backup, rather than duplicated in Firestore.
The interface continues displaying transferred photos through their references.

Photo assets are not automatically deleted when replacing/deleting student
records. Failed Firestore writes, abandoned forms and lost upload responses can
leave unused private assets in Cloudinary. Keep backups and review asset
retention separately; this implementation does not run a destructive cleanup.
No existing student photos or records were migrated from this environment.

The expanded admin test runs with Cloudinary disabled and simulated-enabled,
including private viewing, offline upload, replacing photos, logout cleanup and
migration backup/denied-write/resume while retaining fee/provider metadata.
The admission test runs 17 scenarios across old and Cloudinary storage, including
upload failure before application/order creation. Unit tests cover upload
signing, file/size/dimension limits, origin/rate checks, admin verification,
restricted delivery paths, stale-session responses and upload retry caching.
Cloudinary signature generation was also compared with official Node SDK 2.11.0.
Wrangler 4.151.1 dry-run validated configuration/bundling; it did not deploy.

A manual Settings → Test Cloudinary connection action now works while student
Cloudinary uploads are disabled. It uploads a generated test image, checks
signed-out service denial, fetches/decodes the image as an admin, and displays
the result. It never writes student/payment records or starts checkout. The
browser test simulates upload failure, denied admin viewing, unexpectedly public
service access, and success in both feature configurations. A passing /health
alone is not sufficient to enable student uploads.

The photo Worker now uses Cloudflare-supported manual redirect handling. The
previous redirect:error option was reproduced as a runtime exception in Workers,
even though Node accepted it. The added local Workers test exercises actual
native HTTP requests (local provider fixtures), upload/private viewing and
redirect rejection. It is an extra runtime check beyond unit mocks and dry-run
bundling. Redeploy the separate photo Worker after pulling this fix; no new
secrets, Firebase rules changes, Hosting deployment or data migration is needed.
