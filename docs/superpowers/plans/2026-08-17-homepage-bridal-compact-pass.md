# Homepage + Bridal Compact Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the JayLuxe homepage and bridal page significantly more compact and connected while preserving brand, routes, data, Cloudinary, Firebase, and existing business logic.

**Architecture:** Update the existing `app/jayluxe-design-system.css` tokens/selectors and the two page components that control homepage category alignment and bridal benefits. Avoid creating a new override stylesheet. Add a dedicated verification script that asserts the required section spacing, mobile heading size/alignment, hero compactness, bridal 3+1 benefit layout, and 2-column bridal package contract.

**Tech Stack:** Next.js 14, React 18, TypeScript, CSS, Framer Motion, Next/Image.

## Global Constraints

- Preserve current JayLuxe branding, content, routes, Firebase, Cloudinary, checkout, admin, and business logic.
- Homepage related sections must use compact intentional spacing with no spacer elements.
- Shop by Category mobile heading must be 18–20px.
- Curated Departments label/header must align left with the category content.
- Existing hero remains the first homepage section and is refined rather than duplicated.
- Bridal benefits use 3 primary columns plus a compact full-width delivery/support row.
- Bridal package grid uses 2 columns on mobile, 6px gap, 12px side padding, 10px radius, 8px body padding, 13px package name, 14px price, 10px CTA font, 7px CTA padding.
- Respect `prefers-reduced-motion`.

---

### Task 1: Add regression verification

**Files:**
- Create: `scripts/verify-home-bridal-compact-pass.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: homepage JSX, bridal JSX, JayLuxe design system CSS.
- Produces: `npm run verify:home-bridal-compact` regression command.

- [ ] Add assertions for homepage hero-first order, compact section padding, category heading left alignment/mobile size, and no centered class on category heading.
- [ ] Add assertions for bridal 3+1 benefit markup and mobile 2-column package values.
- [ ] Run verifier and confirm it fails on the old implementation.

### Task 2: Compact homepage rhythm and category header

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/jayluxe-design-system.css`

**Interfaces:**
- Consumes: current homepage sections and shared header classes.
- Produces: compact homepage rhythm, left-aligned category header, compact hero.

- [ ] Remove the centered category-header class and use a dedicated left-aligned category heading class.
- [ ] Reduce global homepage section padding and tighten the high-priority sequence: Trust → Discover More → Promotions → Categories → New Arrivals → Featured Products.
- [ ] Set mobile Shop by Category heading to 18–20px and reduce header-to-grid spacing.
- [ ] Refine the existing hero to remain visually prominent but shorter on mobile and desktop.
- [ ] Run regression verifier.

### Task 3: Bridal benefit grid and compact package cards

**Files:**
- Modify: `app/bridal/page.tsx`
- Modify: `app/jayluxe-design-system.css`

**Interfaces:**
- Consumes: existing four bridal benefits and package data.
- Produces: 3-column primary benefits + compact delivery row; exact mobile 2-column package contract.

- [ ] Mark the fourth benefit as the supporting delivery row.
- [ ] Style primary benefits as equal 3-column cards on desktop/tablet and preserve compact behavior on small screens.
- [ ] Make delivery support row span all three columns and stay shallow.
- [ ] Enforce exact mobile bridal package grid/card metrics and controlled image ratio.
- [ ] Clamp package copy/features and keep CTA naturally aligned without oversized fixed heights.
- [ ] Run regression verifier.

### Task 4: Full verification and packaging

**Files:**
- Modify: implementation report only if generated outside source tree.

**Interfaces:**
- Consumes: completed source.
- Produces: verified ZIP artifact.

- [ ] Run all repository verification scripts.
- [ ] Parse JS/TS/TSX and CSS for syntax errors using available local tools.
- [ ] Attempt project build only if dependencies are present; otherwise record the precise limitation.
- [ ] Create ZIP and test archive integrity.
