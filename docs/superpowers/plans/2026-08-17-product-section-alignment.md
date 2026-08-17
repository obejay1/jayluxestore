# Product Section Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Give every major JayLuxe product section one responsive left boundary and slightly shorten the shared ProductCard without changing its information or increasing any dimension or font size.

**Architecture:** Export one shared `PRODUCT_SECTION_SHELL_CLASS` from `lib/layoutClasses.ts`, apply it to the existing section wrappers, and define its layout contract in `app/jayluxe-design-system.css`. Keep the existing shared ProductCard and tighten only its final vertical metrics.

**Tech Stack:** Next.js 14, React 18, TypeScript, CSS Grid, existing JayLuxe design system.

## Global Constraints

- Mobile section padding: 12px.
- Tablet section padding: 24px.
- Desktop section padding: 32px.
- Existing JayLuxe max content width: 1280px.
- Product grid gap stays 6px on mobile.
- Product name stays 13px on mobile.
- Category stays 10px on mobile.
- Price stays 14px on mobile.
- CTA font stays 10px.
- Card body padding stays 8px.
- Heart stays 24px × 24px.
- Card radius stays 10px.
- Do not remove product image, name, category, price, Add to Cart, wishlist, Quick View, or badges.
- Do not modify Firebase, Cloudinary, checkout, cart, wishlist data, routes, or authentication.

---

### Task 1: Shared product-section shell and compact card regression

**Files:**
- Create: `scripts/verify-product-section-alignment-v6.mjs`
- Modify: `lib/layoutClasses.ts`
- Modify: `app/page.tsx`
- Modify: `app/shop/page.tsx`
- Modify: `app/product/[id]/page.tsx`
- Modify: `app/promotions/page.tsx`
- Modify: `app/wishlist/page.tsx`
- Modify: `app/jayluxe-design-system.css`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `PRODUCT_GRID_CLASSES`, `CATEGORY_GRID_CLASSES`, ProductCard, and page wrappers.
- Produces: `PRODUCT_SECTION_SHELL_CLASS = 'jl-product-section-shell'` for product-section wrappers.

- [x] **Step 1: Write the failing regression check**

Create `scripts/verify-product-section-alignment-v6.mjs` that asserts:
- `PRODUCT_SECTION_SHELL_CLASS` is exported.
- homepage ProductShowcase and Shop by Category use the shell.
- Shop result section uses the shell.
- Related/Recommended ProductRail uses the shell.
- Promotions product section and Wishlist product section use the shell.
- `.jl-product-section-shell` has `max-width: 1280px`, centered width, and 12/24/32px responsive horizontal padding.
- product/category grids inside the shell remove their own horizontal padding to avoid double-inset.
- related headings are left aligned inside the shell.
- final ProductCard rules keep name/category/price/CTA font sizes at or below the existing contract and make no overall fixed card height.

- [x] **Step 2: Run the new check and confirm it fails for the missing shell**

Run:
```bash
node scripts/verify-product-section-alignment-v6.mjs
```
Expected: non-zero exit with assertions about the missing shared section shell.

- [x] **Step 3: Implement the shared section shell**

Add to `lib/layoutClasses.ts`:
```ts
export const PRODUCT_SECTION_SHELL_CLASS = 'jl-product-section-shell';
```

Import and apply the class to the existing wrappers for homepage ProductShowcase, homepage Shop by Category, Shop results, Related/Recommended ProductRail, Promotions products, and Wishlist content.

Add final design-system rules:
```css
.jl-product-section-shell {
  box-sizing: border-box;
  width: 100%;
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: 12px;
}

.jl-product-section-shell :where(.jl-product-grid-system, .jj-category-grid) {
  padding-inline: 0;
}

.jl-product-section-shell :where(.jj-section-header, .jl-related-head, .wishlist-header, .jl-shop-result-bar) {
  padding-inline: 0;
  text-align: left;
}

@media (min-width: 768px) {
  .jl-product-section-shell { padding-inline: 24px; }
}

@media (min-width: 1100px) {
  .jl-product-section-shell { padding-inline: 32px; }
}
```

Neutralize older Related Products width/padding inside the shell so it follows the same boundary.

- [x] **Step 4: Tighten ProductCard vertical metrics without increasing content or type**

In the final shared ProductCard block:
- keep `padding: 8px`.
- keep mobile title `font-size: 13px` and reduce two-line reserve from 32.5px to approximately 30px with a tighter line-height.
- keep mobile category `font-size: 10px`, one-line truncation, with compact 2px title spacing.
- keep price `font-size: 14px` and reduce category→price spacing to 3px.
- keep CTA `font-size: 10px`, `padding: 7px`, and reduce only its minimum height / top spacing slightly.
- keep `height: auto` on the card.

- [x] **Step 5: Run regression suite**

Run:
```bash
node scripts/verify-product-section-alignment-v6.mjs
for f in scripts/verify-*.mjs; do node "$f"; done
```
Expected: all verification scripts pass.

- [x] **Step 6: Run available production checks**

Run:
```bash
npm run build
npm run lint
```
If dependencies are absent in the supplied archive, record the exact failure instead of claiming these checks passed.

- [x] **Step 7: Package the verified project**

Create a ZIP from the working tree and verify it with:
```bash
unzip -t <output.zip>
```
