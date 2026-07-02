# Frontend Image Upload and Combo UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the product image and combo management experience in the menu frontend with clearer upload states, better image controls, stronger combo editing flows, and sharper catalog UX.

**Architecture:** Keep the current Angular menu administration structure and extend the existing product form, menu page, and frontend service layer instead of creating a parallel admin surface. Product image behavior stays backed by the existing Cloudinary signing endpoint and `imageUrl` contract, while combo UX improvements are layered into the current menu/product management flow with focused helper state and presentational components where needed.

**Tech Stack:** Angular, pnpm, Transloco, Testing Library, Vitest, Tailwind, existing restaurant POS/menu frontend services

---

## File Structure

**Existing files likely to modify**

- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\product-form-dialog\product-form-dialog.ts`
  - Extend dialog state for drag and drop, preview lifecycle, validation errors, and crop/remove/replace actions.
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\product-form-dialog\product-form-dialog.html`
  - Add richer image upload UI, progress/error states, and a cleaner field layout.
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\product-form-dialog\product-form-dialog.spec.ts`
  - Cover drag/drop, invalid image handling, retry, remove, and confirm behavior.
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\pages\menu-page\menu-page.ts`
  - Add image and combo filters, bulk visibility for UX affordances, and better selected product behavior.
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\pages\menu-page\menu-page.html`
  - Improve cards, toolbar filters, image placeholders, and combo summary presentation.
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\pages\menu-page\menu-page.spec.ts`
  - Assert the richer card/filter/detail behavior.
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\services\product-image-upload.service.ts`
  - Add client-side image preparation and retry-oriented ergonomics without leaking Cloudinary details into page components.
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\services\product-image-upload.service.spec.ts`
  - Cover resize/validation/upload payload behavior.
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\services\menu-api.service.ts`
  - Keep API surface stable while exposing richer combo/product metadata mapping if needed by the new UI.
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\services\menu-mock.service.ts`
  - Keep local/mock menu data aligned with the improved image/combo states used by tests.
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\shared\i18n\i18n-testing.ts`
  - Add test translations for new UX copy.
- `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\es.json`
- `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\en.json`
- `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\ca.json`
  - Add all new labels, helper text, error states, combo instructions, and filter labels.

**New files to create**

- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\image-dropzone\image-dropzone.ts`
  - Focused upload surface for drag/drop, preview, validation, and remove/replace actions.
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\image-dropzone\image-dropzone.html`
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\image-dropzone\image-dropzone.spec.ts`
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\combo-builder-panel\combo-builder-panel.ts`
  - Focused combo editor summary for slot-by-slot selection state and pricing explanation.
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\combo-builder-panel\combo-builder-panel.html`
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\combo-builder-panel\combo-builder-panel.spec.ts`
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\utils\image-upload.utils.ts`
  - Small client-side helpers for file validation, image dimension checks, and browser resize/compression.
- `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\utils\image-upload.utils.spec.ts`

**Documentation**

- `C:\Users\Thor_\Documents\Proyecto\frontend\README.md`
  - Add a short section on the new frontend upload UX and combo editing affordances if the current README already documents local menu admin behavior.

### Task 1: Add client-side image validation and preparation helpers

**Files:**
- Create: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\utils\image-upload.utils.ts`
- Create: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\utils\image-upload.utils.spec.ts`

- [ ] Write failing tests for image file acceptance, max size rejection, MIME validation, and resize target behavior.
- [ ] Implement small pure helpers for:
  - allowed MIME types
  - max upload size guard
  - minimum dimensions
  - browser-side resize/compression before upload
- [ ] Run `pnpm test --watch=false --include=src/app/features/menu/utils/image-upload.utils.spec.ts` in `frontend/`.
- [ ] Commit with message: `feat: add image upload validation helpers`

### Task 2: Build a reusable image dropzone component

**Files:**
- Create: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\image-dropzone\image-dropzone.ts`
- Create: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\image-dropzone\image-dropzone.html`
- Create: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\image-dropzone\image-dropzone.spec.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\shared\i18n\i18n-testing.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\es.json`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\en.json`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\ca.json`

- [ ] Write failing tests for:
  - placeholder state
  - drag-over highlight
  - drop success
  - invalid file error
  - remove action
  - replace action
- [ ] Implement a standalone component with inputs/outputs for:
  - current image URL
  - upload status
  - validation message
  - select file
  - remove image
  - retry upload
- [ ] Keep the visual shell fixed-height so cards and dialogs do not jump.
- [ ] Run `pnpm test --watch=false --include=src/app/features/menu/components/image-dropzone/image-dropzone.spec.ts` in `frontend/`.
- [ ] Commit with message: `feat: add reusable menu image dropzone`

### Task 3: Upgrade the product image upload service for better frontend ergonomics

**Files:**
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\services\product-image-upload.service.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\services\product-image-upload.service.spec.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\utils\image-upload.utils.ts`

