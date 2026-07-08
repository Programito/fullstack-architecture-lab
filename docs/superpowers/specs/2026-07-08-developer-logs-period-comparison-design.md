# Developer Logs Period Comparison Design

## Goal

Add a lightweight period-over-period comparison to the developer logs dashboard so the main KPIs show whether requests, errors, audit activity, error rate, and latency are improving or worsening versus the immediately previous time window.

## Scope

This iteration adds comparison only to the summary KPI layer.

It does not add:
- a second timeline series
- comparison variants for breakdown charts
- comparison variants for top errors or top slow paths
- export or alerting behavior

## Recommended Approach

Extend the existing backend summary endpoint so it returns both:
- the current summary for the selected `from`/`to` range
- a compact comparison object calculated over the previous adjacent window with the same duration

The frontend keeps using the same summary request, then renders a short delta line under each KPI card. This keeps the UX compact, avoids additional dashboard requests, and preserves the current chart layout.

## Comparison Window

For a selected range:
- current window: `from` to `to`
- previous window: `from - duration` to `from`

Where `duration = to - from`.

The previous window must use the same active filters as the current one, including:
- category
- level
- client origin
- path
- actor/user filters
- restaurant filter
- audit entity filters
- search
- demo-account visibility restriction

## Backend Design

### API contract

`GET /api/v1/developer/logs/summary` keeps the same route and gains a new `comparison` object in the response.

### Data shape

The summary response adds:

- `comparison.previous`
  - `totalRequests`
  - `errorCount`
  - `errorRate`
  - `auditEvents`
  - `p95DurationMs`
- `comparison.delta`
  - one entry per KPI
  - `absolute`
  - `percent`
  - `direction`

`direction` is:
- `up`
- `down`
- `flat`

For `percent`:
- if previous value is `0` and current is also `0`, return `0`
- if previous value is `0` and current is non-zero, return `null`

This avoids fake infinite percentages in the UI.

### Service strategy

Reuse the existing summary aggregation logic instead of duplicating controller logic:
- extract a private helper that computes summary metrics for an arbitrary window
- call it once for current window
- call it once for previous window
- compose the response with the new comparison object

This keeps the dashboard contract centralized in `ObservabilityService`.

### Performance

This adds one extra summary computation per dashboard refresh.

That is acceptable for this iteration because:
- it stays inside the existing summary endpoint
- it does not change events pagination queries
- it does not add extra frontend round-trips

If later the dashboard becomes heavier, the summary helper can be optimized or cached independently.

## Frontend Design

### KPI presentation

Each KPI card gets a secondary line under the main value:
- positive delta uses success/neutral-positive styling
- negative delta uses danger styling for metrics where higher is worse
- for requests and audit events, higher can stay neutral-positive
- for errors, error rate, and p95 latency, higher should read as worse

### Copy behavior

Use concise text such as:
- `+12 vs anterior`
- `-8.3% vs anterior`
- `Sin comparativa` when previous value is zero and percent is not meaningful

The UI should privilege fast scanning over analytical detail.

### Metrics covered

This iteration shows comparison under:
- total requests
- error count
- error rate
- audit events
- p95 latency

It does not add comparison to channel cards.

## Testing

### Backend

Add focused service tests for:
- previous window boundaries
- delta calculation with positive, negative, and flat results
- zero-baseline handling

Add integration coverage if summary SQL or filtering behavior changes in a way that risks date-window regressions.

### Frontend

Add page tests for:
- rendering comparison text under KPI cards
- rendering sensible fallback when previous value is zero
- preserving current KPI click-to-filter behavior

## Risks and Guardrails

- Do not change existing summary fields that the dashboard already relies on.
- Do not compute comparison on the frontend from partial data.
- Do not invert semantic coloring for “bad when up” metrics like errors or latency.
- Keep the new UI compact so the dashboard does not become visually noisy.

## Success Criteria

- Summary endpoint returns current plus previous-period comparison in one response.
- KPI cards display comparison without shifting the rest of the dashboard structure.
- Existing filters still drive both current and previous windows consistently.
- Existing focused tests and build remain green after the change.
