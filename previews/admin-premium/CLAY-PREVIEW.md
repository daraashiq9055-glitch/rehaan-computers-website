# Clay brown / soft butter colour study

Run `python preview-clay-admin.py` from the repository root. The localhost address
opens automatically; keep CMD open. Use a separate CMD window if a release is
currently running, and wait for that release to finish before pulling changes.

The complete existing demo dashboard uses clay brown #6B352A and soft butter
#FFF1A6 with warm cream text. Green/red status colours retain their meaning.
The local server maps the existing interface CSS into this palette; document
paper colours remain separately controlled. No transaction code is changed.

Fictional demo students only. Firebase, photo and payment adapters stay mocked;
no real sign-in, uploads, payments or messages. Reload resets demo edits.

The launcher and clay-study.css are not used by prepare-admin-release.py.
This is an unapproved colour preview, not a production theme change.

Verification: `python tests/admin-clay-preview-browser.py` checks 11 sections at
1440, 390 and 320 pixels, browser errors and unchanged demo records; external
requests are blocked.
