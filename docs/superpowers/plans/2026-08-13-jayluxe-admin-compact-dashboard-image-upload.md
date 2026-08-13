# JayLuxe Admin Compact Dashboard and Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing JayLuxe admin dashboard to a compact horizontal-navigation layout, standardize admin typography/density, and harden Firebase catalog image uploads without changing working data/auth/business logic.

**Architecture:** Preserve the current `/admin` single-page component and existing `AdminPageFrame` dedicated pages. Change only their presentation and the catalog image helper. Keep Firebase Storage paths, Firestore fields, permission claims and CRUD functions intact.

**Tech Stack:** Next.js 14.2.15 App Router, React 18, TypeScript, Firebase Web SDK 10.x, Firebase Storage/Firestore/Auth, Lucide React, existing CSS files.

## Global Constraints

- Do not rewrite existing Firebase/auth/database/order/payment logic.
- Keep existing permission checks and admin-only routes.
- Main admin navigation must be horizontal; mobile navigation must scroll horizontally.
- Primary financial metrics must be Total Revenue, Total Orders, Average Order Value.
- Preserve Products and Customers as secondary metrics.
- Admin/Staff overview includes an in-grid Manage Users action.
- Catalog upload remains Firebase Storage and must always leave uploading state on failure/timeout.
- No arbitrary negative margins or fixed-height responsive hacks.
- Invoice must not gain a Dashboard control.

---

### Task 1: Add admin UI/upload regression verifier

**Files:**
- Create: `scripts/verify-admin-dashboard-refactor.mjs`

**Interfaces:**
- Consumes: source files under `app/admin`, `lib/catalogImages.ts`, `storage.rules`, and invoice source.
- Produces: non-zero exit when the requested admin/upload behaviors are absent.

- [ ] **Step 1: Write a verifier that asserts the desired post-change source structure.**
- [ ] **Step 2: Run `node scripts/verify-admin-dashboard-refactor.mjs` and confirm it fails against the pre-change tree.**

### Task 2: Harden Firebase catalog image upload

**Files:**
- Modify: `lib/catalogImages.ts`
- Modify: `storage.rules`
- Modify: `app/admin/(protected)/page.tsx`

**Interfaces:**
- `uploadCatalogImage(file, kind, options?) -> Promise<string>`
- `options.onProgress?: (progress: number) => void`
- existing returned value remains the durable HTTPS URL saved to the existing `image` field.

- [ ] **Step 1: Replace one-shot `uploadBytes` with `uploadBytesResumable` and progress callbacks.**
- [ ] **Step 2: Add bucket configuration guard, finite timeout/cancel logic and readable Storage error mapping.**
- [ ] **Step 3: Align the 8 MB client/rules boundary.**
- [ ] **Step 4: Add product/category progress state and visible progress text while preserving existing `try/catch/finally`.**
- [ ] **Step 5: Run the regression verifier and confirm upload-related assertions pass while UI assertions may still fail.**

### Task 3: Convert the main admin navigation to horizontal

**Files:**
- Modify: `app/admin/(protected)/page.tsx`
- Modify: `app/admin/admin-dashboard-redesign.css`

**Interfaces:**
- Existing permission-controlled anchors and Links remain the navigation data/destinations.
- New classes: `admin-dashboard-nav-shell`, `admin-dashboard-nav-brand`, `admin-dashboard-nav`, `admin-dashboard-nav-logout`.

- [ ] **Step 1: Replace sidebar markup with semantic horizontal shell/nav markup without changing destinations or permission conditions.**
- [ ] **Step 2: Add desktop horizontal and mobile horizontal-scroll CSS.**
- [ ] **Step 3: Verify no vertical sidebar markup remains on the main admin page.**

### Task 4: Redesign primary and team metrics

**Files:**
- Modify: `app/admin/(protected)/page.tsx`
- Modify: `app/admin/admin-dashboard-redesign.css`

**Interfaces:**
- `averageOrderValue = orders.length > 0 ? revenue / orders.length : 0`.
- Primary grid: Revenue / Orders / AOV.
- Secondary grid: Products / Customers.
- Team grid: Admin Overview / Staff Overview / Manage Users.

- [ ] **Step 1: Add safe AOV calculation.**
- [ ] **Step 2: Render the three primary KPI cards and two secondary operational cards.**
- [ ] **Step 3: Move Manage Users into the team grid as an actionable card.**
- [ ] **Step 4: Add 3/2/1 responsive grid rules with compact card heights and spacing.**

### Task 5: Standardize admin typography and density

**Files:**
- Modify: `app/admin/admin-dashboard-redesign.css`
- Modify: `app/admin/admin-management.css`

**Interfaces:**
- Main dashboard legacy selectors stay scoped under `.admin-content`/`.admin-layout`.
- Dedicated admin pages stay scoped under `.amu-*`.

- [ ] **Step 1: Apply the approved admin typography scale to page/section/card/table/form/button/navigation elements.**
- [ ] **Step 2: Reduce excessive section/card/form/table padding while maintaining accessible controls.**
- [ ] **Step 3: Ensure `.amu-nav` remains horizontally scrollable at tablet/mobile widths and uses compact sizing.**
- [ ] **Step 4: Ensure tables use controlled internal overflow rather than page overflow.**

### Task 6: Invoice and responsive regression checks

**Files:**
- Verify: `app/invoice/[id]/page.tsx`
- Verify: `components/SiteChrome.tsx`
- Modify only if an actual Dashboard invoice element is found.

- [ ] **Step 1: Confirm invoice page has no Dashboard UI control and global SiteChrome stays suppressed on invoice routes.**
- [ ] **Step 2: Run the full regression verifier and resolve any failures.**

### Task 7: Final verification and packaging

**Files:**
- Create: `JAYLUXE_ADMIN_COMPACT_DASHBOARD_UPLOAD_REPORT_2026-08-13.md`
- Package: complete project ZIP.

- [ ] **Step 1: Run `node scripts/verify-admin-dashboard-refactor.mjs`.**
- [ ] **Step 2: Run existing `node scripts/verify-mobile-layout.mjs`.**
- [ ] **Step 3: Run syntax/config/CSS structure checks.**
- [ ] **Step 4: Run `npm run lint`, `npx tsc --noEmit --incremental false`, and `npm run build` if dependencies can be installed/resolved; report any environment limitation truthfully.**
- [ ] **Step 5: Create the full ZIP and run ZIP integrity validation.**
