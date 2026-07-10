# Menu Audit, Modifiers, and Extras Backend + Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the restaurant menu modifier model across Prisma, NestJS, and Angular so modifiers, extras, and removals are explicit, then update menu audit scoring and UI to use that richer contract.

**Architecture:** Introduce an explicit modifier intent field at the persistence and API layers, thread it through backend ports, use cases, DTOs, and read repositories, then consume it in the Angular menu feature to drive rendering, summaries, and audit scoring. Keep the current `restaurants` bounded context and the existing Angular `features/menu` structure, evolving both with focused tests before changing UI behavior.

**Tech Stack:** Prisma, NestJS, class-validator, Angular standalone components, Transloco, Vitest, Testing Library, pnpm.

## Global Constraints

- Run backend commands from `backend/` and frontend commands from `frontend/`.
- Follow red-green-refactor for each changed behavior.
- Keep translations complete for `es`, `en`, and `ca`.
- Preserve the current clean-architecture backend split: `domain`, `application`, `infrastructure`, `presentation`.
- Keep visible UI text kind, formal, and direct in Spanish.
- Do not introduce unrelated schema changes or unrelated refactors.

---

## File Structure

- Modify: `backend/prisma/schema.prisma`
  Purpose: persist an explicit modifier intent alongside the current selection type.
- Create: `backend/prisma/migrations/<timestamp>_add_modifier_group_intent/migration.sql`
  Purpose: migrate existing modifier groups to the richer model.
- Modify: `backend/src/restaurants/application/ports/modifier-group-repository.port.ts`
  Purpose: expose intent in create/list contracts.
- Modify: `backend/src/restaurants/application/use-cases/create-modifier-group.use-case.ts`
  Purpose: accept and persist modifier intent.
- Modify: `backend/src/restaurants/application/use-cases/create-modifier-group.use-case.spec.ts`
  Purpose: prove backend modifier-group creation accepts intent.
- Modify: `backend/src/restaurants/domain/restaurant-read.models.ts`
  Purpose: expose intent in menu read models.
- Modify: `backend/src/restaurants/presentation/rest/dto/create-modifier-group.dto.ts`
  Purpose: validate and document the new REST field.
- Modify: `backend/src/restaurants/presentation/rest/dto/modifier-group-response.dto.ts`
  Purpose: return intent in modifier-group admin responses.
- Modify: `backend/src/restaurants/presentation/rest/dto/restaurant-menu-response.dto.ts`
  Purpose: return intent in menu-read responses.
- Modify: `backend/src/restaurants/presentation/rest/restaurant-modifier-groups.controller.ts`
  Purpose: pass the new field into the use case.
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-modifier-group.repository.ts`
  Purpose: write and read the new field from Prisma.
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts`
  Purpose: include intent in restaurant menu reads.
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-order-catalog.repository.ts`
  Purpose: include intent in order-catalog reads if shared menu modifier structures depend on it.
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`
  Purpose: extend frontend DTO contracts with modifier intent.
- Modify: `frontend/src/app/features/menu/models/modifier-group.model.ts`
  Purpose: use explicit modifier intent instead of price-only inference.
- Modify: `frontend/src/app/features/menu/services/menu-api.service.ts`
  Purpose: map backend DTOs into the richer frontend model.
- Modify: `frontend/src/app/features/menu/services/menu-mock.service.ts`
  Purpose: keep mock data aligned with the richer model.
- Modify: `frontend/src/app/features/menu/components/modifier-group-form-dialog/*`
  Purpose: create modifier groups with explicit intent.
- Modify: `frontend/src/app/features/menu/services/menu-pricing.service.ts`
  Purpose: build summaries and upgrade lists from intent.
- Modify: `frontend/src/app/features/menu/services/menu-audit.service.ts`
  Purpose: replace binary menu health with weighted scoring.
- Modify: `frontend/src/app/features/menu/components/menu-health-panel/*`
  Purpose: render explicit weighted score.