- [ ] Write failing tests for:
  - preprocess-before-upload
  - retry after failed Cloudinary response
  - preserving `secure_url` output contract
- [ ] Update the service so it:
  - validates file before signing
  - resizes/compresses when needed
  - exposes stable error categories for the UI
  - remains focused on backend signature + Cloudinary upload only
- [ ] Run `pnpm test --watch=false --include=src/app/features/menu/services/product-image-upload.service.spec.ts` in `frontend/`.
- [ ] Commit with message: `feat: improve product image upload flow`

### Task 4: Refactor the product form dialog UX around the new image component

**Files:**
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\product-form-dialog\product-form-dialog.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\product-form-dialog\product-form-dialog.html`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\product-form-dialog\product-form-dialog.spec.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\es.json`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\en.json`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\ca.json`

- [ ] Write failing tests for:
  - drag/drop integration
  - upload retry from error state
  - replace image without clearing the form
  - confirm disabled while upload/processing is active
  - unsaved image removal reflected in emitted payload
- [ ] Reorganize the dialog into sections:
  - image
  - base information
  - operational settings
- [ ] Replace the inline upload controls with `image-dropzone`.
- [ ] Keep create/edit payload compatibility with the current `imageUrl` API contract.
- [ ] Run `pnpm test --watch=false --include=src/app/features/menu/components/product-form-dialog/product-form-dialog.spec.ts` in `frontend/`.
- [ ] Commit with message: `feat: polish product form image ux`

### Task 5: Improve menu page filters and image-oriented catalog scanning

**Files:**
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\pages\menu-page.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\pages\menu-page.html`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\pages\menu-page.spec.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\es.json`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\en.json`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\ca.json`

- [ ] Write failing tests for:
  - filter by `with image`
  - filter by `without image`
  - combined image + combo filter
  - detail panel image placeholder sync with selected card
- [ ] Add new filters beside the current toolbar:
  - all images
  - with image
  - without image
- [ ] Keep catalog-only, availability, combo, and customizable logic working together.
- [ ] Run `pnpm test --watch=false --include=src/app/features/menu/pages/menu-page/menu-page.spec.ts` in `frontend/`.
- [ ] Commit with message: `feat: add image filters to menu catalog`

### Task 6: Redesign product cards for faster visual scanning

**Files:**
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\pages\menu-page.html`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\pages\menu-page.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\pages\menu-page.spec.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\services\menu-mock.service.ts`

- [ ] Write failing tests for:
  - fixed image header height
  - badge coexistence for combo + customizable
  - fallback placeholder styling path
  - stable edit/delete controls
- [ ] Improve cards so they consistently show:
  - image or placeholder
  - price anchor
  - type tag
  - customizable tag
  - availability tag
  - `sin sección` tag
- [ ] Add a subtle loading/skeleton state for image-heavy layouts if the current page flashes noticeably during reload.
- [ ] Run `pnpm test --watch=false --include=src/app/features/menu/pages/menu-page/menu-page.spec.ts` in `frontend/`.
- [ ] Commit with message: `feat: improve menu product card scanning`

### Task 7: Add a dedicated combo builder summary panel

**Files:**
- Create: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\combo-builder-panel\combo-builder-panel.ts`
- Create: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\combo-builder-panel\combo-builder-panel.html`
- Create: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\combo-builder-panel\combo-builder-panel.spec.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\pages\menu-page.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\pages\menu-page.html`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\es.json`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\en.json`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\ca.json`

- [ ] Write failing tests for:
  - combo slot count rendering
  - required slot labeling
  - supplement labeling
  - incomplete combo warning
- [ ] Build a read-first combo summary component that shows:
  - slot sections
  - option counts
  - default choices
  - supplement notes
  - total combo structure explanation
- [ ] Mount it in the right-hand detail panel for combo products.
- [ ] Keep current combo composition intact; this task is presentation and guidance only.
- [ ] Run `pnpm test --watch=false --include=src/app/features/menu/components/combo-builder-panel/combo-builder-panel.spec.ts --include=src/app/features/menu/pages/menu-page/menu-page.spec.ts` in `frontend/`.
- [ ] Commit with message: `feat: add combo builder summary panel`

