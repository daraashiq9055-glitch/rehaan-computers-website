# Monthly status and receipt preview — 1 November 2026

This update adds only the requested monthly fee cards and receipt presentation
changes to the existing admin dashboard. It has not been deployed.

## Open from Windows CMD

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python preview-fees-receipts.py
```

Keep CMD open. The launcher opens a local address on an available port, avoiding
old servers and stale preview URLs. If it cannot open the browser automatically,
copy the exact address printed in CMD. Use `--no-browser` to print the address only.

The preview opens Fees & payments with fictional records. For **Ayaan Mir**:

1. Open **Monthly status** to see Paid, Part paid and Upcoming cards. Older unpaid
   periods remain visible. Overdue balances are called out; the cards do not
   count admission payments as tuition or change due dates.
2. Use **View receipts**, then receipt **1000**, to see the new professional type,
   small top-right sample photo and bottom-right authorised signature.
3. **Edit / correct receipt** includes a background colour picker with an instant
   local preview. Saving requires the existing correction confirmation/reason.
   A colour-only save records appearance history without updating any ledger
   amount. Actual amount corrections retain their existing transaction checks.
4. Check Print, PNG download, WhatsApp image preparation and blank slips. The
   existing WhatsApp workflow prepares an image and a draft; it does not attach
   or send automatically.

The sample image is a labelled fictional avatar. No live Firebase, Cloudinary,
Razorpay or messaging service is used. Reloading discards all demo changes.

## R signature

Receipts reuse only `authorized` from the existing private mark-card institute
settings—the R signature. They never use the examiner/Y signature. Student photos
come from the existing admin-only photo loader, including private Cloudinary
references and supported legacy inline images. Neither image is copied into the
saved receipt or published as a static asset.

The local preview reuses already-unlocked files under
`private-assets/mark-signatures`. These remain ignored and are not served directly.
If the local preview has no signatures, load the cleaned R PNG through the existing
Mark Cards → Institute signatures control; that save stays in demo memory.
Production will read its existing private saved signature settings after a later,
approved deployment. Missing signatures are explicitly reported; failing photo
or signature loads block export rather than silently dropping a saved image.

## Validation

- 113 Node unit tests passed, including ledger projection, escaped content,
  invalid colour rejection and colour-only correction/payment preservation.
- Full generated admin candidate browser regression passed, including offline
  student creation, payment recording, receipt correction, mark cards and logout.
- Browser security regression passed under the actual candidate security headers.
- Feature browser regression passed for all three monthly statuses, mobile
  layout, photo and authorised-only signature in screen/3200×2240 PNG/print/
  WhatsApp preview, one-page A5 output, blank signatures, and failed-photo export
  blocking. Tests intercepted external requests and used no live records.
- Windows encoding build regression passed. Private signature bytes are absent
  from generated Hosting files.

No Firestore rules, payment Worker, Razorpay validation, admission billing or
receipt numbering changes are part of this feature. Existing security audit
deployment prerequisites still apply. Review the preview before deploying;
do not replace the live payment Worker with the unverified historical candidate.

## Receipt readability and receipt search refinement

The updated receipt uses a smaller number, stronger heading and bolder institute
address/detail text in screen, A5 print and PNG output. Photo, authorised R
signature, paper colours, receipt identity and saved amounts are retained.

In **Fee Statements**, enter `1000` in the **Receipt number** filter to find the
student linked to that exact saved receipt. Matching receipt numbers and amounts
appear beside the student. Older letter-based receipt numbers also work, ignoring
case and surrounding spaces. The general search accepts receipt-number fragments.
Use **Payment position → Has recorded payments** for students with recorded
tuition payments, including partial payments. Filters combine; Reset filters clears
receipt lookup too. This searches loaded saved receipts without reading a new
collection or changing payments; refresh records for newly recorded receipts.
Older ledger payments without receipt events do not gain invented receipt numbers.

Validation for this refinement: 114 unit tests, receipt/media/one-page A5 browser
checks, exact/legacy/general receipt lookup, combined filters, reset, summary/CSV
and pagination at four widths, full admin candidate and Windows build checks passed.
No deployment was performed.
