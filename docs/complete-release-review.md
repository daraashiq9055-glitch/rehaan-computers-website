> Latest release: **20261024-admin-10** adds approved receipts and includes Fee Statements. Follow [receipt-refresh-release.md](receipt-refresh-release.md): publish the additive counter rules first, then Hosting. Older Hosting-only commands below apply to earlier releases.

# Complete release: review first, Hosting deployment afterwards

This release keeps the confirmed Spark plan. Secure server history is disabled;
the separate audit Functions, rules and indexes are not deployed. There is no
database migration, Worker deployment, bulk import or automatic record rewrite.

## Review from Windows CMD

Stop an older preview with Ctrl+C. Update the existing checkout:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python preview-home.py
```

The preview opens on a free port, avoiding a stale previous preview. Check:

1. Monthly tuition in a gold-highlighted panel near the top: **₹999/month**.
   The second prominent tuition label is below the batch choices. The **₹100
   admission fee** remains separate; the online payment is still admission only.
2. Both top phone links: **+91 9149551258** and **+91 9797205429**. Open the
   floating WhatsApp chooser; both numbers have their own chat link. It also
   works without JavaScript. The course-enquiry dialog retains both contacts.
3. Course search, course details, comparison, brochure download, guidance images,
   the new tap-based skill activity, laptop animation and map directions.
4. One Dar Yasir footer credit, the requested Instagram and one official Facebook
   link. Mobile navigation and reduced motion remain supported.

Stop with Ctrl+C, then run:

```bat
python preview-admin.py
```

This uses fictional local students, not live records. Test offline addition with
a cropped photo; details/editing; fee entry with method/date/reference; receipt
amount correction with reason; PNG/print; mark cards; Today/accounts; student
profiles; lifecycle/checklists; preferences; search; full backup; and sign-out.
Reload resets sample changes. The preview's history is clearly a simulation.

The actual assembled release has been tested separately with intercepted service
calls. **Both logo-menu and footer Admin login navigate in the same tab to the
upgraded real sign-in after full deployment.** There is no automatic demo login,
fake student data or demo history in the generated release. The separate safe
previews are for interaction/design review; they do not reproduce real charges,
production service outages, deployed Firebase identity or Cloudinary credentials.

## Full deployment after review

Before publishing, use the current live admin's private JSON export and keep the
file securely. Note the currently active Firebase Hosting release in the console
so it can be restored. A Git commit preserves code; it is not a student-data backup.

Build the complete bundle from the updated checkout:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
python prepare-admin-release.py
cd build\admin-release
type RELEASE.json
```

The builder explicitly reads and writes UTF-8, including on Windows with a
cp1252 system default. `python3 tests/admin-build-encoding.py` compares every
generated file with a build under a simulated cp1252 default, preserving rupees,
smart quotes and other non-ASCII content without changing payment logic.

Confirm `auditEnabled` is **false**. This folder contains the complete homepage
and upgraded admin together. It has a **Hosting-only** Firebase configuration.
After the review and backup, deploy from this generated folder:

```bat
npx --yes firebase-tools@15.34.0 login
npx --yes firebase-tools@15.34.0 deploy --only hosting --project rehaan-computers
```

The ordinary repository-root public/ still contains the earlier admin source;
deploying from the generated folder is what includes the complete upgraded UI.
Do not add `--audit-ready` while the project stays on Spark. The builder never
changes billing and never runs a deployment itself.

After release, open https://rehaan-computers.web.app/ in a fresh tab. Check both
admin links, sign in, and compare existing students/photos, ledger balances,
corrected receipts and marks with the private backup. Refresh the browser if it
holds the previous page. Use normal legitimate student/payment operations only;
no real charge is required merely to test the appearance.

If a frontend issue appears, Firebase Console → Hosting → Release history →
previous release → Roll back restores the prior website files. It does not revert
the database, payments or Cloudinary. Never bulk-restore a stale JSON over newer
payments. Preserve the generated release and both code commits for diagnosis.

## Automated review evidence

Local regression checks cover both homepage admin entrances against the assembled
release, all 15 dashboard views at five widths, 108-record preservation, private
exports, offline addition/crop, fee/receipt/marks actions, denied/stale writes,
lost-acknowledgement retries, duplicate submits, receipt corrections and method
totals. Public payment checks cover 25 admission/photo/payment cases. Separate
unit checks retain the exact original public admission/photo/payment code hashes.
All browser service calls are intercepted: no student record, image upload, email,
WhatsApp message or real payment is created by the automated checks.
