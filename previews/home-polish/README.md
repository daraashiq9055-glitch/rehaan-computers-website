# Clean modern homepage preview

Run from Windows CMD in the existing checkout:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
python preview-clean-home.py
```

A new browser tab opens at a free localhost port. The title is **Rehaan Computers
· Clean modern homepage preview** and the page has a **NEW HOMEPAGE PREVIEW**
strip. If a browser does not open automatically, copy the printed URL. Keep CMD
open; Ctrl+C stops the server. `--no-browser` prints the address without opening.

The design is derived from the current public homepage, with an isolated CSS/JS
layer. It includes all seven requested changes:

1. A shorter first-screen headline, two main actions and a compact tuition panel.
2. Aligned course cards with consistent image areas, readable duration/level and
   syllabus/apply/compare/brochure actions; all seven curricula are unchanged.
3. More deliberate spacing and typography, navy/gold with warm reading surfaces.
4. Refined learning/guidance/gallery sections using only existing site imagery.
   Existing learning images are illustrative. No new genuine-centre photograph,
   testimonial, accreditation or student outcome is invented or claimed.
5. A simpler mobile header, readable cards, comfortable controls and bottom
   navigation; contact guidance is available without a second floating widget.
6. Existing FAQs plus beginner/course-guidance answers based on the current
   catalogue. Search, topic filters, single-open accordions and empty states.
7. Quieter motion: stationary laptop, restrained desktop skill animation,
   static mobile decoration and reduced-motion support.

The launcher reads the current public HTML/catalogue/assets without modifying
those files. The admission section uses the existing memory-only preview form.
It cannot start Razorpay, submit an application, upload a photo, send a message,
load Firebase or alter student records. Contact/admin links show preview feedback;
the map is a local address placeholder. Saved course choices use a separate
preview-only browser-storage key; form entries stay in memory and clear on reload.
A self-only CSP and read-only local server provide additional separation.

This preview is outside `public/`, is not part of `prepare-admin-release.py`, and
will not be included in Hosting deployments. Review before any live integration.

Check: `python3 tests/home-polish-preview-browser.py`. It covers the design at
mobile/tablet/desktop widths, catalogue/FAQ/discovery actions, brochures, local
admission completion and zero external requests or write requests.
