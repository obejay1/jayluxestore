# JayLuxe Production UI + Cloudinary Upload Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Unify JayLuxe admin image uploads on reliable signed Cloudinary uploads and apply one compact, responsive production design system across the public and admin site.

**Architecture:** Keep Firebase Auth and Firestore unchanged. Use the existing authenticated `/api/upload` route only to sign approved Cloudinary parameters, upload files directly from the browser with FormData/XHR, and consolidate upload UI into a reusable admin field. Normalize spacing, typography, grids, controls, cards, containers and mobile overflow through a final shared production stylesheet plus focused reusable-component class changes.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Cloudinary Node SDK, Firebase Auth/Firestore, CSS, lucide-react.

## Global Constraints

- Preserve existing functionality and Firestore schemas.
- Cloudinary remains image media storage.
- Firebase remains authentication/database infrastructure.
- Do not expose `CLOUDINARY_API_SECRET` client-side.
- Allowed images: JPEG, PNG, WebP, GIF.
- Original image memory guard: 20 MB; final upload <= 8 MB.
- Resize eligible still images to <= 2400px maximum dimension when beneficial.
- Use compact 4/8/12/16/20/24/32/40px spacing scale.
- Mobile product-style grids remain two columns where practical.

---

### Task 1: Add regression verification for upload architecture and density system

**Files:**
- Create: `scripts/verify-cloudinary-upload-refactor.mjs`
- Create: `scripts/verify-production-design-system.mjs`

**Interfaces:**
- Consumes: current project source files.
- Produces: deterministic source-level checks used before and after the refactor.

- [x] Write checks that fail while Firebase Storage upload imports remain in admin media helpers, while `/api/upload` parses base64 JSON, and while the shared Cloudinary client/admin upload field are absent.
- [x] Write checks for the final design system import, spacing tokens, 1280px container, mobile two-column grid and safe viewport/overflow rules.
- [x] Run both scripts and confirm they fail for the intended missing behavior.

### Task 2: Build signed Cloudinary upload pipeline

**Files:**
- Modify: `app/api/upload/route.ts`
- Create: `lib/imageUpload.ts`
- Modify: `.env.example`
- Modify: `env.local.example`

**Interfaces:**
- Consumes: existing admin session cookie verification, `cloudinary` Node SDK.
- Produces: `requestCloudinarySignature(folder)` and `uploadAdminImage(file, options)` returning `{ url, publicId, width, height, bytes, format }`.

- [x] Replace base64 upload API with authenticated signature generation for approved `jayluxe/*` folders.
- [x] Implement client MIME/size validation and optional canvas resize.
- [x] Implement direct XHR/FormData Cloudinary upload with progress, timeout, response validation and normalized errors.
- [x] Document required Cloudinary env values without exposing the secret.
- [x] Run the upload regression script and confirm pipeline checks pass.

### Task 3: Consolidate admin media upload UI and remove Firebase Storage media code

**Files:**
- Create: `components/admin/AdminImageUploadField.tsx`
- Modify: `app/admin/(protected)/page.tsx`
- Modify: `lib/catalogImages.ts`
- Modify: `lib/testimonials.ts`
- Modify: `lib/transformations.ts`
- Modify: `lib/bridal.ts`
- Modify: `app/admin/admin-dashboard-redesign.css`

**Interfaces:**
- Consumes: `uploadAdminImage` helper.
- Produces: reusable upload field with value/onChange/folder/shape/onUploadingChange API.

- [x] Add reusable upload field with independent progress/error/preview/replace/remove state.
- [x] Replace product/category/gallery/transformation/testimonial upload handlers with the component.
- [x] Add bridal package image upload to the existing package form.
- [x] Remove Firebase Storage imports/functions from catalog/content helpers while retaining Firestore CRUD.
- [x] Ensure save buttons disable only while relevant uploads are active and reset on all paths.
- [x] Run the upload regression script.

### Task 4: Add the unified production design system

**Files:**
- Create: `app/jayluxe-production-system.css`
- Modify: `app/layout.tsx`
- Modify: `components/ProductCard.tsx`
- Modify: `components/ServiceCard.tsx`
- Modify: `components/Header.tsx`
- Modify: `components/Footer.tsx`

**Interfaces:**
- Consumes: existing page classes and reusable card/header/footer markup.
- Produces: shared spacing/container/card/control/typography/grid/mobile-safe styling.

- [x] Define tokens for spacing, radius, container, control heights, typography and safe-area dimensions.
- [x] Normalize public/admin section spacing, cards, forms, tables, modals and footer/header density without removing page-specific identity.
- [x] Enforce responsive product/category/service/bridal/gallery grids and mobile two-column product layout.
- [x] Harden horizontal overflow, images, fixed mobile navigation and `100dvh` fallbacks.
- [x] Add structural shared classes to reusable components where needed.
- [x] Run production design system verification.

### Task 5: Audit high-traffic public/admin flows and compact inline outliers

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/account/page.tsx`
- Modify: `app/checkout/page.module.css`
- Modify: `app/admin/(protected)/page.tsx`
- Modify: relevant shared CSS files only where final-system selectors cannot safely normalize an outlier.

**Interfaces:**
- Consumes: shared design tokens/classes.
- Produces: compact homepage/account/checkout/admin structures with preserved content and behavior.

- [x] Remove or reduce large inline spacing/min-height outliers in touched flows.
- [x] Preserve the account Welcome / Orders / Wishlist / Shopping Bag compact mobile two-column layout.
- [x] Keep dashboard navigation horizontal and metric/admin cards compact.
- [x] Keep checkout groups compact and scannable.
- [x] Confirm no content section is removed.

### Task 6: Production verification and packaging

**Files:**
- Modify/Create: `JAYLUXE_FULL_PRODUCTION_REFACTOR_REPORT_2026-08-16.md`

**Interfaces:**
- Consumes: completed source tree.
- Produces: verified ZIP and QA report.

- [x] Run new regression scripts and existing JayLuxe verification scripts.
- [x] Parse all JS/TS/TSX files for syntax when dependencies are unavailable.
- [x] Validate CSS braces and JSON/config syntax.
- [x] Run `npm install`, lint, TypeScript and build when network/dependencies allow; report limitations accurately.
- [x] Search for remaining Firebase Storage media imports, base64 upload code, fragile `100vw`, large production spacing outliers and obvious image-upload stuck-state text paths.
- [x] Package the complete project ZIP and include changed-files/report documentation.
