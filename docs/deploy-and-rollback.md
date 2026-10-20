# Save, deploy and roll back the website

The [homepage admin-link fix](admin-navigation-fix-2026-10-20.md) restores the logo-menu link and opens both Admin login links in the same tab.

## Current visitor website release — 20 October 2026

The approved visitor redesign is integrated with the existing production admission/photo/payment functions. See [the current release checks and Hosting-only deployment steps](visitor-release-2026-10-20.md). The saved code fallback is `backup/before-visitor-redesign-2026-10-20` at `26505c0`. The admin dashboard, rules and Workers are unchanged. The older dashboard release notes below remain as history.

## Mark cards / receipts release

The integration is on `codex/admin-dashboard-redesign`, with code rollback branch
`backup/before-markcards-receipts-2026-10-18` at `3df4dea`.
The local real-SDK Firestore emulator check has **passed**, using the verified
Google Cloud SDK distribution of Firestore emulator 1.22.0. It confirmed the current
rules deny public access and protect the new persistent marks and atomic receipts.
See [mark-cards-and-receipts.md](mark-cards-and-receipts.md) for all validation details.
Deploy Hosting only using the steps below from your original `rehaan-admin-preview`
folder, never the disconnected `rehaan-next-preview` folder. No website deployment
or live student/payment write was made during development.

Nothing in these instructions restores student/payment data automatically.
Deploy only Hosting. Do not deploy Firestore rules or either Worker as part of
this frontend update.

## Backups already saved on GitHub

- `backup/live-before-dashboard-2026-10-18` points to `d738bb2`: the old live
  website source. Its index, admin, script and public styles were compared with
  the live website before creating this branch (Windows line endings normalized).
- `backup/working-cloudinary-preview-2026-10-18` points to `43a1ed3`: the working
  Cloudinary preview, including private photo viewing and the original transfer
  tool. This is the more suitable code fallback after the photo transfer. It
  still contains the temporary connection-test button, which the new release
  removes.

These are code backups, not database backups. Keep the downloaded original JSON
backup private. Its fee/payment values are a snapshot; do not restore the whole
file over newer payments. There is no automatic JSON restore button.

## Before deployment on Windows

1. Save all open files in your editor. In File Explorer, open `C:\Users\hp` and
   copy the entire `rehaan-admin-preview` folder to a separate folder named
   `rehaan-admin-preview-backup-2026-10-18`. This keeps local edits that may not
   have been pushed to GitHub. Do not work in or deploy from that backup copy.
2. Keep the downloaded original-photo JSON backup outside the website's public
   folder. Do not upload the backup to Hosting or public GitHub.
3. Open https://console.firebase.google.com/project/rehaan-computers/hosting
   and find Release history. Record the current release's date/version. The next
   Hosting deployment creates another release; check the current release is
   available before relying on a console rollback.
4. Stop the local Python server with Ctrl+C, then update the original clone:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git status --short
git switch codex/admin-dashboard-redesign
git pull --ff-only
python -m http.server 8000 --directory public
```

If Git reports local changes or conflicts, stop and share the error; do not use a
hard reset. The separate folder copy preserves local files, while the named Git
branches preserve the committed code.

5. Open http://localhost:8000 and http://localhost:8000/admin.html. Use Ctrl+F5.
   Sign in and read the student count, migrated photos, fee balances and main tabs.
   The test button should be absent. This preview uses the live database, so
   edits, saves and transfers are real writes. Do not charge a payment just to
   check the deployment. The existing four photos have already been transferred;
   there is no need to transfer them again.

## Deploy the reviewed frontend

Stop the Python server with Ctrl+C, then run:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
npx --yes firebase-tools@15.34.0 login
npx --yes firebase-tools@15.34.0 deploy --only hosting --project rehaan-computers
```

Use the Google account that owns the Firebase project. This publishes public/ to
https://rehaan-computers.web.app. It does not change student records, Firestore
rules, Cloudinary secrets or the photo/payment Workers. No new API secret is
needed. Save the CLI output; do not claim deployment succeeded until Firebase
reports Deploy complete.

Afterward, open the live homepage/admin in a fresh tab, use Ctrl+F5, and check
that the new dashboard and photos load, tabs open and the test button is absent.
Confirm maps/social links as read-only checks. Send the deployment output so the
live public release can also be verified from the cloud workspace.

## If the new frontend causes a problem

### Restore a Firebase Hosting release

In Firebase Console → Hosting → Release history, use the menu on the earlier
release and choose Roll back. This restores its website files; it does not roll
back the database or Cloudinary. The original old dashboard may not display
private Cloudinary photos, because it predates the new photo viewer. The photo
files and student records are still there. Use the compatible code fallback
below when you need the working Cloudinary dashboard instead of the old UI.

### Publish the Cloudinary-compatible code backup

Use a separate checkout so the current working folder is kept intact. If the
folder name already exists, choose a new empty destination name.

```bat
cd /d "%USERPROFILE%"
git clone --single-branch --branch backup/working-cloudinary-preview-2026-10-18 https://github.com/daraashiq9055-glitch/rehaan-computers-website.git rehaan-cloudinary-rollback
cd rehaan-cloudinary-rollback
npx --yes firebase-tools@15.34.0 deploy --only hosting --project rehaan-computers
```

This restores the working preview's frontend with Cloudinary support. It does
not restore old student/payment values, delete Cloudinary photos or redeploy a
Worker. Keep the downloaded JSON for field-specific recovery if ever needed;
restoring an entire stale backup could overwrite later fee/payment records.
