# Small fix for the deployed Monday pre-follow release

The public live code was inspected: admin-next/ui.js opens the reminder dialog
but its WhatsApp handler only displays an instruction. It never opens wa.me.

The patch enables the saved-number chat with the complete encoded reminder text.
It also adds a general WhatsApp action to each student/application, including
fully-paid students. Invalid numbers require correction in Details. All actions
require the admin session; reminders reject a changed record. Opening a chat
never sends the message or marks a payment paid. Images are attached manually.

Run from the repository root in Windows CMD:

```bat
git pull --ff-only
python patches/whatsapp-current.py --deploy
```

The script identifies the local build matching the live admin page and verifies
its hosted files byte-for-byte against the site. It stops on a mismatch. It copies
the matched release to build/whatsapp-release, preserves an earlier patch output
under a timestamped backup name, and changes only admin.html, admin-app.js,
admin-next/ui.js plus two new WhatsApp helper/style files. It does not include
unreleased follower/notification features, new rules or payment code changes.
The existing inline scripts and CSP hashes are preserved.

The `--deploy` option runs Firebase Hosting only from the generated patch folder,
after every verification passes. There is no manual folder change. Omit this
option to prepare files without publishing. A mismatch or patch failure prevents
the deployment command from running. The Monday colours/layout remain intact.

For a build stored elsewhere, specify `--source "C:\absolute\release-folder"`.
Preparation and tests do not publish; deployment requires --deploy. Keep the original
release folder for Hosting rollback. A Hosting rollback does not restore deleted
student records or undo payments.
