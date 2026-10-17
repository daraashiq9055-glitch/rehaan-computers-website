# Admin workspace redesign

The dashboard redesign uses admin-only assets and the existing Firebase project
and applications collection. Later public-page additions change index.html and
add site-details.css for the map and creator credits. Public script.js, existing
styles, payment code, Firebase configuration and rules are unchanged. There is
no data migration or automatic database write.

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

Keep existing Firestore rules unchanged. No new rules file is deployed by this
change. Confirm that the current deployed rules authorize admin reads/creates/
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

The public page now includes a top Created by Dar Yasir badge that links to a
styled footer creator credit, preserving the Managed by Dar Yasir attribution.
A bottom location section has Google Maps buttons using the exact owner-supplied
link: https://maps.app.goo.gl/oFssNm9peFexUEix7?g_st=awb .
The embedded iframe is explicitly labeled as an area preview for Charangam,
Beerwah; the restricted cloud proxy could not resolve the short URL to coordinates
for an exact embedded pin. The saved-location links use the owner's URL verbatim.
The map is lazy-loaded, and a visible external link remains available if the
third-party embed cannot load. No Google API key or visitor location permission
is required by this page.

Public changes are isolated to public/index.html and public/site-details.css,
with matching root copies. Preserve all existing public assets and payment files
when preparing any deployment. Test with:

```sh
python3 tests/site-details-browser.py
python3 tests/admin-browser.py
```

The site test mocks the map provider, fonts and Firebase. It verifies the link
URL and new-tab behavior, creator navigation, layouts and existing course/form
startup; it does not verify Google's live map rendering or the geographic pin.
