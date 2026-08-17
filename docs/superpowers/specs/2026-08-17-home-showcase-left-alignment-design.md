# Homepage Showcase Left Alignment Design

## Goal
Left-align the New Arrivals and Featured Products homepage showcase headers so the eyebrow, heading, and View All action share the same left boundary as the product grid.

## Scope
Change CSS only. Do not modify React structure, product-card sizing, typography sizes, product data, Firebase, Cloudinary, routing, cart, wishlist, or other business logic.

## Design
For `.jl-home-product-showcase .jj-section-header`:
- stack header content vertically with `flex-direction: column`;
- align all children to the left using `align-items: flex-start` and `justify-content: flex-start`;
- preserve `text-align: left`;
- use a compact internal gap of 4px;
- keep the existing compact bottom margin.

For the direct View All link:
- force `align-self: flex-start`;
- prevent right-floating behavior;
- keep its current type size and interaction behavior.

Because New Arrivals and Featured Products both use the shared `ProductShowcase` component and `.jl-home-product-showcase`, this one CSS rule applies to both sections consistently.

## Acceptance Criteria
1. JUST ARRIVED is left aligned.
2. New Arrivals is directly left aligned beneath it.
3. View All is left aligned beneath the heading, not on the right.
4. CURATED BY JAYLUXE is left aligned.
5. Featured Products is directly left aligned beneath it.
6. Its View All link is left aligned beneath the heading.
7. The shared header starts on the same left boundary as the product grid.
8. Product-card dimensions and typography remain unchanged.
9. No new stylesheet is created.
