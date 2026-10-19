# Visitor homepage design preview

This earlier alternative design was not selected. The launcher `python preview-home.py` now opens the complete redesign in `previews/premium-home/`. Use the manual server/address below only to revisit this earlier alternative.

This is a separate, disconnected design preview. Nothing under `public/`, the admin dashboard, the live admission form, Firebase rules, workers or payment services is changed. The seven course records were copied from the existing public course definitions. The photographs are existing website imagery, not new photographs of the institute.

To revisit this earlier alternative only, run from Windows CMD:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
python -m http.server 8002 --bind 127.0.0.1
```

Keep that CMD window open and open this exact address:

http://localhost:8002/previews/visitor-home/

Serve the **repository root**, not `public/` or the preview subfolder. The preview reuses existing photographs/fonts through relative paths. There is no `admin.html` inside this preview. If port 8002 is in use, use 8003 in both the command and browser address. Press Ctrl+C in CMD to stop.

Features to try:

- Desktop/mobile navigation, course categories and search, including empty results.
- All seven course syllabus dialogs and the detailed Tally syllabus.
- Course finder with four learning goals.
- Compare two courses side by side; a third selection is blocked until one is removed.
- Course selection populates the local application mock-up. Its next-step preview never submits data, starts a payment or saves form details.
- WhatsApp enquiry dialog lets visitors edit/copy a message. It deliberately does not open a chat, because an institute destination number has not been supplied. Nothing is sent.
- FAQs, exact-location Google Maps directions and the existing official Facebook page.
- Self-hosted fonts, keyboard controls and reduced-motion support.

The CSS map illustration is decorative; the directions button opens real Google Maps. Course recommendations match existing course topics; they are not admission decisions or promises of employment. Actual batch availability and tuition must be confirmed with the centre. There are no invented reviews, student counts or seat-availability claims.

Do not deploy this preview as a replacement homepage. After design review, approved elements can be integrated with the existing tested admission/payment flow as a separate change.

Local browser check (Playwright and Chromium required):

```sh
python3 tests/visitor-home-preview-browser.py
```
