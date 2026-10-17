# Rehaan student photo service

Prepared for Cloudinary cloud `salatmdv`, signed preset `ml_default`.
The public configuration ships **disabled**, preserving the current live flow
until this separate service is deployed and checked. There is no payment Worker
change, Firestore schema migration or automatic frontend deployment.

## How photos work

- Public admission form: crop/validate locally → upload private image → save
  returned reference in applications.photo → open the existing ₹100 payment flow.
- Admin offline enrolment and replacements: same crop/upload service; the
  Firebase ID token goes in Authorization and is checked through Firestore rules.
- Existing inline photos: Settings → Transfer existing photos. Download the
  original backup before starting. Photos remain visible through their new links.
- Private viewing: the Worker validates the Firebase token by reading
  admins/{uid} through Firestore REST with that token. It checks uid/isAdmin,
  signs a Cloudinary authenticated delivery URL internally, and proxies bytes
  with no-store. It has no service account and performs no Firestore writes.

Every uploaded asset uses a random UUID in the `student-photos/` public ID,
`type=authenticated`, overwrite=false and use_filename=false. These signed
parameters override the supplied preset's overwrite/filename defaults. Explicit
public IDs work with both fixed and dynamic Cloudinary folder modes; the asset
folder shown in the Media Library may differ. No student name/email/phone is
included in an asset ID. The file is a bounded JPEG (375,000 bytes, maximum 512px
in either direction), normalized to at most 360px on Cloudinary. Existing inline
or public Cloudinary URLs still work in the dashboard.

The upload route is intentionally public for applicants. CORS restricts browser
origins but is not authentication. Mandatory Cloudflare rate limiting allows ten
uploads per IP per minute per Cloudflare location; it is not a global quota or
complete bot protection. Configure account usage alerts and review abuse controls
before a wider launch. Photo reads need an authorized admin token. Unauthorized
reads cannot fall back to public delivery. Treat Cloudinary account access and
downloaded JSON backups as access to private student data.

## Deploy the separate service from Windows CMD

