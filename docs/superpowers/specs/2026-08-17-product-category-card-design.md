# Product Category on Every Product Card — Design

## Goal
Show each product's existing dynamic `category` directly below the product name in the shared JayLuxe ProductCard without materially increasing card height or breaking mobile grid alignment.

## Architecture
- Modify only the shared `components/ProductCard.tsx` rendering path for product cards.
- Read `p.category` from the existing `Product` object; never hard-code category names.
- Render no category element when the value is absent or blank.
- Style the category in `app/jayluxe-design-system.css` as one-line, muted, compact metadata with overflow ellipsis and `min-width: 0`.
- Preserve existing 1:1 media box, two-line product title, price, CTA, wishlist, Quick View, grid widths, and responsive image `fill`/`sizes` behavior.

## Layout
Image → 8px body inset → Product Name → 2–4px → Category → 4–6px → Price → 6–8px → CTA.

Mobile contract remains: 2 columns, 6px grid gap, 12px side padding, 10px card radius, 8px body padding, 13px title, 10–11px category, 14px price, 10px CTA text, 7px CTA padding, 24×24px wishlist.

## Error/edge behavior
- Missing or whitespace-only category: no rendered row and no reserved blank height.
- Long category: one line, ellipsis, no horizontal overflow.
- Existing image/card alignment behavior remains unchanged.

## QA
Add a regression verifier for dynamic category rendering, conditional hiding, mobile type size, truncation, spacing, and unchanged compact card/grid contracts. Update the older alignment verifier so it reflects the new hierarchy.
