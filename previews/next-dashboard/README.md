# Rehaan Computers: dashboard preview

A disconnected working preview of the previous dashboard sections plus proposed new tools. Charcoal and champagne gold match the institute website; receipts use warm yellow/gold stationery. Mark cards retain their light green/ivory colours with larger text. Certificates and attendance are excluded.

This branch does not deploy or replace the live dashboard. All preview files live outside Firebase Hosting's `public` directory. The original admin files, Firebase configuration, Firestore rules and backend are unchanged.

## Update an existing Windows preview

In the CMD window running the server, press **Ctrl+C**, then run:

```bat
cd /d "%USERPROFILE%\rehaan-next-preview"
git pull --ff-only
python -m http.server 8001 --directory previews/next-dashboard
```

Leave CMD open. In your browser, open **http://localhost:8001/index.html** and press **Ctrl+F5**. Do not open `/admin.html`: that file belongs to the live dashboard, not this preview.

## First-time setup

```bat
cd /d "%USERPROFILE%"
git clone --single-branch --branch preview/next-features-cmd-2026-10-18 https://github.com/daraashiq9055-glitch/rehaan-computers-website.git rehaan-next-preview
cd rehaan-next-preview
python -m http.server 8001 --directory previews/next-dashboard
```

If Python's command is `py`, substitute `py -m http.server 8001 --directory previews/next-dashboard`. No login, build or Firebase deployment is needed.

## Your previous dashboard sections

- **Overview:** four clickable main shortcuts for New Applications, Enrolled Students, Fee Management and All Records, plus add/export actions.
- **Admissions:** review a fictional pending application, inspect all fields, edit, approve or delete with explicit confirmation. Approval does not verify payment.
- **Students / All Records:** name/admission/phone search, course/batch/status filters, full details and sample profile edits. Add offline profiles with mobile, guardian, course, batch, qualification, gender and other familiar fields. Profile editing never changes payments.
- **Courses / Batches:** directories open the matching filtered register.
- **Settings:** load, switch or clear a private backup; inspect connection and data status.
- **Reports:** sample monthly fee totals, CSV and print; in private-backup mode, export the original records without inventing a financial statement.

These are preview implementations. Live authentication, email, photo transfer, payment verification and data writes remain in the existing admin dashboard.

## Load your previous student data privately

1. In the **live dashboard → Reports**, download **full JSON backup**. Your previously downloaded original photo-transfer backup also works, although it represents its export date.
2. In this **local preview → Settings & private backup**, choose that `.json` file.
3. Open **All Records**, **Students**, **Admissions**, **Courses**, **Batches** or **Fee Management**. Every original field is available through **Details**. Monthly fee dates and recorded amounts are shown exactly as stored; admission payment details remain separate.
4. **Reports → Download JSON copy** exports the unchanged original backup. Register CSV exports common columns.

The file stays in browser memory. It is not uploaded, committed, persisted to localStorage or sent to a service. Reloading clears it. Choose Clear private data to return to the sample workspace.

Private backup records are **read-only**. New sample tools use fictional records, reached through **Show sample workspace** in Settings. In backup mode, assessments/import/activity display an explanation and a button to switch to samples. No sample payments are applied to real records. Existing monthly totals are not individual receipt events, so the preview does not manufacture receipts or guess payment dates/current dues from them.

The parser accepts original `{collection:"applications", records:[{id,data}]}` backups, up to 32 MiB and 5,000 records. Duplicate IDs and malformed structures are rejected. Unknown fields, nested ledgers and photo references are retained. Embedded raster photos can display locally; private Cloudinary photos require the live administrator session and are not fetched here.

## Yellow/gold payment receipts and WhatsApp images