- Modify: `frontend/src/app/features/menu/pages/menu-page/*`
  Purpose: render clearer modifier/extras/audit behavior.
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`
  Purpose: keep the revised menu copy complete in all supported locales.

### Task 1: Add Explicit Modifier Intent to Prisma and Backend Contracts

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_modifier_group_intent/migration.sql`
- Modify: `backend/src/restaurants/application/ports/modifier-group-repository.port.ts`
- Modify: `backend/src/restaurants/application/use-cases/create-modifier-group.use-case.ts`
- Modify: `backend/src/restaurants/application/use-cases/create-modifier-group.use-case.spec.ts`
- Modify: `backend/src/restaurants/presentation/rest/dto/create-modifier-group.dto.ts`
- Modify: `backend/src/restaurants/presentation/rest/dto/modifier-group-response.dto.ts`
- Modify: `backend/src/restaurants/presentation/rest/restaurant-modifier-groups.controller.ts`
- Modify: `backend/src/restaurants/domain/restaurant-read.models.ts`
- Modify: `backend/src/restaurants/presentation/rest/dto/restaurant-menu-response.dto.ts`

**Interfaces:**
- Consumes: current `selectionType: 'single' | 'multiple'`.
- Produces:
  - `ModifierGroupIntent = 'choice' | 'extras' | 'remove'`
  - `intent` field in Prisma, backend entities, create commands, admin responses, and menu responses.

- [ ] **Step 1: Write the failing backend tests**
- [ ] **Step 2: Add Prisma enum/field and migration**
- [ ] **Step 3: Thread `intent` through backend ports, DTOs, use case, and controller**
- [ ] **Step 4: Expose `intent` in menu read domain/response DTOs**
- [ ] **Step 5: Run focused backend tests and Prisma generate/build commands**

### Task 2: Persist and Read Modifier Intent Through Prisma Repositories

**Files:**
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-modifier-group.repository.ts`
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-read.repository.ts`
- Modify: `backend/src/restaurants/infrastructure/persistence/prisma-restaurant-order-catalog.repository.ts`
- Modify: related repository specs/integration specs that assert modifier-group shapes

**Interfaces:**
- Consumes: backend `intent` contracts from Task 1.
- Produces:
  - persisted `intent` on modifier group creation
  - read-side menu/order-catalog modifier groups that include `intent`

- [ ] **Step 1: Write failing repository/spec assertions for `intent`**
- [ ] **Step 2: Update Prisma repository create/read mappings**
- [ ] **Step 3: Update read repository and order-catalog mappings**
- [ ] **Step 4: Run focused backend repository tests**

### Task 3: Consume Explicit Intent in Frontend Models and Authoring Flow

**Files:**
- Modify: `frontend/src/app/features/restaurant-pos/api/restaurant-pos-api.models.ts`
- Modify: `frontend/src/app/features/menu/models/modifier-group.model.ts`
- Modify: `frontend/src/app/features/menu/services/menu-api.service.ts`
- Modify: `frontend/src/app/features/menu/services/menu-mock.service.ts`
- Modify: `frontend/src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.ts`
- Modify: `frontend/src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.html`
- Modify: `frontend/src/app/features/menu/components/modifier-group-form-dialog/modifier-group-form-dialog.spec.ts`

**Interfaces:**
- Consumes: backend DTOs with `intent`.
- Produces:
  - frontend modifier groups with `intent`
  - form submission that includes `intent`
  - `deriveModifierGroupDisplayType(...)` that prefers explicit intent over price-based heuristics

- [ ] **Step 1: Write failing frontend tests for explicit intent**
- [ ] **Step 2: Extend API models and frontend modifier model**
- [ ] **Step 3: Update menu API/mock mappings**
- [ ] **Step 4: Update modifier-group creation form and spec**
- [ ] **Step 5: Run focused frontend tests for form/model mapping**

### Task 4: Rework Pricing Summaries, Extras Rendering, and Menu Audit Health

