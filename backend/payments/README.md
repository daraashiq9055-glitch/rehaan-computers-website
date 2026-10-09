# Rehaan Payments — admission fee verification guard

One Cloudflare Worker handles Razorpay order creation, payment
verification and the finalized Firestore write. The browser never
holds a secret and can never mark an application paid.

## Endpoints

| Route | Purpose |
|---|---|
| `POST /create-order` | Verifies the drafted application via its one-time `paymentToken`, creates or reuses the single active Razorpay order for it, links the order to the application. |
| `POST /verify` | Checks the checkout signature (HMAC), then finalizes — finalization itself independently re-confirms the order + captured payment through the Razorpay API (status, amount, currency, receipt linkage) before any Firestore write. |
| `POST /status` | Reconnect/reconcile path — finalizes a paid-but-unreported application (lost internet, closed tab). |
| `POST /webhook` | Razorpay `payment.captured` / `order.paid` — signature-checked backstop. The event only names an ORDER; the application is resolved from the receipt of the order freshly fetched from the Razorpay API, never from payload fields. |
| `GET /health` | Liveness. |

Finalization is idempotent and fail-closed: the `Submitted` + paid
transition only happens inside the Worker after the Razorpay ORDER API
confirms `status=paid`, `amount_paid=₹100`, `currency=INR` and
`receipt=<application id>`, and the PAYMENT API confirms `captured` on
that exact order. Client- or event-supplied values never finalize.

Institute and student emails are tracked as INDEPENDENT channels
(`payment.notifyAdmin` / `payment.notifyStudent`, each with
`{ at, attempts, error }`, attempts ≤ 3). A delivered channel is never
re-sent; only a failed channel is retried — by the next `/status` poll
or webhook delivery.

## Manual setup (nothing here is deployed automatically)

1. **Razorpay Dashboard (Test Mode — keep until production approval)**
   - Settings → API Keys → copy Test Key ID + Key Secret.
   - Settings → Webhooks → add `https://rehaan-razorpay-test.daraashiq9055.workers.dev/webhook`
     for events `payment.captured` and `order.paid`; set a webhook secret.
2. **Firebase Console → Service accounts** → *Generate new private key*
   (JSON). Keep the file out of Git. In IAM grant the service account
   **Cloud Datastore User**.
3. **EmailJS** → Account → API Keys → create a private key. (The Worker
   reuses the existing service/template IDs — no template changes needed.)
4. **Deploy** (from `backend/payments/`):
   ```bash
   npx wrangler secret put RAZORPAY_KEY_ID
   npx wrangler secret put RAZORPAY_KEY_SECRET
   npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
   npx wrangler secret put FIREBASE_SERVICE_ACCOUNT   # paste whole JSON
   npx wrangler secret put EMAILJS_PRIVATE_KEY
   npx wrangler deploy            # deploys onto rehaan-razorpay-test
   ```
   Add `backend/payments/.dev.vars` to `.gitignore` if created locally.
5. **Firestore rules**: publish the repo-root `firestore.rules`
   (adds `Pending Payment` create + the status-only public update).
   Publish BEFORE the site deploy — old and new sites both keep working
   under the new rules; the new site does not work under the old ones.
6. **Site**: on a checkout of `website-updates` run
   `python3 tools/migrate-script-payments.py` (must report every anchor
   ✓) then `--apply`, then `node --check public/script.js &&
   node --check script.js`, commit, and deploy Hosting yourself.
   If the Cloudinary patch is also pending, apply
   `migrate-script-cloudinary.py` FIRST, then the payments tool.

## States

`Pending Payment` → (verified) → `Submitted` (payment `paid`,
`method: "razorpay"`) — or → `Pending Offline Payment` (never
auto-verified; admin marks paid at centre with `mode: "cash"`/`"upi"`,
which the dashboard/CSV label differently).

## Local tests

```bash
node tools/payments-worker-test.mjs   # 25 checks: order reuse, token
                                      # binding, forgery rejection,
                                      # idempotency, webhook HMAC,
                                      # reconciliation, email rollback
node --check backend/payments/rehaan-payments.worker.mjs
```

## Live test checklist (test-mode card / Razorpay mock)

1. Submit form → draft message, no success yet, no email arrives, modal shows "Pay ₹100 securely".
2. Pay → "Admission Application Submitted Successfully" appears only after the verify response; both emails arrive once.
3. Close checkout without paying → details stay in the form, refresh shows the resume prompt, no emails.
4. Retry from resume → same order id is reused (no double charge).
5. Pay, then kill network before the callback → refresh → /status reconciles and finalizes exactly once.
6. Webhook test-send from Razorpay dashboard after step 5 → no duplicate emails.
7. Submit with "pay at centre" path → status Pending Offline Payment; no confirmation email; dashboard shows it distinctly.
8. Forged /verify (any other app's payment, or wrong secret) → rejected 400/403.
9. Admin "Mark Fee Paid" on an offline row → CSV shows "at centre", never "razorpay".

## Known trade-offs

- `paymentToken` (UUID) in the draft document is the ownership proof;
  documents remain unreadable to non-admins by rules.
- Emails are at-most-once per attempt with bounded retry; a full
  EmailJS outage defers notification to the next webhook/poll.
- Expired Razorpay orders are replaced automatically on the next
  retry (one ACTIVE order per application at any time).
