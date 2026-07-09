# Developer Logs Dynamic Audit Insights Design

## Goal

Extend `/developer/logs` so the top insight band becomes dynamic by active view:

- `Operations` keeps operational health signals
- `Audit` switches to activity, risk, and current focus signals

At the same time, apply a final visual polish pass so filters, insights, KPI cards, and the dense table read as one coherent dashboard instead of separate blocks.

## Scope

In scope:

- dynamic insight-card content driven by `view()`
- audit-specific insight logic
- small presentational polish across the page layout
- focused frontend tests

Out of scope:

- backend API changes unless a missing field blocks the design
- new charts
- new routes
- broad shared design-system refactors

## Design Direction

Keep the current three-card insight band and preserve its layout. Only the card content and click actions change depending on the active developer-logs view.

This avoids moving the interface around while still making the top row relevant to the user's current task.

## Operations View

Operations continues to show:

1. `Overview`
   - request volume
   - current error rate
   - period context

2. `Main alert`
   - prioritize degraded error rate, then latency, then error count

3. `Current focus`
   - top error event, then slow path, then busiest channel

This remains unchanged in spirit from the recently added mixed insight band.

## Audit View

Audit replaces the operational signals with a mixed audit readout:

1. `Activity`
   - the strongest activity signal in the current audit result set
   - prefer actor-focused language when actor data exists
   - fallback to entity-focused language when actor data is not meaningful

2. `Risk`
   - prioritize failed audit actions
   - if failure signal is weak or absent, fall back to the highest-risk visible focus such as auth-related actions or a concentrated entity area

3. `Current focus`
   - the most actionable current hotspot in audit terms
   - examples:
     - auth activity concentrated in one channel
     - one entity type dominating recent actions
     - one actor driving most visible activity

## Audit Insight Inputs

Preferred sources:

- `summary.auditEvents`
- `summary.comparison`
- current event rows already loaded in the page
- current filters

The audit view can derive useful signals from event rows already fetched for the current page, plus current summary totals. This is intentionally lightweight and avoids expanding the backend in this slice.

## Audit Card Semantics

### Activity card

Purpose:
- show who or what is driving the current audit window

Recommended derivation:
- count visible loaded events by `userId`
- if actor ids are mostly absent, count by `entityType`
- fallback to total audit-event volume

Examples:
- `Most active actor`
- `Most changed entity`
- `Audit activity in range`

Behavior:
- clickable when tied to an actor or entity filter
- otherwise read-only

### Risk card

Purpose:
- highlight the riskiest current signal

Recommended derivation order:
1. failed audit results in current visible rows
2. auth-related audit focus
3. flat safe-state fallback

Examples:
- `Failed audit actions rising`
- `Auth actions need review`
- `No risky signal highlighted`

Behavior:
- failed result click applies `result: failed`
- auth click applies `entityType: auth`
- no-risk fallback is non-interactive

### Current focus card

Purpose:
- tell the user where to click next

Recommended derivation order:
1. top `entityType` in visible rows
2. top `clientOrigin` among audit rows
3. top actor in visible rows
4. neutral fallback

Behavior:
- clickable when tied to a real filter

## Visual Polish

This slice should also tighten the page visually without redesigning it.

Polish targets:

- reduce the feeling of separate stacked modules
- align top-row spacing between shortcuts, insights, and KPI cards
- make the filter card, insight band, and summary cards feel like one dashboard sequence
- reduce small inconsistencies in vertical rhythm and card density

Specific polish changes:

- slightly tighten gaps between top sections
- normalize header-to-card spacing
- strengthen section hierarchy with subtle typography and spacing changes, not heavy chrome
- keep cards compact and avoid adding new decorative surfaces

## Implementation Strategy

Use one computed builder for insight cards that branches by `view()`:

- `buildOperationsInsightCards(...)`
- `buildAuditInsightCards(...)`

Then a thin dispatcher:

```ts
const cards = this.view() === 'audit'
  ? buildAuditInsightCards(...)
  : buildOperationsInsightCards(...);
```

This keeps the logic readable and prevents the existing operations path from becoming tangled with audit-specific heuristics.

## File Impact

Expected files:

- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.ts`
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.html`
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.css`
- `frontend/src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- `frontend/public/i18n/es.json`
- `frontend/public/i18n/en.json`
- `frontend/public/i18n/ca.json`

No shared table or backend changes are expected for this slice unless testing reveals an unavoidable gap.

## Testing

Add focused page coverage for:

- audit view renders audit-specific insight text
- clicking audit risk insight applies the expected audit filter
- clicking audit activity or focus insight applies actor/entity/origin filters when available
- operations view still renders the existing operational insight behavior

Verification target:

- `pnpm exec ng test --watch=false --include src/app/features/developer/pages/developer-logs-page/developer-logs-page.spec.ts`
- `pnpm exec ng test --watch=false --include src/app/shared/ui/chart/chart.spec.ts`
- `pnpm build`

## Risks And Mitigations

### Risk: audit insights feel weak because they use currently loaded rows

Mitigation:
- keep the wording honest and contextual
- favor “current focus” and “visible activity” language over pretending to be a global audit engine

### Risk: dynamic insight behavior confuses users

Mitigation:
- preserve identical card positions
- only swap titles/content, not the layout
- keep naming short and explicit

### Risk: visual polish drifts into redesign

Mitigation:
- constrain changes to spacing, hierarchy, and density
- no new layout paradigm, no new surface system

## Recommendation

Use dynamic insights by active view with a mixed audit readout.

Why:

- it makes the top band context-aware without forcing the user to relearn the page
- it gives audit work its own language and priorities instead of recycling operational signals
- it fits naturally with the current dashboard architecture and recent changes
