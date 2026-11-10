# Approved homepage covers and presentation changes — 10 November 2026

This release starts from `codex/admin-dashboard-redesign` at `9b00723`, whose homepage, catalogue application, original styles, admission controller, notification client and core application script match the Firebase website when Windows line endings are normalized.

## Included

- Replace the hero's fee box with the approved animated Apply Now button; retain fees in their other existing locations.
- Use “Admissions are open” in the top notice and closing homepage copy.
- Remove the Office skills, Tally Prime and Typing & accuracy cards surrounding the animated laptop. Keep the laptop and its motion control.
- Replace the three skill-challenge pills with the animated RC-style gold sparkle and scrolling card light effects; retain the questions and feedback.
- Add seven compressed course covers with application logos, curriculum highlights, duration and existing RC branding, plus a full-size gallery.
- Reduce course-card image height and spacing without truncating descriptions or removing Save, Compare, Syllabus, Apply or Brochure controls.
- Correct the mobile bottom Apply button's inherited gold-on-gold label colour and ensure all four quick actions fit their existing bar.
- Keep the original mobile styles. The earlier broad mobile redesign and preview-only admission/payment/notification adapters are absent.

## Validation

- All 23 existing visitor release, catalogue/PDF, payment-security and notification tests passed.
- Local Chromium checks passed at widths 320, 360, 390, 430 and 700: the complete Apply label and arrow fit within the button, use dark text, and navigate to admission.
- Desktop browser checks passed for all covers, search, saved courses, comparison, syllabus tabs, downloaded PDF structure, skill-question interaction, reduced motion and the full-cover gallery. No page errors occurred.
- Browser checks blocked every remote request and every non-GET/HEAD request. No production application, payment, notification, email or student-data write was made.
- The existing admission, photo and payment baseline digest tests pass. Original admission, payment, photo, notification, admin, backend and Firestore-rule files are unchanged.

## Deploy from the existing terminal

From the current website checkout, first inspect `git status --short`. Preserve any local edits; do not use a hard reset. After the approved update is merged, fetch the existing production-source branch and deploy Hosting only:

```bat
git fetch origin
git switch codex/admin-dashboard-redesign
git pull --ff-only
npx --yes firebase-tools@15.34.0 deploy --only hosting --project rehaan-computers
```

The Firebase CLI must use the account that owns `rehaan-computers`. If login has expired, run `npx --yes firebase-tools@15.34.0 login` in that terminal. Do not share credentials in chat.

Hosting reads `public/`. No Worker, Firestore rules, student data or payment configuration needs deployment for this release. Firebase must report `Deploy complete` before the live site is considered updated. Keep the earlier Hosting release available in Firebase Console for rollback.
