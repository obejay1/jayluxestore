# Product Category on Every Product Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dynamic product category metadata to every shared JayLuxe ProductCard while preserving the compact global card system.

**Architecture:** The shared ProductCard remains the single source of truth for product presentation. Category is read from `p.category`, conditionally rendered when non-empty, and styled through the existing JayLuxe design system; no new CSS override file or data model is introduced.

**Tech Stack:** Next.js, React, TypeScript, CSS, existing Product type.

## Global Constraints
- Preserve Firebase, Cloudinary, cart, wishlist, Quick View, routes, and product data.
- Do not hard-code category names.
- Do not render an empty category row.
- Keep mobile product cards compact and existing 2-column grid behavior intact.
- Category must be 10–11px on mobile, one line, muted, and truncated with ellipsis.

---

### Task 1: Product category rendering and styling

**Files:**
- Modify: `components/ProductCard.tsx`
- Modify: `app/jayluxe-design-system.css`
- Create: `scripts/verify-product-card-category.mjs`
- Modify: `scripts/verify-product-card-alignment.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `Product.category?: string`
- Produces: conditional `.lux-product-category` metadata row in every ProductCard.

- [ ] **Step 1: Write the failing regression verifier**
- [ ] **Step 2: Run it and confirm failure because ProductCard does not render category**
- [ ] **Step 3: Add conditional dynamic category markup and compact one-line CSS**
- [ ] **Step 4: Update the older alignment verifier to the new hierarchy**
- [ ] **Step 5: Run the new verifier and the full existing verification suite**
- [ ] **Step 6: Validate TSX/CSS/package syntax and archive integrity**
