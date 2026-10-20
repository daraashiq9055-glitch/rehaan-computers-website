# Server-controlled application history (not deployed)

This separate Firebase Functions v2 codebase observes `applications/{id}` writes
and creates immutable `applicationAudit/{eventHash}` entries. It never writes
student records, receipts, fee balances, administrators or payment-provider data.
The normal Hosting configuration and currently published admin are unchanged.

The separate admin release builder includes a read-only history view, real SDK
reader and pagination. History is **disabled by default** until this backend is
deployed and verified. It never falls back to the browser's design-demo journal.

## Guarantees and limits

- The event's trusted Firestore auth context supplies the principal and type.
  Client fields such as `updatedBy` cannot impersonate the audit actor. Missing
  identity is explicitly unavailable. Service-account/payment-server changes
  identify that service principal; an API key is not presented as a named admin.
- SHA-256 of project/database/event ID is the document ID. Atomic `create()`,
  rather than `set()`, makes concurrent deliveries and retries idempotent.
  An already-existing entry is left unchanged. Other failures propagate for retry.
- Create, update and delete events retain operation, event time, recorded time,
  changed fields and bounded before/after values. Deleted students remain
  identifiable by application ID and logged profile changes. For updates, only
  changed fields are copied. Unknown top-level values, tokens, Aadhaar values,
  provider response payloads, credentials and image contents are excluded or
  redacted. Photo changes retain presence and a fingerprint, not a viewable image.
  Private notes/profile values are still private student data.
- Receipt/monthly-ledger updates include affected entries rather than copying the
  entire historical register each time. Oversized/deep values are explicitly
  summarised or omitted to stay below Firestore's document size limit. The log is
  **not a restorable student/photo backup**; keep existing private backups.
- Candidate rules allow only valid `admins/{uid}` records to read. Lists require a
  limit of at most 100. Every browser client, including both admins, is denied
  log creation, editing and deletion. Cloud project owners/server IAM principals
  can still change the database; this is not external tamper-proof archival storage.
- Logging is asynchronous, with bounded platform retries and possible delayed or
  out-of-order delivery. A student/payment commit does not wait for logging and
  is never rolled back or repeated by this handler. Monitor failures and delivery
  backlog before retry retention expires. There is no automatic gap repair or
  fabricated history for events before activation.
- The view pages 30 events, optionally filtered by exact application ID. Exports
  explicitly contain only loaded pages. Late events appear after Refresh. Times
  are displayed in India time; stored occurrence times are normalised UTC ISO.
  In-flight reads cannot repopulate a signed-out session or replace another page.

## Prerequisites before a deployment review

1. The owner confirmed **Firestore location `asia-south2`** and **Spark** on
   20 October 2026. The non-secret `.env.example` records that intended region.
   Confirm the target region supports this trigger before deployment; the function
   parameter deliberately has no silent default.
2. The confirmed Spark plan blocks this backend deployment. Cloud Functions deployment needs
   Blaze and the required Google Cloud APIs/IAM permissions. Do not change the plan
   or provision billable resources without the owner's approval. No plan change
   was made by this work.
3. Use the Firebase-managed server runtime identity, or a reviewed dedicated
   service account with only required permissions. No service-account key,
   Cloudinary secret or payment credential belongs in browser files or this repo.
4. Compare candidate `backend/audit/firestore.rules` with the current deployed
   rules. Its only addition to the repository baseline is `applicationAudit` read
   access. Rebase that additive block if any live rule changed independently.
5. Export/review the currently deployed Firestore indexes and **merge** the audit
   index/exclusions from `firestore.indexes.json`. The supplied file describes only
   this feature, not a complete inventory of existing production indexes. Never
   approve deletion of unrelated indexes during a deployment.
6. Agree retention with the two admins. No automatic TTL/deletion is configured.
   Restrict access to exports, enable usage alerts, and monitor trigger failures.

## Local verification without production access

Node 22 is the selected server runtime. The dependency lockfile is committed.
Python 3.11+, curl and Java 21+ are required for the pinned official emulator.

```sh
npm ci --prefix backend/audit --ignore-scripts
node --test tests/application-audit.test.mjs
python3 tests/setup-firestore-emulator.py
java -Duser.language=en -cp /tmp/rehaan-firestore-emulator/cloud-firestore-emulator.jar com.google.cloud.datastore.emulator.firestore.CloudFirestore --host=127.0.0.1 --port=8088 --rules=backend/audit/firestore.rules --project_id=demo-rehaan-audit
```

In a second terminal:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8088 node tests/application-audit-emulator.mjs
python3 tests/admin-candidate-browser.py
```

The emulator test refuses a different host and always uses `demo-rehaan-audit`.
It tests the actual Firestore Admin/client SDK, candidate security rules,
idempotent log persistence, read pagination, denied client edits and preservation
of committed payments during a simulated logging failure. Auth-context events
are supplied explicitly by the test; this is **not** proof of deployed Eventarc
delivery, production IAM or real principal attribution.

Before enabling history in a live UI, a separate test project must demonstrate
actual trigger delivery for both admins, a public application, a server payment
update and deletion of a designated test record. Verify authentic principal IDs,
create/update/delete coverage, duplicate delivery/retry, private access, and
monitoring. If the platform reports a shared or unavailable principal, do not claim
it identifies which admin saved; resolve attribution through a server-authorised
write path before relying on per-admin audit identity. Never trust `updatedBy`
as a substitute. Do not use real students or real charges for these checks.

## Deployment boundary

`firebase.audit.json` is a **separate, explicit** backend configuration. It has
no Hosting target. Default Hosting deploys cannot install this backend or rules.
No backend, rule, index, API, billing or runtime identity was deployed/changed.
After the prerequisites and test-project checks above, prepare a specific reviewed
backend deployment and enable the generated frontend with `--audit-ready` only
after those checks pass. Rolling back Hosting does not delete stored audit entries;
disabling the trigger stops new logs without changing students or payments.

Official APIs: Firebase Functions `onDocumentWrittenWithAuthContext`, Firestore
Admin SDK `DocumentReference.create`, Firebase security rules and query limits.