### Task 8: Make combo editing feel more guided in the product workflow

**Files:**
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\pages\menu-page.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\pages\menu-page.html`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\pages\menu-page.spec.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\services\menu-api.service.ts`

- [ ] Write failing tests for:
  - combo products surface richer instructions than simple products
  - combo detail panel shows slot status summary
  - products with no combo definition do not render empty combo chrome
- [ ] Add UX affordances in the detail panel:
  - `required` markers
  - slot counts
  - base price vs supplements explanation
  - clearer wording for combo type
- [ ] Keep this task free of backend contract changes.
- [ ] Run `pnpm test --watch=false --include=src/app/features/menu/pages/menu-page/menu-page.spec.ts` in `frontend/`.
- [ ] Commit with message: `feat: guide combo management in menu detail`

### Task 9: Add smarter copy and recovery states for upload and combo errors

**Files:**
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\es.json`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\en.json`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\public\i18n\ca.json`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\shared\i18n\i18n-testing.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\product-form-dialog\product-form-dialog.ts`
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\src\app\features\menu\components\image-dropzone\image-dropzone.ts`

- [ ] Write failing tests for:
  - file too large message
  - unsupported format message
  - upload failed retry message
  - combo incomplete helper text
- [ ] Add friendlier copy with direct next actions instead of generic error text.
- [ ] Ensure visual status is paired with accessible text and not only color.
- [ ] Run `pnpm test --watch=false --include=src/app/features/menu/components/image-dropzone/image-dropzone.spec.ts --include=src/app/features/menu/components/product-form-dialog/product-form-dialog.spec.ts` in `frontend/`.
- [ ] Commit with message: `feat: improve menu upload and combo messaging`

### Task 10: Final verification and documentation

**Files:**
- Modify: `C:\Users\Thor_\Documents\Proyecto\frontend\README.md` (only if local frontend UX docs exist or benefit from update)

- [ ] Run focused frontend tests:
  - `pnpm test --watch=false --include=src/app/features/menu/utils/image-upload.utils.spec.ts`
  - `pnpm test --watch=false --include=src/app/features/menu/components/image-dropzone/image-dropzone.spec.ts`
  - `pnpm test --watch=false --include=src/app/features/menu/components/product-form-dialog/product-form-dialog.spec.ts`
  - `pnpm test --watch=false --include=src/app/features/menu/components/combo-builder-panel/combo-builder-panel.spec.ts`
  - `pnpm test --watch=false --include=src/app/features/menu/pages/menu-page/menu-page.spec.ts`
- [ ] Run broader safety checks:
  - `pnpm test --watch=false` in `C:\Users\Thor_\Documents\Proyecto\frontend`
  - `pnpm build` in `C:\Users\Thor_\Documents\Proyecto\frontend`
- [ ] Manually verify in the running frontend:
  - create product with no image
  - drag/drop a valid image
  - reject an invalid image
  - replace and remove image
  - scan cards with/without image filters
  - review combo detail panel and slot summaries
- [ ] Commit with message: `docs: capture frontend image and combo ux improvements`

## Public interfaces and UX changes

- Product image upload becomes drag/drop-friendly and validation-first.
- Product form gains better upload states and clearer recovery options.
- Menu cards support richer visual scanning and image-specific filtering.
- Combo products get a dedicated summary experience in the detail panel.
- Existing backend API contracts remain unchanged for this plan; all improvements stay on the frontend side.

## Test scenarios

- Dragging a supported image shows a highlight and accepts the file.
- Dragging an invalid file shows the right validation message.
- Oversized images are rejected before backend signing.
- Large valid images are resized/compressed before upload.
- Uploaded images can be retried, replaced, and removed.
- Product confirm stays blocked while image processing/upload is active.
- `with image` and `without image` filters compose with combo/customizable filters.
- Combo cards keep both type and customization badges when both conditions apply.
- Combo detail panel explains slot requirements and supplements without changing combo behavior.

## Assumptions

- This plan intentionally stays frontend-only and reuses the current Cloudinary-backed backend flow.
- Cropping can start as resize/compression-only if no crop library is already approved in the project; add crop UI only if it fits the current dependency posture.
- Combo improvements in this plan focus on comprehension and management UX, not on introducing a new backend combo editing protocol.
