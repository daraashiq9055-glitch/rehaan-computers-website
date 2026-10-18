# Rehaan Computers: next dashboard features

A working design preview with ivory paper, forest green, brass accents and locally bundled Inter / Playfair Display fonts. This branch does not implement these features in the live admin dashboard. All files are outside Firebase Hosting's `public` directory.

## Open on Windows using CMD

Run these commands in a new CMD window. This uses a new folder, keeping your existing `rehaan-admin-preview` checkout separate.

```bat
cd /d "%USERPROFILE%"
git clone --single-branch --branch preview/next-features-cmd-2026-10-18 https://github.com/daraashiq9055-glitch/rehaan-computers-website.git rehaan-next-preview
cd rehaan-next-preview
python -m http.server 8001 --directory previews/next-dashboard
```

Leave that CMD window open. In your browser, enter:

```
http://localhost:8001
```

No login or Firebase deployment is needed. To stop, press Ctrl+C in CMD. If Python's command is `py` on your computer, use `py -m http.server 8001 --directory previews/next-dashboard` instead.

To reopen later:

```bat
cd /d "%USERPROFILE%\rehaan-next-preview"
python -m http.server 8001 --directory previews/next-dashboard
```

To get later changes, stop the server and run `git pull --ff-only` from this folder before restarting it. Do not run a Firebase deploy for this preview.

## Things to try

1. **Overview → Preview blank receipt.** Compare a single A5 landscape receipt with two blank receipts on one A4 sheet. Name, date, receipt number, month and amounts are blank for handwriting.
2. **Payments & receipts → Ayaan Demo → Record payment.** Try ₹400. The new receipt shows ₹400 received now, ₹600 received in October and ₹399 remaining. Try ₹1000 first to see overpayment validation without changing the record. Open older receipts from the ledger to see their original balance at issue.
3. **Filled receipt → WhatsApp draft.** Review the name, receipt reference, payment date, fee month, amount, current month total and current remaining balance. The link opens WhatsApp's recipient chooser with a draft. You must choose a recipient and send it yourself. Use only a test recipient while reviewing.
4. **Import students → Try sample import.** Two rows are valid and one duplicates an existing admission number. Review the rows, tick the confirmation and import the valid sample profiles. No payments are imported. Opening fees are flagged for review.
5. **Activity history.** Filter sample payment, import, assessment and certificate events. Open Details to see who performed the action, time, reference and recorded values. This is an in-memory demonstration, not a persistent production audit log.
6. **Monthly reports.** Change month, inspect billed/received/outstanding totals, export CSV or print a report. The opening October data is ₹2,997 billed, ₹1,199 received and ₹1,798 outstanding. After the ₹400 example, received is ₹1,599 and outstanding ₹1,398.
7. **Assessments.** Edit component marks. Unmarked components stay incomplete; a failed component prevents certificate preparation even when the overall percentage is high.
8. **Mark cards & certificates.** Select a student, print the detailed A4 mark card, then select Certificate of achievement. Tick the review approval, prepare a sample certificate and print the landscape A4 document. Editing marks requires a fresh certificate review. Zoya's initial practical mark deliberately fails; edit it to explore eligibility.

Reloading the browser or clicking Reset sample data clears your preview changes.

## Printing and PDF

Click the print button inside the preview, rather than printing the dashboard itself. Choose a printer or Microsoft Print to PDF / Save as PDF. Use the requested paper size: A5 landscape for one receipt, A4 portrait for two receipts, reports and mark cards, A4 landscape for certificates. Turn off browser headers/footers and enable background graphics for the intended design. Use actual size / 100% where supported. Browser-generated PDFs were tested; physical printer margins depend on your printer.

Printed preview documents are labeled DESIGN PREVIEW. Blank receipts have room for a handwritten authorized signature; filled receipts retain the balance at the time of that payment. WhatsApp drafts deliberately label the latest balance as current.

## CSV / Excel import

Excel users: Save As **CSV UTF-8**, then upload the CSV file. Native `.xlsx` uploads are not supported in this prototype. Download the template in the Import students screen.

Required headers, in any order:

```csv
admission_number,name,phone,course,batch,gender
DEMO/006,Example Student,9999900006,Computer Diploma,Morning,female
```

Gender values: blank, `male`, `female`, `other`, `prefer_not_to_say`. A phone must contain exactly ten digits. Admission numbers must be unique, ignoring letter case. Files are limited to 2 MiB and 1,000 rows. Quoted fields, commas inside quotes and UTF-8 BOM are supported. Extra columns, including payment columns, are rejected. Invalid rows are explained and skipped; valid rows require explicit confirmation before adding. Exported CSV cells are protected against spreadsheet formula prefixes.

## Deliberate preview limits

- Fictional profiles only. Changes exist only in browser memory, with no localStorage persistence.
- No Firebase, Firestore, Cloudinary, worker, payment gateway, SDK or account credentials are used. The CSP blocks application network connections; fonts are local. Only a user-clicked WhatsApp draft link leaves the preview.
- No charge, refund, real student import, real receipt issuance or production record update takes place.
- Monthly fee ₹999 and assessment rules are sample values. Production implementation must use each student's real fee schedule, balances, permissions and the institute's approved academic policy.
- The certificate grade is A+ from 90%, A from 75%, B from 60%, C from 45%, D from 33%, and all components require at least 33%. It is a sample institute document.
- Attendance and staff roles are outside the requested preview.
- Integration into Manage Payment, persisted audit history, atomic payment writes, server-side authorization and live-data regression tests belong to a later implementation after design review.

## Validation

Pure model checks (Node 22 or later):

```sh
node --test previews/next-dashboard/model.test.mjs
```

Browser checks use Python Playwright, Chromium at `/usr/bin/chromium`, and PyMuPDF:

```sh
python3 previews/next-dashboard/browser-test.py
```

The browser suite blocks external services and all network writes, intercepts the WhatsApp draft, tests payments/imports/reports/academic documents, checks responsive sections, and generates print PDFs/screenshots under `/tmp/rehaan-next-preview-checks`. It does not contact the live site.
