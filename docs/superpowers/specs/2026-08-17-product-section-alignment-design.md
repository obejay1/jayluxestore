# JayLuxe Product Section Alignment + Compact Card Design

## Goal
Align all major product sections to one responsive left content boundary while making the existing ProductCard slightly shorter without increasing any card dimension, font size, or content count.

## Approved approach
Use a shared semantic section shell class rather than broad global selectors or replacing every product section with a new React abstraction.

The shell will provide one content boundary:
- mobile: 12px horizontal padding
- tablet: 24px horizontal padding
- desktop: 32px horizontal padding
- max content width: existing 1280px JayLuxe container

The shell will be applied to homepage New Arrivals, Featured Products and Shop by Category, shop/search/category result product lists, promotion/product sections, wishlist product content, and product-detail Related/Recommended sections. Redirect pages for New Arrivals, Featured Products, Best Sellers and Search continue to resolve through the Shop page, so they inherit the same shell automatically.

## Product card density
Preserve all existing details:
- image
- wishlist control
- product name
- category
- price / optional old price
- Add to Cart
- existing Quick View and badges

Do not increase:
- product name: 13px mobile
- category: 10px mobile
- price: 14px mobile
- CTA: 10px
- body padding: 8px
- heart: 24px
- radius: 10px
- grid gap: 6px

Reduce card height only by tightening existing vertical metrics:
- two-line title reserve slightly shorter, still clamped to two lines
- category remains one compact line
- pricing and CTA spacing reduced slightly
- CTA minimum height reduced slightly while preserving usable tap behavior through the full button width
- no fixed overall card height, spacer, or artificial bottom margin

## Grid behavior
Product grids remain true CSS Grid layouts with equal tracks. A single product remains one grid-column width and does not stretch full-width.

## Compatibility
Do not modify Firebase, Cloudinary, checkout, cart, wishlist, product data, routes, pricing logic, or authentication.
