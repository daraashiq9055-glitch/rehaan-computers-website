# Settings design review

Run `python preview-settings.py` from the repository root. This is a focused,
standalone Settings prototype, not a live admin configuration editor. Other sidebar
sections are labelled references; use `preview-admin.py` for the existing complete
admin preview. The production build does not include this directory or launcher.

Working design interactions:
- Institute identity edits update the identity sample and document examples.
- Receipt/marks sample selection, paper colour and footer draft controls.
- Three editable message templates, sample token substitution, token insertion,
  copy sample text and reset. No WhatsApp link or message sending is performed.
- Backup and recovery review steps explaining the existing protected export and
  boundaries of website rollback. No student backup is generated here.
- A password-reset flow review; no authentication or reset email is triggered.
- India-time format and reduced-motion controls.
- Export settings draft downloads a JSON explicitly marked `liveApplied:false`
  and `studentRecordsIncluded:false`. Drafts are memory-only until exported;
  refresh/closing loses edits. There is no draft import or automatic live apply.

Defaults reflect the discussed institute contacts. Document examples are
fictional; signature assets are not included. Current receipt numbers, charges,
student records, templates, authentication and payment code remain untouched.

Validation: `python3 tests/settings-studio-browser.py` covers the six panels,
linked edits, safe template rendering, draft export, dialog reviews and all panels
at 320/390/768/1024/1512px. External requests are blocked by the test.
