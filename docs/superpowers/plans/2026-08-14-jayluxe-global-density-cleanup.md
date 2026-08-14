# JayLuxe Global Density Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make every JayLuxe route visually compact, consistent and premium without changing application behavior.

**Architecture:** Use the existing compact tokens in `app/globals.css` and the final-imported `app/jayluxe-card-system.css` as the shared density system. Repair conflicting legacy declarations at their source only where necessary, and use existing CSS Modules for unique route layouts.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, CSS/CSS Modules, Firebase.

## Global Constraints
- Preserve Firebase Authentication, Firestore, Storage, Firebase Admin, cart, wishlist, checkout, payments, orders, reports, bookings and APIs.
- No new CSS framework or animation dependency.
- No arbitrary negative margins or content hiding.
- Normal section spacing should generally remain within 24–40px.
- Mobile widths to protect: 320px, 360px, 375px, 390px and 414px.

---

### Task 1: Density regression guard
**Files:**
- Create: `scripts/verify-global-density.mjs`

**Produces:** a static regression command that fails if the authoritative compact system loses required tokens, route-family hero caps, compact controls, bounded sections or mobile overflow safeguards.

- [x] Write verifier assertions against the approved density contract.
- [x] Run `node scripts/verify-global-density.mjs` and confirm it fails against the pre-change tree.
- [x] Do not weaken assertions to make production code pass.

### Task 2: Consolidate shared density tokens and recurring route families
**Files:**
- Modify: `app/globals.css`
- Modify: `app/jayluxe-card-system.css`

**Produces:** authoritative spacing, typography, card, section, control and hero density rules for storefront/customer/editorial/admin route families.

- [x] Keep the existing token names and tune only values needed by the approved scale.
- [x] Add scoped route-family rules for functional heroes, marketing heroes, cards, toolbars, forms, tables and common section wrappers.
- [x] Keep 2-column mobile account/product/category/gallery layouts where already required.
- [x] Run the density verifier until green.

### Task 3: Repair legacy high-spacing sources and unique route modules
**Files:**
- Modify: `app/luxury-theme.css`
- Modify: `app/checkout/page.module.css`
- Modify: `components/admin/AdminReportsClient.module.css`
- Modify: `app/admin/admin-dashboard-redesign.css`
- Modify only other existing CSS files when an active unique selector still exceeds the approved density scale.

**Produces:** removal of oversized declarations that cannot be safely normalized through the shared layer, while preserving route-specific behavior.

- [x] Reduce functional hero/min-height declarations at source.
- [x] Compact Checkout spacing without changing checkout logic.
- [x] Compact Reports/dashboard controls/cards/tables while preserving responsive charts and horizontal table containment.
- [x] Verify no new horizontal overflow primitives are introduced.

### Task 4: Cross-route verification and package
**Files:**
- Update: `JAYLUXE_GLOBAL_DENSITY_CLEANUP_REPORT_2026-08-14.md`

**Produces:** complete verified project ZIP and change report.

- [x] Run `node scripts/verify-global-density.mjs`.
- [x] Run existing `verify-mobile-layout.mjs`, `verify-production-ui-storage.mjs`, `verify-admin-dashboard-refactor.mjs`, and `verify-catalog-timer-type.mjs`.
- [x] Parse all JS/TS files and structurally validate CSS/JSON/Next config.
- [x] Run dependency-aware lint/type/build only if dependencies are available; otherwise report the exact limitation.
- [x] Package the complete project and verify ZIP integrity.