1. In **Students → Edit**, save the student's Indian mobile number. It can be a 10-digit mobile or include `+91`. No guardian number is silently substituted.
2. In **Payments & receipts**, record a sample partial payment (for Ayaan, try ₹400). The receipt shows ₹400 received now, ₹600 received for October and ₹399 remaining after this payment. Overpayment and invalid amounts are rejected before changing state.
3. Choose **WhatsApp receipt** to see a 1600 × 1160 PNG image with the same branding and fee details as the printed receipt.
4. **Download receipt image**, then **Open student's WhatsApp**. The chat link targets the saved student mobile and fills a payment message. Attach the downloaded PNG and press Send yourself.

A WhatsApp URL cannot automatically attach a local file. The preview does not send messages, claim the image was delivered, or use the WhatsApp Business API. A missing/invalid saved mobile disables the chat button and offers Edit saved number. The current saved number is used, even for an older receipt; the receipt's student/fee snapshot remains historical.

The image and printed receipt preserve the balance at payment time. The accompanying WhatsApp message labels the latest month balance as current. Every generated preview receipt is marked as a design preview.

**Blank receipts:** date, name, month, receipt number and amounts remain empty for handwriting. Print one A5 landscape receipt or two forms on A4 portrait.

## Mark cards

**Assessments** edits sample component marks. **Mark cards** prints a detailed A4 statement with student/guardian, admission/roll, course/batch, assessment date, component marks, totals, percentage, grade, result and signatures. Text is slightly larger while retaining the previous paper colours. There is no certificate option.

Sample rules: at least 33% in each component. A+ from 90%, A from 75%, B from 60%, C from 45%, D from 33%, subject to passing each component. A high total cannot override a failed subject. Blank marks keep the result incomplete. Real institute academic policies need confirmation before production integration.

## Bulk import, activity and monthly reports

- **Import students → Try sample CSV:** two valid rows and one duplicate. Review and confirm before adding; no payments are imported. Excel users must save as CSV UTF-8; native `.xlsx` is not supported.
- **Activity history:** sample profile, application, payment, import and assessment changes with time, actor and details. This is in-memory demonstration history.
- **Monthly reports:** sample billed/received/outstanding totals, student breakdown, CSV and printable report. Initial October totals are ₹2,997 billed, ₹1,199 received and ₹1,798 outstanding. After Ayaan's ₹400 example, received is ₹1,599 and outstanding ₹1,398.

CSV headers:

```csv
admission_number,name,phone,course,batch,gender
DEMO/006,Example Student,9999900006,Computer Diploma,Morning,female
```

Phone: exactly 10 digits. Gender: blank, `male`, `female`, `other`, `prefer_not_to_say`. Admission numbers are unique ignoring case. Files: up to 2 MiB / 1,000 rows. Quoted fields and UTF-8 BOM are supported. Invalid rows are explained and skipped; extra columns (including payments) are rejected. New profiles flag opening fees for review. CSV exports neutralize spreadsheet formula prefixes.

## Printing

Use the preview's print button, select the indicated paper size, disable browser headers/footers and enable background graphics. A5 landscape: one receipt. A4 portrait: two receipts, reports and mark cards. Printer or Save as PDF both work through the browser dialog. Generated PDFs were checked for one-page layouts and white paper margins. Physical printer margins depend on the printer.

## Safety and validation

No Firebase, Firestore, Cloudinary, worker, payment gateway, SDK or credentials are used by preview code. Its CSP blocks network connections, fonts are bundled locally, and only a deliberately clicked WhatsApp link leaves the preview. No charge, refund, live import, actual payment verification or production record update occurs. Everything resets on reload. Do not deploy this branch for a preview.

Run model / backup / recipient validation:

```sh
node --test previews/next-dashboard/model.test.mjs previews/next-dashboard/backup.test.mjs
```

Browser checks require Python Playwright, Chromium at `/usr/bin/chromium` and PyMuPDF:

```sh
python3 previews/next-dashboard/browser-test.py
```

The browser suite blocks nonlocal services and network writes, intercepts WhatsApp, verifies saved-number links and PNG generation, private backup preservation, familiar register actions, payment totals, CSV import, mark cards, A5/A4 printing and responsive sections. Synthetic artifacts go to `/tmp/rehaan-next-preview-checks`; no private backup is checked into Git.
