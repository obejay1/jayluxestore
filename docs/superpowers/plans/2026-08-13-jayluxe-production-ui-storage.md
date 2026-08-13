# JayLuxe Production UI + Firebase Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make JayLuxe consistently compact and premium across customer/admin routes while preserving functionality, and harden the existing Firebase Storage image upload flow so it reports the real failure cause and cannot remain stuck.

**Architecture:** Preserve the existing React/Next.js/Firebase architecture. Consolidate spacing, typography, controls, cards, containers, and responsive behavior through the existing shared stylesheet layer (`globals.css` + `jayluxe-card-system.css`) and remove source-level conflicting large spacing from later override files only where verified. Keep Firebase Storage as the single catalog image system, use `uploadBytesResumable()` and `getDownloadURL()`, align the SDK retry budget with the UI timeout, expose native Firebase errors, and preserve existing image URLs during edit failures.

**Tech Stack:** Next.js 14.2.15 App Router, React 18.3, TypeScript 5.5, Firebase 10.14.1 (Auth/Firestore/Storage), CSS, existing Lucide/Recharts/Paystack/Resend integrations.

## Global Constraints

- Preserve Firebase Authentication, Firestore, Firebase Admin SDK, existing APIs, Paystack, Resend, cart, wishlist, checkout, orders, bookings, reports, product/category data, and admin authorization.
- Do not replace Firebase Storage or hard-code a bucket name.
- Product/category uploads remain under `products/*` and `categories/*` and use the existing Firestore `image` field.
- Keep JPEG/PNG/WebP validation and an 8 MB inclusive maximum, aligned with `storage.rules`.
- No new UI dependency or animation library.
- Customer and admin mobile layouts must not introduce horizontal page overflow.
- Maintain existing requested two-column mobile account/product/category/gallery layouts where the viewport permits.
- Compact spacing hierarchy: small 4–8px, medium 8–16px, large 16–24px, ordinary section spacing 24–40px unless a hero/marketing area has a clear reason to exceed it.
- Keep accessibility: touch targets, focus states, readable typography, semantic status/error feedback.

---

### Task 1: Add regression verifier for UI density and upload reliability

**Files:**
- Create: `scripts/verify-production-ui-storage.mjs`

**Interfaces:**
- Consumes: source files and CSS in the project tree.
- Produces: a deterministic command `node scripts/verify-production-ui-storage.mjs` that fails if required compact-system/upload guarantees are absent.

- [ ] **Step 1: Write verifier assertions before production changes**

The verifier must assert: compact design tokens exist; ordinary section spacing is capped by shared token values; mobile 2-column rules remain; `uploadBytesResumable`, `getDownloadURL`, SDK retry-budget assignment, useful Firebase error mapping, upload cancellation, progress callback, preview/remove controls, and `finally` reset paths exist; storage rules remain permission-gated with 8 MB validation.

- [ ] **Step 2: Run verifier and confirm it fails for the missing new guarantees**

Run: `node scripts/verify-production-ui-storage.mjs`
Expected: non-zero exit because shared compact tokens and SDK retry alignment/remove controls are not all present yet.

---

### Task 2: Harden Firebase Storage catalog uploads at the existing boundary

**Files:**
- Modify: `lib/catalogImages.ts`
- Modify: `lib/firebase.ts`
- Modify: `app/admin/(protected)/page.tsx`
- Modify: `storage.rules` only if validation mismatch is found

**Interfaces:**
- Consumes: existing Firebase app, authenticated client session, `CatalogImageKind`, File, `onProgress`.
- Produces: `uploadCatalogImage(file, kind, options): Promise<string>` with native Firebase diagnostics and finite retry behavior; existing form `image` fields remain unchanged.

- [ ] **Step 1: Preserve the existing image URL before replacement attempts**

Admin product/category upload handlers must update the form only after the new upload returns a durable URL. On failure the current `form.image` / `categoryForm.image` remains untouched.

- [ ] **Step 2: Align Firebase SDK upload retry time with JayLuxe timeout**

Set `storage.maxUploadRetryTime` to a value below the outer timeout before starting the task so Firebase emits `storage/retry-limit-exceeded` or other native errors instead of being masked by JayLuxe's timer.

- [ ] **Step 3: Improve diagnostics and cleanup**

Capture Storage `code`, `message`, bucket/project configuration context without exposing secrets; unsubscribe upload observers on settle; clear timeout; cancel on outer timeout; preserve the original error code on the user-facing Error object for console diagnostics.

- [ ] **Step 4: Add compact replace/remove image UX**

When an image exists, show thumbnail plus Replace and Remove controls. Disable file selection/actions during upload. Remove clears only the form's pending image field; it does not delete remote files automatically, avoiding accidental deletion of images still referenced by saved records.

- [ ] **Step 5: Run upload verifier**

Run: `node scripts/verify-production-ui-storage.mjs`
Expected: upload-related assertions pass.

---

### Task 3: Establish the shared compact design tokens

