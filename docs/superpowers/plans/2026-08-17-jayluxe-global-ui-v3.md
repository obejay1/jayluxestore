# JayLuxe Global UI V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the user-approved compact product-card system and full-site UI refinements without changing JayLuxe business logic.

**Architecture:** Reuse the existing Next.js components and the current canonical design-system sheets. Structural requirements are implemented in the relevant TSX pages; repeated visual behavior is implemented as shared CSS rules instead of page-specific overrides. No backend architecture changes are made.

**Tech Stack:** Next.js 14, React 18, TypeScript, CSS, Framer Motion, Lucide React, Firebase, Cloudinary.

## Global Constraints
- Product grid gap: 6px.
- Product grid side padding: 12px.
- Product card radius: 10px.
- Product body padding: 8px.
- Heart control: 24px × 24px.
- Product name: 13px.
- Product price: 14px.
- Product CTA padding: 7px.
- Product CTA type: 10px.
- Preserve all routes, data, Firebase, Cloudinary, checkout and admin functionality.
- Do not add another global CSS override file.

---

### Task 1: Regression guard for required UI behavior
**Files:** Create `scripts/verify-global-ui-v3.mjs`; Modify `package.json`.
- [ ] Add assertions for exact product-card/grid tokens.
- [ ] Add assertions for homepage ordering and trust animation classes.
- [ ] Add assertions for product sticky cart and recommended rail.
- [ ] Add assertions for testimonial and admin gallery layouts.
- [ ] Run the script and confirm it fails against the pre-change project.

### Task 2: Shared product-card and grid system
**Files:** Modify `lib/layoutClasses.ts`, `components/ProductCard.tsx`, `app/jayluxe-design-system.css`.
- [ ] Give product grids their own class so category/service grids are unaffected.
- [ ] Apply the exact global values.
- [ ] Keep 2/3/4 responsive product columns and mobile Image → Name → Price → CTA hierarchy.
- [ ] Keep wishlist, quick view, badges, ratings and add-to-cart behavior intact.

### Task 3: Homepage structure and motion
**Files:** Modify `app/page.tsx`, `app/jayluxe-design-system.css`.
- [ ] Reorder required sections.
- [ ] Build three-column Discover More for Services/Bridal/Gallery.
- [ ] Separate promotions into its own three-item strip.
- [ ] Apply subtle loop animations to delivery/quality/support icons with reduced-motion protection.
- [ ] Retain all later homepage sections and data.

### Task 4: Product detail + Recommended for You
**Files:** Modify `app/product/[id]/page.tsx`, `app/jayluxe-design-system.css`.
- [ ] Add touch-swipe image navigation without changing desktop zoom.
- [ ] Tighten the two-column product detail layout and trust indicators.
- [ ] Add mobile sticky Add to Cart above bottom navigation.
- [ ] Give Recommended for You a View All header, mobile horizontal rail and desktop four-column grid.

### Task 5: Bridal, testimonials and promotions
**Files:** Modify `app/bridal/book/page.tsx`, `app/bridal/page.tsx`, `app/testimonials/page.tsx`, `app/promotions/page.tsx`, `app/jayluxe-design-system.css`.
- [ ] Normalize bridal booking hero/icon and summary alignment.
- [ ] Ensure package grids/cards use equal heights and three desktop columns.
- [ ] Apply testimonial 3/2/1 responsive cards with consistent avatars and stars.
- [ ] Compact promotion hero/cards and maintain sale-product rendering.

### Task 6: Admin image/gallery containment
**Files:** Modify `app/admin/admin-design-system.css`.
- [ ] Bound dashboard/content images.
- [ ] Make admin gallery a compact landscape thumbnail grid/row system.
- [ ] Keep overlays/actions usable and prevent full-screen expansion.

### Task 7: Verification and packaging
**Files:** Update documentation/report only if verification reveals limitations.
- [ ] Run `npm run verify:ui-v3`.
- [ ] Run project verification scripts.
- [ ] Run TS/TSX syntax parse and CSS parse.
- [ ] Run `npm run lint` and `npm run build` if `node_modules` is available; otherwise report the exact blocker.
- [ ] Zip the completed project and produce a concise implementation report.
