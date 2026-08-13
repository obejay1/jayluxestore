# JayLuxe Mobile Compact Card Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the existing JayLuxe responsive card/layout system so mobile account, category, product, service, gallery, and help sections are compact, stable, and functional without changing Firebase/business logic.

**Architecture:** Keep the existing React components and Firebase data flow. Treat `app/jayluxe-card-system.css` as the shared compact-card authority, remove only conflicting mobile declarations from older styles, and add focused semantic classes only where existing markup needs a stable styling hook. Preserve the existing `/shop?category=<name>` and `/services?category=<name>` navigation behavior.

**Tech Stack:** Next.js 14.2.15 App Router, React 18, TypeScript, existing CSS/Tailwind utility output, Firebase, Lucide React.

## Global Constraints

- Do not remove or break existing functionality.
- Do not use arbitrary negative margins or fixed viewport heights to mask layout problems.
- Account summary should remain 2×2 on normal mobile widths and only stack at extremely narrow widths.
- Categories, products, services, and gallery must stay browsable with no horizontal page overflow.
- Keep existing product filtering, cart, wishlist, orders, bookings, authentication, Firebase collections, and desktop/tablet behavior.
- Reuse existing `ProductCard.tsx`, `ServiceCard.tsx`, category markup, and gallery markup.
- Category navigation must keep filtering products through the existing query-string routing.
- Mobile targets: 320px, 360px, 375px, 390px, 414px.

---

### Task 1: Add source-level regression checks for the mobile layout contract

**Files:**
- Create: `scripts/verify-mobile-layout.mjs`

**Interfaces:**
- Consumes: `app/luxury-theme.css`, `app/jayluxe-card-system.css`, `app/page.tsx`, `app/account/page.tsx`, `lib/layoutClasses.ts`
- Produces: a zero-dependency Node verification command that exits non-zero when the required mobile layout contract regresses.

- [ ] **Step 1: Write the failing verifier**

Create assertions for: account 2-column rule at <=600px; shared two-column card grid; category cards with no forced mobile minimum height; homepage category links preserving category query; homepage Featured/New Arrivals both using `ProductShowcase`; no negative-margin fix in the compact-card stylesheet.

- [ ] **Step 2: Run verifier and confirm RED**

Run: `node scripts/verify-mobile-layout.mjs`
Expected: FAIL because the <=600px account rule currently forces one column and the compact section contract is not yet complete.

### Task 2: Repair account summary and shared grid cascade

**Files:**
- Modify: `app/luxury-theme.css`
- Modify: `app/jayluxe-card-system.css`

**Interfaces:**
- Consumes: existing `.jl-account-overview`, `.jl-responsive-card-grid`, `.jj-category-card`, `.lux-product-card`, `.jl-unified-service-card`
- Produces: predictable two-column mobile account/cards and natural-height category/product/service cards.

- [ ] **Step 1: Replace the <=600px account one-column override with a two-column rule**
- [ ] **Step 2: Add an extreme-width fallback only below 300px**
- [ ] **Step 3: Consolidate compact card/grid spacing and remove forced equal row heights where they create excess vertical space**
- [ ] **Step 4: Ensure category cards use natural content height and media aspect ratio without `min-height: 330px` on mobile**
- [ ] **Step 5: Run verifier and confirm account/grid assertions pass**

Run: `node scripts/verify-mobile-layout.mjs`
Expected: PASS for Task 1/2 assertions.

### Task 3: Compact homepage category, Featured/New Arrivals, and help/booking flow

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/jayluxe-card-system.css`

**Interfaces:**
- Consumes: `ProductShowcase`, `CATEGORY_GRID_CLASSES`, `PRODUCT_GRID_CLASSES`, existing contact links.
- Produces: compact homepage sections with stable semantic hooks and no artificial blank space.

- [ ] **Step 1: Add semantic compact classes to category, product-showcase, and help/booking sections without changing their data or links**
- [ ] **Step 2: Keep all active categories mapped and preserve `/shop?category=` / `/services?category=` destinations**
- [ ] **Step 3: Tighten mobile section paddings, heading spacing, View All placement, category card copy, and help cards in the shared stylesheet**
- [ ] **Step 4: Ensure Featured Products and New Arrivals share the same `ProductCard`/grid system**
- [ ] **Step 5: Run verifier**

Run: `node scripts/verify-mobile-layout.mjs`
Expected: PASS.

### Task 4: Compact Shop, Services, and Gallery through existing shared components

**Files:**
- Modify: `app/jayluxe-card-system.css`
- Modify: `app/jayluxe-mobile.css` only where a conflicting legacy mobile override must be removed or narrowed.

**Interfaces:**
- Consumes: `ProductCard.tsx`, `ServiceCard.tsx`, `.jl-responsive-gallery-grid`, existing shop/service/gallery page classes.
- Produces: consistent compact product/service/gallery cards and responsive two-column mobile presentation where appropriate.

- [ ] **Step 1: Normalize product-card padding, title clamp, image ratio, price and CTA sizing for mobile**
- [ ] **Step 2: Normalize service-card media/body/description/CTA sizing without changing booking behavior**
- [ ] **Step 3: Normalize gallery media ratio/body spacing/CTA and two-column mobile gaps**
- [ ] **Step 4: Remove/narrow legacy <=420px rules that force shared grids back to one column**
- [ ] **Step 5: Run verifier**

Run: `node scripts/verify-mobile-layout.mjs`
Expected: PASS.

### Task 5: Static, TypeScript, lint, build, and artifact verification

**Files:**
- Modify only if verification exposes a direct regression.

**Interfaces:**
- Produces: validated project and distributable ZIP.

- [ ] **Step 1: Run source verifier**

Run: `node scripts/verify-mobile-layout.mjs`
Expected: PASS.

- [ ] **Step 2: Run syntax/import checks available without dependencies**

Run project-local source scans and JSON/Node config parsing.
Expected: no syntax/config errors.

- [ ] **Step 3: Install dependencies if registry access is available**

Run: `npm install`
Expected: dependencies installed and a fresh lockfile generated. If network access blocks installation, record the limitation rather than claiming success.

- [ ] **Step 4: Run TypeScript, ESLint, and production build when dependencies are available**

Run:
`npx tsc --noEmit --incremental false`
`npm run lint`
`npm run build`
Expected: all pass. If dependency installation is unavailable, report these as not executed.

- [ ] **Step 5: Package the complete project and validate archive integrity**

Create a ZIP containing the entire updated JayLuxe project, excluding transient caches/dependencies.
Expected: `unzip -t` reports no errors.