**Files:**
- Modify: `app/globals.css`
- Modify: `app/jayluxe-card-system.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces CSS custom properties used by customer/admin common UI: spacing, radius, controls, typography, container widths, section rhythm.

- [ ] **Step 1: Add JayLuxe compact tokens to `:root`**

Define `--jl-space-1` through `--jl-space-6`, `--jl-section-space`, `--jl-card-pad`, `--jl-control-h`, compact type sizes, radius and content-width tokens while keeping existing brand colors/fonts.

- [ ] **Step 2: Make `jayluxe-card-system.css` the final shared UI import**

Import legacy/theme CSS first and the shared card/design-system stylesheet last so common compact rules have predictable precedence. Do not remove a legacy stylesheet unless its rules are proven fully superseded.

- [ ] **Step 3: Add scoped common compact primitives**

Standardize common `.btn`, `.input`, form controls, `.table-card`, `.stat-card`, product/service/category cards, page containers, section headers, tables, empty states, modal surfaces and pagination without changing behavior.

- [ ] **Step 4: Add responsive safeguards**

At mobile widths enforce `min-width:0`, safe grid gaps, full-width controls where necessary, horizontal table wrappers, and no page-level `overflow-x` caused by shared components.

---

### Task 4: Remove verified excessive spacing conflicts from customer routes

**Files:**
- Modify: `app/luxury-theme.css`
- Modify: `app/jayluxe-redesign.css`
- Modify: `app/jayluxe-refactor.css`
- Modify: `app/jayluxe-mobile.css`
- Modify: `app/jayluxe-mobile-polish.css`
- Modify: `app/jayluxe-consistency-fixes.css`
- Modify: `app/jayluxe-production-stability.css`
- Modify: `app/jayluxe-feature-update.css`

**Interfaces:**
- Consumes shared compact tokens.
- Produces natural-height layouts for Homepage, Shop, Product, Category, Cart, Checkout, Account, Orders, Wishlist, Auth, Services, Gallery, Invoice and editorial routes.

- [ ] **Step 1: Replace ordinary 60–120px section gaps with token-based 24–40px rhythm where not hero-specific**

Leave full-height navigation overlays and intentional hero/media heights alone. Remove negative-margin compensation only when the shared natural flow replaces it safely.

- [ ] **Step 2: Compact forms/cards/buttons and align desktop max-widths**

Apply shared values to checkout/account/auth/shop/product/service/gallery/contact/help surfaces, preserving existing component classes and functionality.

- [ ] **Step 3: Preserve mobile two-column requirements**

Verify account summary, product/category/gallery grids remain two columns at 320–414px where their existing design calls for it, with graceful one-column fallback only at exceptionally narrow widths.

---

### Task 5: Compact admin routes without changing administration behavior

**Files:**
- Modify: `app/admin/(protected)/admin-dashboard.css`
- Modify: `components/admin/AdminPageFrame.module.css`
- Modify: `components/admin/AdminReportsClient.module.css`
- Modify: admin component CSS modules present in the project as needed

**Interfaces:**
- Consumes existing admin DOM, permissions and data.
- Produces consistent compact admin typography, cards, tables, forms, navigation, reports and controls.

- [ ] **Step 1: Apply the shared density scale to dashboard/products/categories/orders/bookings/settings**

Reduce padding/gaps and normalize heading/body/metadata/control sizes without modifying data-fetching or permission logic.

- [ ] **Step 2: Compact reports/users/activity shells**

Keep charts responsive and tables internally scrollable; do not clip chart legends or actions.

- [ ] **Step 3: Verify admin upload area spacing and image controls**

Ensure upload area is visually connected to its form section, thumbnail is bounded, and replace/remove actions remain accessible on mobile.

---

### Task 6: Source/config verification and production artifact

**Files:**
- Modify: `README.md` with Storage production checklist and verification commands.
- Create: `JAYLUXE_PRODUCTION_UI_STORAGE_REPORT_2026-08-13.md`

**Interfaces:**
- Produces final full project ZIP and verification report.

- [ ] **Step 1: Run project-specific regression scripts**

Run:
- `node scripts/verify-production-ui-storage.mjs`
- `node scripts/verify-mobile-layout.mjs`
- `node scripts/verify-admin-dashboard-refactor.mjs`

Expected: all exit 0.

- [ ] **Step 2: Validate source/config syntax**

Parse JS/TS sources using available local tooling or TypeScript parser; validate CSS brace balance, JSON files, and `node --check next.config.js`.

- [ ] **Step 3: Attempt dependency-aware checks**

Run `npm install`, then `npm run lint`, `npx tsc --noEmit --incremental false`, and `npm run build`. If registry access prevents installation, record the exact limitation and do not claim these checks passed.

- [ ] **Step 4: Package and re-verify the ZIP**

Create `JayLuxe-Production-UI-Storage-Cleanup-2026-08-13.zip`, run `unzip -t`, and run regression verification against the packaged tree.
