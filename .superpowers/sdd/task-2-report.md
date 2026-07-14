# Task 2 Report: Service Command-Center Shell

## Scope

Rebuilt only the `restaurant-pos-service-page` shell. The existing service-table workflow component, product picker implementation, service state, routing, API contracts, and order write flows were not reorganized or changed.

## Delivered

- Replaced the legacy summary widget with the Task 1 `serviceDashboardStats()` compact metric strip.
- Introduced the command-center header with service title, service-point search control, and kitchen navigation.
- Made the floor plan the dominant responsive canvas region, retaining the status legend, selected-service-point return action, and existing floor selection/focus bindings.
- Wrapped `app-service-table-panel` in a dedicated, responsive workflow shell without changing the panel's inputs or outputs.
- Retained the product search as the existing overlay. Its drawer implementation remains deliberately deferred to Task 4.
- Removed the now-unused `ServiceSummary` import.
- Added a focused command-center shell assertion for the header stats, floor canvas, and workflow panel test IDs.

## Verification

- Red: `pnpm exec ng test frontend --include src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts --watch=false` failed as expected before implementation because `service-dashboard-stats` was missing; the remaining 24 tests passed.
- Green: the same focused command passed with 25/25 tests.
- Build: `pnpm build` completed successfully.
- Diff hygiene: `git diff --check` completed successfully.

## Notes

- The brief's literal `pnpm test -- --watch=false <spec>` command is incompatible with this Angular CLI configuration: the script forwards the spec path as the project argument and the runner rejects the forwarded watch argument. The equivalent supported focused command above was used.
- The build retains existing repository warnings for the initial bundle budget, unrelated component-style budgets, and Mermaid CommonJS dependencies. No task-specific build failure or warning was introduced.

## Review Fix: Desktop Workflow Panel

- Promoted the service page's two-column grid from `2xl` to `xl`, so the workflow panel is positioned alongside the floor canvas at normal desktop widths.
- Promoted the workflow shell's sticky positioning from `2xl` to `xl` to keep the desktop panel behavior aligned with the two-column layout.
- Strengthened the command-center shell test with an exact `classList` assertion for `xl:grid-cols-[minmax(0,1fr)_26rem]`. This avoids the false positive where a substring assertion matched the old `2xl` token.

### Focused Evidence

- Red: the exact class-token assertion failed against the prior `2xl:grid-cols-[minmax(0,1fr)_26rem]` implementation; 24 other tests passed.
- Green: `pnpm exec ng test frontend --include src/app/features/restaurant-pos/pages/restaurant-pos-service-page/restaurant-pos-service-page.spec.ts --watch=false` passed with 25/25 tests after the `xl` change.
