# Admission confirmations, register order and HD mark cards

This is a Hosting-only follow-up to the complete dashboard release. There is no
database migration, fee-rule change, Worker deployment or billing change.

## Online admission WhatsApp

After approval is saved and the register is refreshed, the student's Details
panel opens with **Send Admission Confirmation on WhatsApp**. It uses the saved
student phone, admission/roll number, course and admission date, using India time
when the date comes from the approval timestamp. The message is the same official
admission confirmation used by offline enrolment.

Both online and offline approved students with an admission number retain this
action in Details. Existing approved students do not need re-approval: open
Details to use the action. Unapproved students do not have it. A failed approval
does not show a saved confirmation. Opening a draft does not change payment or
student records, and never records the message as delivered. The admin must click
the button, then press Send in WhatsApp. No automatic WhatsApp API was added.

## Admission-number order

The register, fee register, mark-card student selector and student journey list
start with the lowest admission number. Records centre defaults to Admission
number and still offers the other sorts. Numeric comparison handles 2 before 10,
zero-padded numbers and legacy prefixes. Unnumbered records remain visible at the
end, with recent applications first. Duplicate numbers are not merged, and no
admission number, roll number, student record or payment is rewritten by sorting.

## Mark-card images and mobile readability

**Download HD image · PNG** downloads a complete, locally rendered 1,600-pixel-wide
mark card, at least 2,260 pixels high. Height expands for long student/course names
and up to 12 subjects; the bottom is not cropped to a screen-sized screenshot.
The green/cream paper colours, grading rules, student details, totals and signature
spaces are kept. There is no remote upload or external rendering service.

Save marks before downloading. Unsaved changes disable image/print actions. A
session change, changed form or student switch during rendering prevents a stale
image download. Existing print/PDF remains a separate action. The mobile preview
uses larger text, a single-column detail layout and wrapped table cells; the paper
print layout stays intact. Downloading does not save or alter marks/fee records.

## Local checks

- `python3 tests/admin-browser.py`: online approval, correct WhatsApp destination
  and content, persistent resend action, no extra writes, fee/provider retention,
  private/inline photos, offline enrolment and denied/conflicting changes.
- `python3 tests/admin-candidate-browser.py`: assembled release, admission order,
  default records sort, actual PNG dimensions, unchanged record/write counts,
  unsaved-export blocking, phone font sizes and long-name/12-subject image bounds.
- `node --test tests/admin-records.test.mjs`: numeric/legacy/missing-number order
  without mutating records, plus existing record-validation protections.
- `python3 tests/admin-build-encoding.py`: Windows cp1252 compatibility.
- Existing premium preview, records-centre and warm-cache sign-in checks remain
  applicable. All external services in browser checks are intercepted.

## Update the deployed complete bundle

From Windows CMD, after retaining a current private backup:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python prepare-admin-release.py
cd build\admin-release
type RELEASE.json
```

Confirm version `20261020-admin-3` and `auditEnabled: false`, then:

```bat
npx --yes firebase-tools@15.34.0 deploy --only hosting --project rehaan-computers
```

Existing records remain in Firestore and photos in their current storage. Check an
already approved online student's Details action after deployment; do not approve
them again or make a test payment. Only send a real confirmation when appropriate.
