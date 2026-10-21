# Optional manual mark-card grades

Release `20261021-admin-5` adds an Automatic/manual selector for each subject
and the final grade. Existing saved cards stay automatic until an administrator
explicitly saves an override. Choosing Automatic again removes that override.
Grades are stored only within the student's existing `markCard`, using the same
session and stale-record transaction guards. Marks, percentage and maximum totals
remain calculated from entered marks. All student/payment/photo fields are kept.

| Grade | Subject result |
| --- | --- |
| A+ (90%+) | Excellent |
| A (75%+) | Excellent |
| B (60%+) | Very Good |
| C (45%+) | Good |
| D (33%+) | Pass |
| F (below 33%) | Fail |

For example, 49/50 and 50/50 produce A+ / Excellent automatically. The bottom
panel retains Percentage / Grade / Result and its existing design. Its result
remains Pass/Fail; failing cards now show grade F and result Fail, replacing
Not passed. A failing subject also uses Fail instead of Below pass mark.

Manual grades do not alter marks or turn missing marks into a completed result.
The original 33% minimum in every component still applies; a manual F also means
Fail. A passing manual letter cannot override a component failure. Subject
manual grades affect that subject's descriptive result; the final grade is
calculated from total marks unless its separate selector is changed.

The same validated card and grading helpers drive HTML, print and the PNG,
including existing saved student portraits. No second download button is added.
Controls disable export until changes have been saved. Returning to Automatic
and saving removes only the override fields, preserving compatibility with older
cards. Import/model URLs are versioned together to prevent cached validators
from discarding manual grades.

## Preview on Windows

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python preview-admin.py
```

Open Mark Cards, select a fictional student and try the subject grade dropdowns
and Final grade. Save marks & update preview, then print/download. The preview
uses local samples, not live records. Production release generation continues to
use `python prepare-admin-release.py` and deployment from `build\admin-release`.
No database rules, migration, photo transfer or payment backend deployment is
needed. The previous code is retained at commit `de6c030`.

## Checks

- `node --test tests/admin-mark-grades.test.mjs tests/admin-features.test.mjs`
- `python3 tests/admin-mark-grades-browser.py`
- `python3 tests/admin-features-browser.py`
- `python3 tests/admin-candidate-browser.py`
- `python3 tests/admin-release-browser.py`
- `python3 tests/admin-build-encoding.py`

Tests use local fixtures/intercepted service requests. They cover grade
boundaries, invalid overrides, manual/automatic persistence, PNG and print,
mobile widths, denied writes, stale records and payment field preservation.
No real student record or payment is changed by testing.
