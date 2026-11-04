# Approved admin changes and website updates

Release candidate: 20261103-desk-1. Nothing is published from this workspace.

Included: compact header/search/clock, right-to-left helpful strip, all-due fee
reminders and PNG, calendar receipt review, attendance month guidance, follow-up
PNG, cancellation reason/notice after guarded deletion, monthly Reports analyser,
clickable admission-month bars, mobile Follow card, private notification service.
Clay colour study is not included.

## Notifications must be configured before this full release

The public VAPID key is configured. It is not a private credential.
Create a **dedicated service account** in Google Cloud IAM for rehaan-computers
with only the **Firebase Cloud Messaging API Admin** role. Ensure the Firebase
Cloud Messaging API (HTTP v1) is enabled. Create its JSON key and keep it locally
outside the Git checkout. Do not send it in chat, commit it, or put it in public/.

Run in Windows CMD, replacing the example path with the real downloaded key:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python setup-notifications.py
python release-admin.py --deploy
```

Setup asks for the local JSON file path (not its contents). It logs in to Cloudflare, creates a separate D1 database if not configured,
adds schema without dropping existing tables, deploys a separate Worker, stores
sender email/private key in encrypted Worker secrets and checks its health. It
does not change the photo or Razorpay Workers. If a D1 database already exists
but local config is lost, recover its binding ID from Cloudflare; do not recreate
or delete the database. Keep wrangler.local.toml locally; it is Git-ignored.

Worker health is required before the website release. The guarded release also
runs unit/rule/payment emulator checks before publishing rules and Hosting.
If any check fails, stop and share the non-secret error output. No skip flag.

## Follow semantics

- Browser permission is requested only on a deliberate Follow click.
- Registration succeeds only after server verification and persistence.
- Follower count means subscribed browsers/devices, not unique people. Stale
  tokens are removed when FCM reports them invalid; offline/delivery/read status
  is not promised. Visitors can unfollow on the subscribing browser.
- iPhone/iPad may require Add to Home Screen. Unsupported/blocked browsers get
  an explanation; they are not counted as subscribers.
- No student data is included. Subscribers are separate from Firestore records.
- Reports → Load follower count authenticates the admin against Firestore rules.
  Review each announcement and confirm sending. Sends are batches of 10 with a
  stable campaign ID; retry skips claimed deliveries. If a network crash leaves
  a send uncertain, it is not automatically resent. Creating a new campaign can
  resend to those devices; review the outcome before doing so.
- Sending cannot be recalled. Accepted by FCM does not mean delivered or read.
- The notification service worker does not intercept fetch or cache pages and
  has a narrow scope; it does not manage checkout, student photos or sign-in.

## Financial and record limits

Reminders use all mature unpaid periods, with partial balances; future periods
are excluded. Existing monthly fees/receipt keys are unchanged. Sharing does not
mark a fee paid or prove the WhatsApp message was sent. Custom fee wording still
needs the mandatory complete breakdown and amount preserved.

Delete is still permanent and removes that student's saved fee history. The
notice is not available if deletion fails. Use lifecycle cancellation instead
when records/history must be retained. Cancellation never happens automatically.

Reports are deterministic summaries of loaded records. Collections use dated
receipts, not inferred dates for old ledger totals. Balances describe current
recorded status for the chosen learning month, not historical month-end snapshots.
Unreliable records are excluded from financial totals. Admission fees, Razorpay
charges, expenses and profit/loss are not included. Missing attendance is not
absence. Refresh the register for changes made by another administrator.

## Saved next-work notes

The requested follow/updates flow, monthly analyser and admission-bar drill-down
were promoted into this release at the user's request. Later report extensions
can add reviewed expense/profit figures and verified notification analytics;
never infer either from tuition receipts or subscription counts.

## Verification performed in the workspace

- 130 unit tests passed, including reminder/report semantics, notification CORS,
  verified admin access, SQL-backed subscription lifecycle and duplicate-send guards.
- Full generated candidate browser checks passed: 16 views/five widths, offline
  student photo/add, atomic tuition payment, corrected receipt, marks and logout.
- Generated new-flow browser checks passed: reminders/PNG, late-payment receipt
  month attribution, attendance/notice, failure/success of deletion with reason,
  monthly report/drill-down and reduced motion. No production calls were used.
- Visitor Follow checks passed at three widths: no automatic permission request,
  denied/failed registration, successful mocked subscription and unfollow.
- Windows build encoding and release failure-gating checks passed.

Live browser-push delivery remains unverified until the sender service is
configured and a consenting test browser subscribes. No real notification has
been sent. Firestore emulator verification remains a mandatory local release
step; this workspace previously could not download Google's emulator.

## Notification completion check

The Cloudflare runtime entry point is tested with its real ExecutionContext
argument. Broadcast batches are limited to 10 to leave room for database and
provider requests on the free Worker tier. Seven focused notification tests pass,
including the private-browser test: it requires a verified admin plus that
browser's subscription management secret, and cannot target other followers.

After setup and the guarded website deployment, follow the homepage on your own
browser, then open Reports → Load follower count → Test on this browser. The test
sends only to your subscribing browser. Look for “the test update arrived” or the
actual device notification before publishing an announcement. Provider acceptance
alone is not delivery confirmation. Do not share the private JSON key in chat.
