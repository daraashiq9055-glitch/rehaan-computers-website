# Premium administration preview

From Windows CMD in the existing checkout:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python preview-admin.py
```

Python opens the exact preview in a browser using a free port. Keep CMD open.
There is no Firebase login or installation step. If the browser does not open,
copy the printed address. `--no-browser` only prints that address.

This is the current complete dashboard with a new sapphire/gold presentation,
matching the homepage, rather than a replacement with missing sections:

- Overview and its four working summary buttons; admissions and student register.
- All four original register tabs and course/batch/search filters.
- Offline enrolment, editing, photo crop/viewing, approvals and deletion controls.
- Fees, partial monthly payments, saved receipts and amount-correction history.
- Existing receipt images, printing and mark cards, with the paper designs kept.
- Course/batch directories, CSV/JSON exports and settings.
- New quick search (Ctrl+K), navigation search, and list/card register views.
- Restyled sign-in; use Sign out to view it, then any demo email/password to return.

The launcher renders the current public/admin.html and runs its original app,
record-validation and transaction modules. A preview-only import map replaces
Firebase and the photo service with local memory adapters. A content security
policy blocks external service connections. External messages/sharing are blocked;
print/download actions operate on fictional data. No real password is required.

The eight sample students are fictional. No current live student is loaded or
copied into this preview. Added students, cropped photos, fees and marks exist
only in page memory; Reset demo/reload removes them. Cloudinary migration is
disabled in this preview, and original paid admission/payment behavior is retained
by the app but affects samples only. This does not test a real payment or upload.

All preview files are outside public/, so Firebase Hosting does not deploy them.
The live admin dashboard and production photo/payment modules are unchanged.
Preview the UI before integrating an approved design with the real services.

Validation: `python3 tests/admin-premium-preview-browser.py` covers all nine
sections at five widths, local offline enrolment with a crop, fee/receipt correction
history, receipt PNG/PDF, saved mark cards, sign-in/logout/reset and zero external
requests or network writes. Production login navigation has a separate regression
in tests/admin-navigation-browser.py.