**Files:**
- Modify: `frontend/src/app/features/menu/services/menu-pricing.service.ts`
- Modify: `frontend/src/app/features/menu/services/menu-pricing.service.spec.ts`
- Modify: `frontend/src/app/features/menu/services/menu-audit.service.ts`
- Modify: `frontend/src/app/features/menu/services/menu-audit.service.spec.ts`
- Modify: `frontend/src/app/features/menu/models/menu-audit.model.ts`
- Modify: `frontend/src/app/features/menu/components/menu-health-panel/menu-health-panel.ts`
- Modify: `frontend/src/app/features/menu/components/menu-health-panel/menu-health-panel.spec.ts`

**Interfaces:**
- Consumes: explicit modifier intent.
- Produces:
  - summaries driven by `choice` / `extras` / `remove`
  - `MenuAuditReport.healthScore`
  - `MenuAuditReport.productsWithoutIssues`
  - weighted audit health behavior

- [ ] **Step 1: Write failing tests for summary and weighted score**
- [ ] **Step 2: Rework customization summary and upgrade labels**
- [ ] **Step 3: Add weighted audit scoring to the audit model/service**
- [ ] **Step 4: Update health panel API and rendering**
- [ ] **Step 5: Run focused frontend tests for pricing/audit/panel**

### Task 5: Wire Menu Page Copy and Behavior to the Richer Model

**Files:**
- Modify: `frontend/src/app/features/menu/pages/menu-page/menu-page.ts`
- Modify: `frontend/src/app/features/menu/pages/menu-page/menu-page.html`
- Modify: `frontend/src/app/features/menu/pages/menu-page/menu-page.spec.ts`
- Modify: `frontend/public/i18n/es.json`
- Modify: `frontend/public/i18n/en.json`
- Modify: `frontend/public/i18n/ca.json`

**Interfaces:**
- Consumes:
  - frontend modifier groups with `intent`
  - weighted `auditReport().healthScore`
- Produces:
  - clearer extras/removal/choice labels
  - menu page health panel driven by the explicit score
  - completed i18n coverage for the updated copy

- [ ] **Step 1: Write failing page tests around extras labels and health score wiring**
- [ ] **Step 2: Update menu page logic and template**
- [ ] **Step 3: Update translations in `es`, `en`, and `ca`**
- [ ] **Step 4: Run focused menu page tests**

### Task 6: Cross-Layer Verification

**Files:**
- Test: backend modifier-group use case, repository, and menu-read specs
- Test: frontend menu pricing, audit, form, panel, and page specs

**Interfaces:**
- Consumes: all behavior produced by Tasks 1-5.
- Produces: verified backend+frontend menu modifier and audit behavior.

- [ ] **Step 1: Run focused backend tests**
  Run from `backend/`: `pnpm test`
  Expected: PASS for touched restaurants application/infrastructure specs.

- [ ] **Step 2: Run focused frontend tests**
  Run from `frontend/`: `pnpm test -- --watch=false`
  Expected: PASS for touched menu specs.

- [ ] **Step 3: Run frontend build**
  Run from `frontend/`: `pnpm build`
  Expected: PASS.

- [ ] **Step 4: If Prisma schema changed, run the backend checks required by the repo workflow**
  Run from `backend/`: `pnpm build`
  Expected: PASS with generated Prisma client and updated TypeScript contracts.

## Self-Review

- Scope coverage:
  - Backend/API modifier intent is explicitly covered in Tasks 1 and 2.
  - Frontend consumption of explicit intent is covered in Tasks 3 and 5.
  - Menu health scoring is covered in Task 4.
- Placeholder scan:
  - This revised plan intentionally converts the incorrect frontend-only assumption into cross-layer tasks and removes the blocked contract assumption.
- Type consistency:
  - `intent` is introduced first in Prisma/backend contracts, then consumed in frontend DTOs and UI.
  - `healthScore` is introduced in the audit model before the page consumes it.

