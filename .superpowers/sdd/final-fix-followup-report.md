# Reservations Drawer Final Follow-up Report

## Scope

Fixed the final reservations drawer review findings in the reservations page only.

## Changes Delivered

- Added a reactive service-slot invariant: when service windows load, are saved, or the active service changes, an invalid `creationForm.time` is replaced with the first slot of the active service.
- Changed creation readiness to require that the selected time belongs to `activeSlots()`.
- Added the same membership check to request construction so a stale programmatic form value cannot reach the create-reservation API.
- Restored `manualTables` as the complete table list.
- Added a manual-selection mode that swaps out suggested controls while its full list is open, so each table has only one accessible checkbox representation at a time.

## Regression Coverage

- A custom initial service window from 18:00 to 19:00 corrects the legacy default time of 13:30 to 18:00.
- Saving an edit that moves the active lunch window to 14:00 corrects the selected time to 14:00.
- A non-member time reports the time step as incomplete and is not submitted.
- The manual fallback contains all tables and exposes one accessible checkbox per table when opened.

## Verification

- Passed: `pnpm test -- --include src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
  - 1 test file passed, 37 tests passed.
- `pnpm test -- --watch=false` is not compatible with this Angular CLI configuration because it rejects the `watch` argument. The focused command above is the supported equivalent and completed successfully.
- `pnpm build` compiled the application but exited non-zero on pre-existing CSS budget errors outside this change:
  - `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`: 13.29 kB vs 12 kB budget.
  - `frontend/src/app/features/identity/pages/login-page/login-page.css`: 18.46 kB vs 12 kB budget.
  - The reservations page stylesheet also has an existing warning at 11.99 kB vs its 11 kB warning budget; this follow-up changed no CSS files.

## Commit

The implementation and this report are committed together in the follow-up commit created for this task.
