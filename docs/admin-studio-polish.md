# Admin presentation refinement

Review with `python preview-admin.py` after pulling the latest branch. Fictional
records and the existing local service adapters are used. Nothing is deployed.

The existing dashboard receives clearer typography, a navy gradient sidebar and
topbar, champagne navigation accents, more readable student metadata and filters,
consistent rounded controls, and softer card borders/shadows. Fine-pointer hover
adds a two-pixel lift to summary cards; the header accent enters once. Reduced
motion disables these effects. Mobile search fields use 16px text and primary
register actions retain at least 44px touch height.

All additions are screen-only and scoped to the dashboard. Attendance retains its
approved ivory layout. Existing navigation and transaction modules are unchanged.
No additional tabs or persistence fields are introduced. The release builder
already includes the shared theme when a future release is approved.

The older preview test's mark-heading expectations were updated to the existing
modern mark layout (#132c43, 32px), replacing the superseded green 26px assertions.
The mark layout itself was not modified.

## Navigation, top bar and Settings

Existing sidebar controls are grouped in DOM/keyboard order: Daily Work starts
with Overview, Today, Students and Admissions, followed by Attendance, Fees,
Fee Statements and Marks. Institute & Records follows. My workspace and Settings
are last. No navigation handler or record transaction is replaced.

The top bar shows the existing quick search, date and a live Asia/Kolkata clock.
Settings offers 24-hour format, reduced motion, reset display choices, and links
to existing backup/export and workspace preference screens. Only two boolean
display preferences are stored locally in this browser; no student data is stored
by these controls. OS reduced-motion preferences remain respected.

The dedicated shell browser checks passed navigation order, settings links,
India time, both display choices, search and five viewport widths without student
writes. The generated candidate regression also passed student creation, payment,
receipt, marks/export, logout and missing-optional-asset checks. Preview only.
