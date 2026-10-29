# Payment security candidate — do not deploy yet

This directory is an **undeployed candidate**, not an export of the running
Cloudflare Worker. The owner cannot confirm whether production has been edited
in Cloudflare. Replacing that working service without comparison is unsafe.

Source baseline: Git blob `dbea401e5f4ffb4ca365201e82a731572ee355bc`, identical in
`origin/razorpay-live-preparation`, `origin/razorpay-working-test` and
`origin/rehaan-live-final-backup` at the time of the 2026-10-29 audit.

## Required before deployment

1. Export the currently deployed Worker source and configuration from Cloudflare.
   Keep the export and current deployment version privately for rollback. Do not
   export secret values into this repository or paste them into chat.
2. Compare its payment, recovery, webhook, Firestore and email behavior against
   the baseline and this candidate. Port the protections onto the actual live
   implementation if it differs.
3. Verify all existing secret bindings are retained. The Razorpay key ID is a
   public checkout identifier; the key secret, webhook secret and Firebase
   service account must remain Cloudflare secrets.
4. Verify the three rate-limit bindings in `wrangler.live.toml` are available and
   included. Missing bindings deliberately return 503. Confirm limits are
   appropriate for both legitimate visitors and Razorpay webhook retries.
5. Test the compared implementation with Razorpay test credentials and an
   isolated Firebase test project, including webhook retries, delayed captures,
   duplicate verification, interrupted checkout and status recovery.
6. Schedule production verification and rollback before releasing. A successful
   mocked test is not evidence that the actual provider configuration works.

Local tests make no provider calls:

```sh
node tools/payments-worker-test.mjs
node --test tests/payment-security.test.mjs
```

Protections added: exact browser origins, bounded request bodies, mandatory edge
rate limiting, generic errors, no-store responses, fixed Google token endpoint,
upstream timeouts and constant-time token comparison. Existing independent
Razorpay payment verification, webhook signatures and atomic finalization remain.
CORS restricts browsers; it is not authentication and does not stop a bot from
forging an Origin header. The application token, independent provider checks and
rate limits remain necessary.
