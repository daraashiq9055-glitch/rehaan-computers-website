# Homepage administrator navigation fix

The logo-menu Admin login link disappeared during pointer focus transfer. Its
focusout handler checked activeElement in a microtask, before focus reached the
link. It now checks the focus event's relatedTarget, so moving focus within the
menu keeps it open. Both homepage Admin login links use native same-tab navigation
to the existing admin.html. The visitor module graph has a new cache version.

Verified using local files and a mocked SDK: logo click, keyboard Enter and footer
click at mobile/desktop widths reach the enabled admin sign-in form in one tab;
Back returns to the homepage. There are no real record writes, messages, payments
or authentication requests in these checks. Existing admin and payment logic are
unchanged. The release fingerprint tests confirm admission, photo and payment
implementations still match the saved live baseline.

Deploy the link fix with Hosting only from Windows CMD:

```bat
cd /d "%USERPROFILE%\rehaan-admin-preview"
git pull --ff-only
npx --yes firebase-tools@15.34.0 deploy --only hosting --project rehaan-computers
```

Any admin UI preview under previews/ is separate from public/ and is not included
in Hosting deployments. No cloud deployment is performed by these checks.
