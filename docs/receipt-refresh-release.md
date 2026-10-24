# Approved receipts and Fee Statements — 20261024-admin-10

This release integrates the approved serif receipt heading, ruled postal address,
contact details, handwritten receipt numbers, amount words, gold totals and
website/motto footer. Filled print, blank print, HD PNG and WhatsApp drafts share
the same presentation and learning-month labels as fee reminders. Corrected
receipts explicitly retain their balance-at-correction label, date and note.
The separate Fee Statements tab and all previous dashboard tools are included.
The visitor homepage and Razorpay admission flow are retained.

## Numbering and data

New monthly payments receive 1000, 1001, … from `receiptCounters/tuition`.
The counter increment, monthly ledger increment and saved receipt commit in one
Firestore transaction. Two administrators share the counter. Callback retries,
repeat submission and lost-acknowledgement recovery reuse the saved receipt ID;
they do not create another payment or consume another number. Inaccessible or
invalid counters abort the entire save. The counter is created on the first
successful new payment, without a migration script or manual initialization.

Original receipt IDs remain immutable; historical long receipt numbers are kept.
Corrections retain the receipt number and existing audit history. Old receipt
snapshots without an address display a dash rather than inventing an address.
New receipts retain the student's address at payment time. Blank slips leave the
number empty for handwritten completion; merely printing a slip never records a
payment or consumes a saved number. WhatsApp opens a draft for the saved student
mobile; the administrator attaches the downloaded image and sends it manually.

The only rules addition grants verified admins access to this one counter.
Creation starts at 1000; updates cannot decrease it or skip forward. A no-op is
allowed so optimistic concurrent transactions can reach their version check and
retry. Public access, listing and deletion are denied. Existing application,
public admission/payment validation and admin identity rules are unchanged.

## Windows deployment

These instructions supersede Hosting-only instructions for earlier releases:
the new counter rules must be published **before** the new payment interface.
From the existing checkout, preserve the private dashboard backup if needed and
run:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
npx --yes firebase-tools@15.34.0 deploy --only firestore:rules --project rehaan-computers
```

Continue only after that command reports Deploy complete:

```bat
python prepare-admin-release.py
cd build\admin-release
type RELEASE.json
npx --yes firebase-tools@15.34.0 deploy --only hosting --project rehaan-computers
```

Expected version: `20261024-admin-10`; `auditEnabled` remains false.
This publishes rules and website files; it does not replace student documents,
reset ledgers, migrate photos, charge/refund money or send messages. It does not
require Blaze or enable the separate general-history backend.

Open the live admin with Ctrl+F5 after deployment. Check Fee Statements against
an existing student's ledger, then preview an existing receipt and blank slip.
Use the next legitimate monthly payment to verify the saved short number;
do not create a fictitious payment in live student records.

For frontend rollback, use Firebase Console > Hosting > Release history > the
previous release > Roll back. Keep the additive counter rule and existing
counter; never delete or reset it or restore stale JSON over newer payments.
Previous code can still read the new receipt and ledger fields. The pre-change
source is commit `d65c6bb`; the code backup tag is
`backup/before-receipt-statement-20261024`.

## Validation

- Real Firebase SDK and local Firestore rules emulator: first-use concurrent
  allocation, two admins, idempotent retries, counter denial atomicity, rejected
  public/reset/skip writes, original-field preservation and receipt corrections.
- Generated release browser: both sign-in links, all 16 views at five widths,
  offline student/photo, payment number 1000, correction history, 3200×2240 PNG,
  mark cards and sign-out; optional asset failures do not block sign-in.
- Receipt browser: A5 print, two A4 blanks, filled/corrected/blank image/message,
  saved mobile targeting and denied writes.
- Fee Statements browser: full ledger totals, filtered directory, pagination,
  full image/print/CSV, saved-mobile draft, stale records and logout guards.
- Public admission/payment/photo regression and baseline fingerprints.

Automated tests use fictional fixtures and localhost/intercepted services. They
make no live student, payment, photo-upload or message writes.
