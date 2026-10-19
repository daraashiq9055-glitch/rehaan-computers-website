# Current homepage: small improvements preview

This earlier small-change concept has been superseded by the complete redesign in `previews/premium-home/`. The shared launcher `python preview-home.py` now opens that complete version. To revisit this older page, serve the repository root manually and open `/previews/current-home/`.

This preview keeps the current visitor website's black/gold identity, heading, background image, section order, about/process/tools/schedule/FAQ sections, full admission form layout, creator credit, map and social links. It replaces the rejected alternative homepage as the default local preview.

Changes to try:

- Shorter, brighter hero text; familiar desktop banner retained. Its duplicate banner is hidden on phones so courses are reached sooner.
- Gold course category tabs: All Courses, Computer Basics, Accounting, Typing. Search combines with the selected category. All seven existing courses remain under All Courses.
- The original course-card layout with clearer text, duration/level/certificate chips and separate admission/tuition wording.
- Course detail tabs: Overview, Syllabus, Fees & Batches. The existing detailed Tally modules are retained. Next/previous stay within the selected course category/search results.
- Keyboard support: arrows/Home/End for tab lists; Escape closes the native course dialog.

Run from Windows CMD:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python preview-home.py
```

Keep CMD open. The browser opens automatically at a free localhost port, so an old server cannot show a different page. The top note says **CURRENT WEBSITE PREVIEW** and the familiar heading says **Master Real Computer Skills**. Scroll to Courses to try the gold tabs. This is a local preview; no deployment is needed.

The preview imports only the existing public CSS, imagery/fonts and the read-only location interaction. Its own JavaScript reads local public course metadata. No original `script.js`, Firebase, photo-upload, email or payment SDK runs. The full application form is shown disabled in a fieldset; no private records are loaded, uploads accepted or payments created. Course Apply buttons simply select a course in that disabled form and scroll to it. Admin links show a preview notice rather than opening a live admin session.

This HTML is a snapshot of the existing homepage, with preview-specific additions. Any approved integration must be a separate reviewed change to production files, with admission/payment regressions before deployment. The contents of `public/`, Firestore rules, workers and Hosting configuration have not been edited for this preview.

Browser check:

```sh
python3 tests/current-home-preview-browser.py
```
