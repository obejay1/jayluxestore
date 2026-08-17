# Homepage Showcase Left Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stack the New Arrivals and Featured Products homepage headers vertically and left-align their eyebrow, heading, and View All action with the product grid.

**Architecture:** Keep the existing shared `ProductShowcase` React component unchanged. Modify only the existing `app/jayluxe-design-system.css` selector for `.jl-home-product-showcase .jj-section-header`, plus a direct-link alignment rule. Add one regression script to verify the CSS contract and that both homepage showcases continue to use the shared component.

**Tech Stack:** Next.js 14, React 18, CSS, Node.js verification scripts.

## Global Constraints
- CSS-only production change.
- Do not increase product-card sizes.
- Do not increase font sizes.
- Do not add content.
- Do not modify Firebase, Cloudinary, routes, product data, or business logic.
- Preserve the shared product-section shell and existing product grid/card rules.

---

### Task 1: Homepage Showcase Header Alignment

**Files:**
- Modify: `app/jayluxe-design-system.css`
- Create: `scripts/verify-home-showcase-left-alignment-v7.mjs`

**Interfaces:**
- Consumes: existing `.jl-home-product-showcase .jj-section-header` and `ProductShowcase` markup in `app/page.tsx`.
- Produces: vertically stacked, left-aligned showcase headers shared by New Arrivals and Featured Products.

- [ ] **Step 1: Write the failing regression test**

Create a Node verification script that asserts the stylesheet contains `flex-direction: column`, `align-items: flex-start`, `justify-content: flex-start`, and the View All link has `align-self: flex-start`; also assert the homepage still invokes the shared `ProductShowcase` for both New Arrivals and Featured Products.

- [ ] **Step 2: Run the regression test and verify RED**

Run:

```bash
node scripts/verify-home-showcase-left-alignment-v7.mjs
```

Expected: FAIL because the existing showcase header uses `align-items: flex-end` and `justify-content: space-between`.

- [ ] **Step 3: Implement the minimal CSS fix**

Update the existing selector to:

```css
.jl-home-product-showcase .jj-section-header {
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 4px;
  margin-bottom: 12px;
  text-align: left;
}

.jl-home-product-showcase .jj-section-header > a {
  align-self: flex-start;
}
```

Do not change ProductCard rules or React markup.

- [ ] **Step 4: Run the focused test and full verification suite**

Run the focused test, then every `scripts/verify-*.mjs` script. Expected: all pass.

- [ ] **Step 5: Validate CSS and package integrity**

Parse CSS with PostCSS if available or a syntax check, create the new ZIP, and run `unzip -t` on it. Expected: no integrity errors.
