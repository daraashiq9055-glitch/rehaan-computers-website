# Student portal integration status

The four-tab student page in `public/student.html` is an interaction preview. Its
`DEMO001` account and sample fields are never evidence of a real student login.
Do not deploy the preview as a private student account system.

`public/student-view-model.js` now defines a narrow, tested projection of
existing application fields. It excludes admin notes, payment tokens, photo
references and Aadhaar fragments, and separates concessions from cash. It is
not yet connected to Firebase or the demo UI.

## Existing sources

| Student area | Existing admin source | Current status |
| --- | --- | --- |
| Name, admission number, DOB, guardian, contact, course, batch, joining date | `applications/{id}` | Admin-only Firestore read; the preview uses samples. |
| Admission payment, monthly totals, dated receipts | `applications/{id}.payment`, `.monthlyFees`, `.feeReceipts` | Admin-only read. A student projection must follow the existing statement calculations, including concessions and deleted receipts. |
| Monthly attendance | `applications/{id}.monthlyAttendance` | Admin-only read. No student publication exists. |
| Learning checklist | `applications/{id}.learningProgress.byCourse` | Admin-only read. The preview's earlier-program status is inferred from selection and does not change this record. |
| Centre notes, homework, notices, results, messages, group links | No verified student-facing store | The Updates tab uses visibly labelled sample content. |
| Weekly quiz, attempts, points, rank | No server-controlled student quiz store | The preview saves one scored attempt locally in this browser. |

## Required secure connection

1. Create Firebase Authentication accounts with a verified admin provisioning
   flow. Store a server-issued link between each Auth UID and exactly one
   enrolled application. Never use the admission number or a browser-provided
   student ID as proof of identity.
2. Publish a **sanitized student view** for each UID. Include only that student's
   approved fields and derived fee, attendance, receipt, and learning summaries.
   Keep `applications` admin-only, because it also contains admin and payment
   fields. Sync the view when the source record changes, with stale-data handling.
3. Add Firestore rules for an own-UID read of the sanitized view and admin-only
   writes. Students must not list views, edit financial or academic fields, or
   read another UID's document. Explain and emulator-test these exact rules
   before publishing them. No Firestore rule change is included in the current
   four-tab preview.
4. Add admin-authored updates, attachments, approved quizzes, attempts, and
   results. Keep uploaded files behind student-scoped access. A trusted server
   must score and lock attempts, enforce the seven-day no-repeat question rule,
   and award points only after approved results. Browser storage cannot enforce
   those rules.
5. Connect student sign-in, loading, empty, error, logout, and session recovery
   to those stores. The demo login remains separate until this is verified.

## Verification gates before live use

- Test admin and student login with real test accounts; test two distinct
  students against each other's records and direct Firestore paths.
- Test admin changes to fees, receipts, attendance, journey, uploads, notices,
  and a published quiz against the matching student's view.
- Test disabled access, account recovery, offline logout, stale projection,
  and denied Firestore writes from a student.
- Test seven days of unique scored questions and attempt locking on a server.
- Build the release candidate and run the existing admin browser/rules suite.

The current preview changes no production Firestore data or rules.