Stop the local preview server with Ctrl+C first. Run from your existing clone.
Node.js with npx must be installed. These commands deploy only
rehaan-student-photos; they never deploy rehaan-razorpay-live or Firebase Hosting.

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
npx --yes wrangler@4.151.1 login
npx --yes wrangler@4.151.1 deploy --config backend/photos/wrangler.toml
npx --yes wrangler@4.151.1 secret put CLOUDINARY_API_KEY --config backend/photos/wrangler.toml
npx --yes wrangler@4.151.1 secret put CLOUDINARY_API_SECRET --config backend/photos/wrangler.toml
```

Copy the API Key and API Secret from Cloudinary's API Keys area only into the
corresponding local CLI prompts. Do not put them in chat, public JS, Git, shell
command arguments or the preset name field. Secret values are not in this repo.
The initial deployment refuses uploads until both secrets have been configured.
No changes to ml_default in Cloudinary are required by this implementation.

Confirm that Wrangler's deployment URL is:
https://rehaan-student-photos.daraashiq9055.workers.dev
If your account uses another workers.dev subdomain, change serviceUrl in both
root/public photo-storage-config.js to the actual URL before testing. Keep both
copies synchronized. Confirm the account when signing into Wrangler.

Then check readiness (the Origin header is required):

```bat
curl -H "Origin: https://rehaan-computers.web.app" https://rehaan-student-photos.daraashiq9055.workers.dev/health
```

Expected: `{"ok":true,"configured":true,"uploadProtection":true}`.
This checks configuration presence, not whether the Cloudinary credentials or
preset are valid. It does not upload anything or read/write student records.

## Enable on a local preview before publishing

After deploying and checking the service, set enabled:true in root and public
photo-storage-config.js on a local preview only. Keep cloudName salatmdv.
Allowed origins currently include the two Firebase Hosting domains,
http://localhost:8000 and http://127.0.0.1:8000. Add any Hosting preview channel's
exact origin to ALLOWED_ORIGINS and redeploy this Worker before using that channel.
Wildcards are not accepted. No Cloudinary changes to Firestore rules are needed:
the existing photo string field allows the returned URL. Gender still needs the
separate additions already discussed.

Run the isolated tests below first. Check a deliberately created test photo in
the configured account and verify that its delivery type is authenticated,
random ID matches the saved reference, direct unsigned URL is inaccessible,
and the signed-in admin can see it. A local preview uses the live Firebase
project: saving through the real form/admin is a real write. Use designated test
records, do not charge real students or mark student fees paid as a test. Confirm
both upload failures and private photo delivery before enabling production.

When ready, publish the complete reviewed frontend from the confirmed live
source, including admin-app.js, script.js, photo-storage.js and
photo-storage-config.js. This repo does not automatically deploy Hosting. Do
not publish only the helper imports without both new helper/config files.

If photo storage has an outage after launch, leave private viewing configured;
disabling enabled only sends *new* photos back to the previous inline method.
Private stored references still need this service to display. Do not delete the
Worker or rotate its API secret without checking photo delivery. Cloudinary
account limits, authenticated asset support and actual preset behavior must be
verified against the deployed account; mocked tests cannot certify them.

## Existing photos and retention

The transfer feature operates on valid inline JPEG/PNG/WebP photos. It downloads
a full original backup before allowing the first transfer; each photo update is
transactional and leaves payments/other details intact. Already linked photos
are skipped. Stop/error keeps untransferred originals in Firestore; successful
transfers keep the originals in the downloaded backup. Bulk restore from that
backup is not implemented. Seven-second spacing respects the upload limiter;
100 photos will take about 12 minutes plus network time. Keep the tab open.
Student photos continue showing on the website/dashboard through the links.

Nothing deletes existing Cloudinary assets. Interrupted uploads, failed saves,
photo replacements or record deletions may leave unused private images. Review
retention and backups separately before deleting any assets. Do not run a bulk
cleanup based only on filenames or the JSON backup date.

## Local verification (no live services)

```sh
node --test tests/photo-worker.test.mjs tests/photo-storage.test.mjs tests/admin-records.test.mjs
node tests/admin-fees.test.cjs
python3 tests/admin-browser.py
python3 tests/admission-payment-browser.py
python3 tests/site-details-browser.py
npx --yes wrangler@4.151.1 deploy --dry-run --config backend/photos/wrangler.toml
```

Browser tests intercept every external service. The Worker unit tests inject
simulated Cloudinary/Firestore responses. A dry-run bundles and validates
configuration; it does not deploy, set secrets or prove account connectivity.
No real student writes, image uploads, payments, emails or messages were made
while implementing or testing this code.

## Connection check before enabling student uploads

A successful /health result confirms secret presence and the rate limiter only.
It does not verify Cloudinary credentials/preset or the Firestore admin read.
Update your local clone, start the preview server, sign in at
http://localhost:8000/admin.html and open Settings → Test Cloudinary connection.
Click Run connection test. The test works with enabled:false, so the current
student photo-storage behavior does not change during verification.

The test uploads one newly generated 360px JPEG using the signed-in admin's
ID token, verifies that the photo service refuses an unauthenticated image read,
then retrieves and decodes the image with the admin token. A successful result
shows the generated image. It never creates/edits a student or payment record,
opens checkout or sends messages. Each attempt may leave a private generated
asset in Cloudinary; there is no automatic deletion. The check covers the photo
service's signed-out access denial. Independently confirm authenticated delivery
in the Cloudinary account before production activation, as described above.

Report the on-screen result before changing enabled. Do not send API secrets,
Firebase ID tokens or real student photos. A test failure leaves normal student
upload behavior unchanged; use its error text to diagnose configuration.

## Cloudflare native fetch compatibility

A runtime issue was reproduced in the first photo-service implementation:
Cloudflare Workers rejects redirect:'error' before sending a native fetch.
The service now uses redirect:'manual' for Firestore, Cloudinary upload and
private delivery; non-success responses, including redirects, are rejected.
Credentials are never forwarded to a redirected host. Node's fetch supports
'error', so unit tests using injected responses did not expose this difference.

Run the native runtime regression locally in one terminal:

```sh
npx --yes wrangler@4.151.1 dev tests/photo-worker-runtime.mjs --local --port 8898 --compatibility-date 2026-10-17
```

In another terminal:

```sh
curl http://localhost:8898/run
```

Expected: passed:true with admin verification, signed upload, private delivery
and redirect rejection checks. All provider traffic is replaced with local HTTP
fixtures; liveProviderRequests must be zero. Never deploy that test entry as the
production Worker. After updating, redeploy only backend/photos/wrangler.toml;
existing Worker secrets do not need to be entered again. Student uploads stay
disabled until the manual connection check passes.

Failures now include a fixed PHOTO_* stage code without raw provider error text,
credentials, photo bytes or Firebase tokens. Cloudinary HTTP rejection messages
include only its status code and configuration guidance.
