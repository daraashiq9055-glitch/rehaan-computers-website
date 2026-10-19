# Complete premium visitor experience

This is the complete redesigned visitor preview agreed after the earlier small-change concepts. The familiar brand uses deep sapphire/navy, champagne gold and ivory, with larger text, interactive learning tools, course discovery and a guided admission journey. **It is outside Firebase Hosting's `public/` directory. No live files, admin dashboard, rules, Workers or records are changed.**

## Open from Windows CMD

Stop the previous server using Ctrl+C, then run:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python preview-home.py
```

Keep CMD open. The launcher chooses a free localhost port, disables caching and opens this preview automatically. Look for **COMPLETE DESIGN PREVIEW** and the photo-led **Your learning journey** feature. If no tab opens, copy the printed URL exactly. No asterisks belong in a URL. `--no-browser` prints the address without opening a tab.

Manual alternative from the repository root:

```bat
python -m http.server 8002 --bind 127.0.0.1
```

Then open `http://localhost:8002/previews/premium-home/`.

## Latest visual refinements

- The original ten skills run in a compact moving line above the main header. There is no pause button; hovering pauses the line and reduced-motion preferences stop it.
- A local RC learning logo appears in the header, footer and favicon. Clicking the header logo/name opens a keyboard-accessible menu. Its Admin login link opens the existing live sign-in page in a separate tab only when clicked; no administrator credentials or records are used by this preview.
- Personal guidance shows the two existing real learner/laptop photographs one at a time, advancing automatically every five seconds while visible, including when hovered or focused. It pauses for hidden tabs, manual pause and reduced-motion preferences. Dot and arrow-key controls work. Software screenshots are kept out of this section.
- Dar Yasir's footer credit has gold shine and subtle moving accents. Motion stops on hover/focus and with reduced-motion preferences.
- Generated course artwork and its separate three-image showcase have been removed. Each of the seven course cards uses a different original photograph or software screenshot, with descriptive alternative text. Tally and Marg use their actual interfaces, displayed without cropping away menus. Original course metadata is unchanged.
- **New learner-photo selection remains pending:** Pexels and Unsplash downloads returned HTTP 403 from the environment proxy. Required photo-site domains have been saved in the environment configuration draft, preserving the existing domains. Apply those settings before downloading and visually reviewing new learner/typing photographs. The current preview uses only already inspected local images; it does not fetch blocked images or silently substitute generated artwork.
- Larger body, navigation, course, form and dialog text is checked at six screen widths. Explore, Your next step and Stay connected use larger rounded pill links. Social links include local Instagram/Facebook logos and a location icon; destinations are unchanged.

## Features that work

1. A photo-led learning journey replaces the spreadsheet/accounting/document workspace. An existing real learning photograph, three Choose / Practise / Grow stages, gold progress line and a course-finder action explain what visitors can expect. Stages advance every 6.5 seconds while visible, with manual and keyboard navigation. Motion pauses for keyboard focus, manual pause, hidden tabs and reduced-motion preferences. No invented student numbers, results or job guarantees are shown.
2. Searchable seven-course catalogue, category/duration filters, empty states and saved-course view.
3. Save courses across visits on the same browser. Only stable public course slugs are stored under `rehaan-visitor-saved-courses-v1`. Student/application fields and photos are never saved to browser storage.
4. Compare two or three courses side by side; a fourth selection is blocked. Smaller screens use an inner horizontal table scroller.
5. Individual course routes (`#course=...`), copyable course links, Overview / Syllabus / Fees & Batches tabs, complete detailed Tally modules and keyboard tab navigation. Localhost links work on that computer; public shareable links require later integration into the live site.
6. Real downloadable PDF brochures, generated locally using self-contained vector PDF text. They contain the complete selected course syllabus, duration/level/certificate, practical work, who the course is for, fees/batches/documents, contact information and creator credit. Brochures are labelled design-preview course guides. Built-in PDF fonts represent rupees as `Rs.` and convert arrows/dashes to readable ASCII. Brochures contain no student data or payment confirmation.
7. Three-question course finder: goal, experience and available learning time. Suggestions use the existing curricula; they are not guarantees of admission or employment.
8. Course-specific editable WhatsApp drafts to either user-confirmed institute contact: **+91 9149551258** or **+91 9797205429**. Opening WhatsApp is a user action. Nothing is sent automatically. Visitors can also copy the message.
9. A real 30-second typing challenge with elapsed-time WPM, text accuracy, reset and paste prevention. Results stay on the page and are not assessment marks.
10. Five-step admission preview retaining every existing field: Student Details → Course & Batch → Photo & Documents → Review → Payment Information. Required fields, email/phone/date checks, backward edits and forward-jump revalidation work. It creates a square photo crop locally, with a sample-photo option for testing. Preview photos are object URLs in memory, revoked on removal/reset. Review includes all fields, the photo and edit actions.
11. A labelled final payment-information step showing the separate **₹100 admission fee**, with the existing confirmation checkbox. **Finish preview never calls Firebase, Cloudinary, email, Razorpay or any payment service.** It shows a local completion message, never a payment-success confirmation.
12. Existing about/benefits/tools/process/batch/FAQ information, expandable learning-image gallery, exact-coordinate map directions, both phone links, all original social links and redesigned Dar Yasir creator credit. Gallery pictures are labelled as existing learning imagery; no new actual classroom photograph or testimonial is invented.
13. Responsive navigation, phone quick actions, native dialog keyboard/focus handling, reduced-motion support and self-hosted fonts.

## Content preservation

`courses.json` is an exact snapshot of the existing public course definitions, including all detailed syllabus modules. `site.json` retains the original about text, benefits, four admission steps, tools, batch descriptions and seven FAQs. All application field names and qualification/source/gender choices are preserved. The two new contact numbers were explicitly provided in this conversation.

Admission is open all year. Batch timings/availability and tuition beyond the separate ₹100 admission fee are not invented. Existing public text about emailed confirmations and institute formalities describes the real admission process; the preview itself does not send mail or complete admission.

The previous previews remain in their folders as earlier concepts. `preview-home.py` now opens this complete version by default.

## Validation

```sh
node --test tests/premium-home-model.test.mjs
python3 tests/premium-home-browser.py
python3 tests/premium-home-motion-browser.py
```

The pure checks cover curriculum/field preservation, actual duration filtering, all goal/experience/time recommendations, typing calculations and PDF object offsets. Browser checks exercise all major interactions, parse downloaded multi-page PDFs, verify each Tally module, test both WhatsApp destinations through intercepted popups, traverse the complete form, check memory-only personal data, and cover six viewport widths. Live service requests and record writes are blocked by the test.

The motion suite checks the hero journey's timed advancement, pause/resume, keyboard navigation and course finder, along with the logo/menu, keyboard controls, the top skills line without a pause button, automatic slideshow advancement while hovered/focused, manual controls, reduced motion, seven distinct original course-image mappings and mobile containment. It does not navigate to the live administrator page.

This preview is ready for design review, not production deployment. Approved elements must be integrated separately with the existing verified application/photo/payment flow, preserving its transaction and permission protections and rerunning payment/admission regressions before any Hosting release. Private application-status tracking remains a future backend feature.
