> Presentation refinement **20261026-admin-13**: Cinzel institute heading, centred address, marks title and assessment subtitle in screen/print/PNG, a two-level serif contact footer and fine corner ornaments inside the card boundary. Stored records, grades, signatures and payments are unchanged. The fee reminder retains **Pay to: 6006433125**.

# Mark-card redesign — 20261025-admin-12

Preview first; no deployment has been run. The reminder footer now explicitly
says `FEE PAYMENT / Pay to: 6006433125` and asks for payment confirmation.

## Card presentation

- Local professional serif institute heading, full address between ruled lines,
  framed portrait and high-contrast student details.
- Four curated paper colours plus a custom colour picker. The picker previews
  instantly and saves per student/card; primary ink adapts to the background.
- Subject, Max., Marks, Grade, Result. Automatic/manual grades and all existing
  pass/fail thresholds remain unchanged. The bottom result summary is retained.
- Optional typing WPM (0–500) and accuracy (0–100%), up to two decimals. Missing
  metrics show "not recorded". Metrics are descriptive and never invent marks or
  change the pass/fail calculation. Typing is detected while entering a subject
  name, or enabled explicitly with the Typing assessment checkbox.
- One assessment date; redundant Prepared on date removed from screen/print/PNG.
- Mobile student details stack and subject rows become labelled cards. Paper and
  PNG retain five columns. Long assessments render full height in images, with
  the existing export-size guard; choose HD if a 4K card exceeds its memory cap.
- Portrait and both signatures use containment, preserving complete proportions.
  R is Authorised; Y is Examiner. Phone numbers and website use the serif footer.
- Three ordinary subjects, including typing metrics and signatures, fit A4.
  Longer assessments can continue across printed pages, rather than dropping rows.

## Private signatures

`instituteSettings/markCardSignatures` is a separate admin-only document shared
by both institute admins. It contains bounded PNG data, updatedAt and updatedBy.
Only verified admins may get/create/update it; list/delete/public reads/writes
are denied. Saving checks the exact previously loaded document in a transaction
so one admin cannot silently overwrite the other's change. No signature write
changes a student, marks, fee ledger or gateway payment.

The original cleaned signatures are in ignored `private-assets/mark-signatures/`.
They are not committed, placed in public/, copied to the generated release, or
stored in browser localStorage. The preview launcher reads those files only if
present, prepares smaller transparent PNGs in page memory and injects them only
into the localhost demo. The release builder removes that preview-only script.
The private preview ZIP includes the local files so it can be reviewed directly.
Do not use the private preview ZIP as Hosting's public folder.

After future approved deployment, open Mark Cards > Institute signatures, choose
the cleaned transparent PNGs once and Save institute signatures. Both admins and
all students then use the shared private settings. Background removal was done
with the supplied images; the import feature resizes proportionally and retains
transparency. It does not remove a background from arbitrary future scans.

## Local preview

Unzip `rehaan-marks-preview.zip` and run from its extracted folder:

```bat
python preview-marks.py
```

It opens directly on a fictional student's card with the supplied signatures,
typing example and colour controls. All demo changes are in memory. No live
sign-in, student write, upload, WhatsApp message or payment occurs.

For a Git checkout:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python preview-marks.py
```

The private signature files must be extracted into that checkout separately to
show the supplied signatures there; they intentionally are absent from GitHub.
The source-only preview still works and its Institute signatures control can
load the cleaned PNGs locally.

## Preview without downloading a ZIP

`git pull --ff-only` now also fetches `preview-assets/mark-signatures.enc`.
This contains only the two PNGs, encrypted with AES-256-CBC and independently
HMAC-SHA256 authenticated. The random 256-bit preview key is provided separately
in the private conversation; it is not in Git, Hosting or the generated release.
Run `python preview-marks.py --signature-key THE_SUPPLIED_PREVIEW_KEY` once.
The helper authenticates the complete bundle before decryption, restricts
extraction to the two expected PNGs and writes them into ignored private-assets/.
Windows uses its built-in PowerShell/.NET AES provider; no pip install is needed.
Other systems use OpenSSL. No network call or live record is needed to unlock it.
Later starts can use plain `python preview-marks.py` after the files are loaded.
The private preview key is unrelated to Firebase, Cloudinary or payment keys.

## Future approved deployment

The additive rules for private signatures must be deployed before using their
Save button. Counter/application/admin/payment rules are otherwise retained.
Publish current firestore:rules from the repository root, build with
`python prepare-admin-release.py`, and publish Hosting from build/admin-release.
Expected manifest: version 20261026-admin-13, auditEnabled false,
receiptCounterRulesRequired true, markSignatureRulesRequired true.
No rules, website or data have been deployed during this work.

## Checks

- Existing automatic/manual grading boundaries and atomic mark-card saves.
- New typing/colour validation and lossless round trips of older cards.
- New release browser test: grade/result columns, typing metrics, colours,
  portrait/signature proportions, A4, full PNG, mobile widths, private settings,
  logout and payment/profile preservation.
- Existing photo tests: real private-view adapter with intercepted requests,
  HD/4K/print, retry, invalid references, delayed reads and logout guards.
- Existing feature/candidate tests: receipts, corrections, offline addition,
  marks, missing optional renderers, data preservation and multiple widths.
- Firestore emulator: both admins can share the bounded signature document;
  public/non-admin access, wrong actor, external image references and injected
  fields are denied. Counter concurrency/payment/correction tests still pass.
- Original visitor admission/photo/payment code fingerprints retained.

Browser tests use isolated fictional fixtures and intercepted SDKs; emulator
tests are restricted to localhost demo projects. No real record or payment is
created to validate the redesign.
