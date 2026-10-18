# Current dashboard + two additions: preview only

This preview now reuses the existing deployed Rehaan Computers admin dashboard. Its `admin-dashboard.css`, `admin-gold.css`, record helpers and login-effects files are copied unchanged from `public/` at base commit `3df4dea`. The existing eight sidebar sections, four main register tabs, student details and fee form remain.

Only these proposed additions are shown:

1. **Mark Cards**: one section containing student selection, marks entry, subject editing, calculated results and a printable mark card. There is no separate Assessments section and no certificate feature.
2. **Fee receipts**: inside the existing Fees & payments flow, after recording a sample payment. Print a filled receipt, download its image or open the saved student's WhatsApp chat. Blank handwritten receipt forms are also available.

The separate redesigned workspace, new bulk import, new activity history and new monthly reports have been removed. The original dashboard's existing Reports and Settings remain unchanged.

## Update using Windows CMD

Press **Ctrl+C** in the CMD window running the preview server, then:

```bat
cd /d "%USERPROFILE%\rehaan-next-preview"
git pull --ff-only
python -m http.server 8001 --directory previews/next-dashboard
```

Leave CMD open. Open **http://localhost:8001/index.html** and press **Ctrl+F5**. `/admin.html` also opens this same preview now. If Python is installed as `py`, use `py -m http.server 8001 --directory previews/next-dashboard`.

First-time checkout only:

```bat
cd /d "%USERPROFILE%"
git clone --single-branch --branch preview/next-features-cmd-2026-10-18 https://github.com/daraashiq9055-glitch/rehaan-computers-website.git rehaan-next-preview
cd rehaan-next-preview
python -m http.server 8001 --directory previews/next-dashboard
```

No Firebase deployment or real sign-in is needed. The preview opens automatically using a local adapter. If you sign out, reload to reopen the sample workspace.

## Show complete previous data

Download a **fresh full JSON backup** from your **live dashboard → Reports → Download full JSON backup**. Use **Load private backup** in the preview's top strip to open it.

Every original document ID, stored field, nested map, fee amount, reminder, admission payment and photo reference is retained. The current dashboard uses its original register, filters, details and fee calculations to display the loaded records. Original Reports exports every stored field again. No subset of profile fields is used to replace the original records.

A backup contains data only up to its export time. An older photo-transfer backup works, but does not include later records or changes. The preview has no live connection and cannot fetch records missing from a backup.

The JSON remains in browser memory. It is not uploaded or saved to localStorage, disk, Git or a cloud service. It disappears on reload or Reset samples. Backup limits: 32 MiB, 5,000 records, original `{collection:"applications",records:[{id,data}]}` shape. Invalid files and duplicate IDs are rejected before changing the loaded data.

**Original backup records and fee entries are read-only.** Student and fee changes are blocked by the local adapter. Mark card drafts can be created for every loaded student, including pending applications, without modifying any original student or payment field. Use sample records to try recording payments and generating new receipts.

Embedded raster photos can display locally. Private Cloudinary photos retain their original references but require the live admin session to view; this preview never contacts Cloudinary.

## Try Mark Cards

Open the single **Mark Cards** tab. Select a student from all loaded records or search by name/admission number. Enter the assessment title/date and subject maximum/obtained marks. Add or remove subjects as needed (1–12), save the draft, then print.

The card includes name, guardian, admission/roll numbers, course/batch, assessment date, subjects, maximum/obtained marks, total, percentage, grade, result and signature spaces. It preserves the approved light green/ivory paper colours and slightly larger text.

Each student has a separate draft retained only during this preview session. Blank marks mean incomplete. Sample grading requires at least 33% in every subject; A+ from 90%, A from 75%, B from 60%, C from 45%, D from 33%. A high total does not override a failed component. Institute grading policy and persistent academic storage still need production implementation after design approval.

For a quick example, select Ayaan Demo and enter **76, 84, 91**: **251/300, 83.67%, Grade A**.

## Try receipts in the existing payment form

1. Use sample records. Save a test mobile in the student's existing **Details → Edit** panel if you want to inspect the addressed WhatsApp link.
2. Open the existing **Fees & payments → Record Payment**, or **Manage Fee** on a student row.
3. Ayaan's oldest sample due has ₹200 already received. Enter ₹400 and confirm. The original validation and local transaction update that due's total to ₹600, leaving ₹399. The ₹100 admission fee stays separate.
4. After a successful save, click **Print / WhatsApp receipt** in the same payment dialog.
5. Print / save PDF, download a 1600 × 1160 PNG, or select WhatsApp receipt.

WhatsApp: download the image, open the chat addressed to the saved student mobile, attach the PNG and press Send. A WhatsApp link can fill a message and select a number; it cannot automatically attach a local file. Missing/invalid saved mobiles disable the chat link. No message is sent automatically.

Each new payment has a separate receipt, preserving its amount and balance at issue. The due date and fee month follow the existing admission-anniversary billing calculation. Only payments successfully recorded during this preview have receipts. Old monthly totals are not converted into invented receipt events or payment dates. Receipt and mark card drafts reset on reload and are explicitly labeled as previews.

**Blank receipts:** Fees & payments → Print blank receipt. Name, date, month and amounts stay blank for handwriting. Print one A5 landscape receipt or two forms on one A4 portrait sheet.

## Printing

Use the feature's print buttons. A5 landscape: a single receipt. A4 portrait: mark cards or two blank receipts. Disable browser headers/footers and enable background graphics. Choose your printer or Save as PDF. Three-subject cards and receipt layouts are checked for one-page PDF output; many subjects can require additional pages. Physical printer margins depend on the device.

## What is isolated

All new files are under `previews/next-dashboard`, outside Firebase Hosting's `public` directory. No production file, Firestore rule, Firebase hosting configuration or backend worker is changed.

The copied admin module imports an in-memory adapter instead of Firebase. It contains no live Firebase project configuration. The page's CSP blocks network connections. Email is disabled, photo uploads are local-only, and no SDK is loaded. Private backup writes are rejected. Existing buttons operate on sample memory only; no charge, refund, live student import, payment verification or live data write occurs.

This is a design preview. Production integration, persistent academic records, receipt numbering/storage and payment concurrency verification are separate work after the design is accepted. Do not deploy this preview branch.

## Developer validation

Regenerate the current-dashboard copy after intentional base changes:

```sh
python3 previews/next-dashboard/build-preview.py
```

The build script changes preview copies only. It adds the Mark Cards rendering branch and receipt controls, swaps Firebase imports for the local adapter, removes mail loading, and exposes preview startup. The deployed application's underlying payment validation and guarded transaction flow are reused.

```sh
node --test previews/next-dashboard/model.test.mjs previews/next-dashboard/backup.test.mjs
python3 previews/next-dashboard/browser-test.py
```

Browser checks require Python Playwright, Chromium at `/usr/bin/chromium`, and PyMuPDF. They verify original-file identity, original navigation, per-student marks, profile/payment preservation, partial-payment receipt math, failure behavior, PNG generation, addressed WhatsApp links, blank/filled print PDFs, complete backup/export fidelity and responsive layouts. Nonlocal services and all network writes are blocked. Synthetic artifacts go to `/tmp/rehaan-current-preview-checks`.
