# Student photos on mark cards

Release: `20261020-admin-4`. The last code before this integration is commit
`8745121` on `codex/admin-dashboard-redesign`.

The approved photo design is now part of the existing Mark Cards workflow.
Selecting a student reuses their existing uploaded photo. Their portrait appears
at the top-right of the preview, printed card and main PNG download. There is no
second photo upload or separate download button. 4K (3840 pixels wide) is the
default; HD (1600 pixels) reduces memory/download size. The full card keeps all
saved details, subjects, totals, grading and signatures. The photo is fitted
without stretching or cropping; small originals cannot gain genuine 4K detail.
Very long cards that exceed the 4K memory limit request the HD option.

Private Cloudinary images use the existing authenticated administrator service
and temporary object URLs. Legacy inline/public Cloudinary raster images remain
supported. No student/photo migration, replacement, database-rule change or
payment/backend change is required. Export/print performs no Firestore write.
Missing photos have an explicit placeholder. A stored photo that fails to load
blocks print/download and offers Retry photo; it is not silently omitted.
Switching students/views or signing out cancels pending exports and photo display.
Unsaved changes must be saved before exporting, as before.

## Windows deployment

Close the local preview with Ctrl+C. From CMD:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python prepare-admin-release.py
cd build\admin-release
type RELEASE.json
```

Verify `version` is `20261020-admin-4` and `auditEnabled` is `false`. Then:

```bat
npx --yes firebase-tools@15.34.0 deploy --only hosting --project rehaan-computers
```

This publishes the generated complete dashboard with the existing homepage.
Firestore records, Cloudinary files, rules and payment services stay in place.
Keep the previously published Firebase Hosting release available for rollback
in Firebase Console → Hosting → release history. Do not redeploy older database
rules or import backups for this UI update.

## Verification

- `python3 tests/admin-mark-photo-browser.py`: generated real-service bundle,
  intercepted authenticated photo reads, private/inline/public photos, exact PNG
  photo pixels at 4K/HD, print, missing/invalid photos, failed reads/retry,
  switching student, sign-out, mobile widths and complete record preservation.
- `python3 tests/admin-candidate-browser.py`: generated dashboard, offline photo
  enrolment, payments/corrections/receipts, marks, mobile and optional asset failure.
- `python3 tests/admin-features-browser.py`: original mark/fee workflow, stale
  edits, denied payment writes and saved records.
- Encoding build, warm-cache sign-in and feature/photo unit checks.

All service tests use local fixtures and intercepted requests. No live payment or
student change is made. After deployment, sign in, select a student with a saved
photo, and compare their preview and downloaded PNG against the record. Existing
photos should appear without another upload.
