# Receipt refresh — preview first

From Windows CMD:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python preview-receipts.py
```

A new tab opens at a free localhost port. Look for **RECEIPT DESIGN PREVIEW**.
Keep CMD open; Ctrl+C stops the preview. If the tab does not open, copy the URL
printed in CMD. `--no-browser` prints the URL without opening it.

The three tabs show **Filled receipt**, **Blank receipt** and **WhatsApp preview**.
The image and print share the same navy ink / cream paper / warm-gold layout:

- Small email at top left: rehaancomputers881@gmail.com.
- Both cell numbers at top right: 9797205429, 9149551258.
- A classic bold serif REHAAN COMPUTERS CHARANGAM heading, followed by the
  full main-road postal address between two thin gold rules.
- Receipt number at left, date at right; Received from, Address, admission/course,
  learning month, due date, payment mode and amount in words.
- Rupee payment/received/balance boxes, signature space, a serif website footer
  and the small Learn · Practise · Grow motto.
- The old 100-rupee admission-fee footer is omitted.

Numbers 1000 and 1001 demonstrate short, bold, handwritten-style numbering.
The Caveat variable font is bundled locally under the SIL Open Font License;
see assets/OFL.txt. Source: https://github.com/google/fonts/tree/main/ofl/caveat.
No runtime font download from Google or another service is required.

The sample amount/date/number can be changed locally; Try paid in full shows the
zero-balance version. Blank receipts leave date/name/address/course/month/payment
fields and amounts empty for handwriting. Their number can be printed or left
empty too. Downloads are 3200×2240 PNG. The paper options are one A5 landscape
receipt or two blank receipts on a single A4 portrait sheet. The latter uses
sample numbers 1000/1001 when numbering is enabled.

WhatsApp preview shows the matching image and a short message using the same
sample receipt number, correct learning month, amount and remaining balance.
Copy sample message only copies local text; no chat or real message is opened.
The previous fixed payment-number instruction is absent. The two institute cell
numbers are printed as header contact details, as requested.

## Isolation and numbering

All records are fictional. This preview imports no live admin, Firebase, payment
or photo modules, uses no student JSON backup, and writes no browser storage.
The server only serves preview files and existing local fonts. A self-only CSP
blocks external resources and form submissions. No student, receipt, fee ledger,
payment record, authentication session or old receipt number is changed.

These files are outside public/ and are not part of prepare-admin-release.py.
No production renderer, receipt correction history, message template, database
rule or Hosting release is changed by this design preview.

Permanent consecutive numbering is not implemented here. After design approval,
it must be allocated safely for both administrators while retaining the original
unique payment/receipt identifiers and old records. Do not treat a preview number
or a locally printed sample as an issued live receipt.

Check: `python3 tests/receipt-refresh-preview-browser.py`. It verifies requested
copy, real handwriting font, PNG size, filled A5 and two-up blank A4 PDFs, blank
fields, WhatsApp/message consistency, mobile widths and no outbound/write calls.
