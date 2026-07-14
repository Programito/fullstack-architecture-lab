# Reservations Drawer Final Follow-up 2

## Status

Implemented the two remaining Important review fixes and the requested polish:

- The reservations occupancy strip is now hidden whenever the selected day is loading or has a load error, so it cannot present prior-day or otherwise stale state during a reload.
- `app-dialog` now maintains an ordered open-dialog stack. Only the topmost dialog handles Escape, and each open dialog receives a higher z-index than the dialog beneath it.
- The reservation-creation CTA displays the shared spinner while submission is in progress.
- The occupancy strip now displays the existing `upcomingCount` derived field.

## Regression Coverage

- Reservations page: date-change reload keeps old data in the store but hides the occupancy strip while pending.
- Reservations page: failed date reload hides the occupancy strip even when prior reservations remain in the store.
- Reservations page: creation CTA shows a spinner and remains disabled while its request is pending.
- Dialog: Escape closes only the topmost nested dialog, leaving the drawer open.
- Dialog: a topmost dialog with `closeOnEscape="false"` prevents Escape from closing either itself or the underlying drawer.

## Verification

Passed:

- `pnpm test -- --watch=false --include='src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts'` (40 tests)
- `pnpm test -- --watch=false --include='src/app/shared/ui/dialog/dialog.spec.ts'` (14 tests)
- `git diff --check`

`pnpm build` completed bundling but exited non-zero due to existing CSS budget errors outside this change:

- `src/app/features/identity/pages/login-page/login-page.css`: 18.46 kB exceeds the 12.00 kB error budget.
- `src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`: 13.29 kB exceeds the 12.00 kB error budget.

The build also reports an existing warning for the reservations-page stylesheet (11.99 kB versus an 11.00 kB warning budget), but this follow-up changed no CSS. No compilation, template, or type errors were reported for the touched files.

## Scope

Modified only:

- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.html`
- `frontend/src/app/features/restaurant-pos/pages/restaurant-pos-reservations-page/restaurant-pos-reservations-page.spec.ts`
- `frontend/src/app/shared/ui/dialog/dialog.ts`
- `frontend/src/app/shared/ui/dialog/dialog.html`
- `frontend/src/app/shared/ui/dialog/dialog.spec.ts`
