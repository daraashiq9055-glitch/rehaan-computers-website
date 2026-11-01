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
