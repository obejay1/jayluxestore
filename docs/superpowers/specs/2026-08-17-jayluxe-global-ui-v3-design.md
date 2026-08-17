# JayLuxe Global Product Card, Layout & UI/UX Refinement Design

## Scope
Use the current JayLuxe Premium UI V2 project as the base and preserve all existing business logic, routes, Firebase Auth/Firestore, Cloudinary uploads, cart, checkout, wishlist, orders, admin roles, and payment behavior.

## Design decisions
- Make product presentation the single most compact repeated system: 6px product-grid gap, 12px grid side padding, 10px card radius, 8px body padding, 24px heart button, 13px product name, 14px price, and CTA with 7px padding / 10px type.
- Keep product images at 4:5. Mobile storefront grids remain two columns; tablet three; desktop four.
- Reorder the homepage to Hero → Trust → Discover More → Promotions → Shop by Category → New Arrivals → Featured Products, then retain services, bridal, transformations, testimonials, support and footer.
- Use three compact Discover More columns for Services, Bridal and Gallery. Keep the promotion links in a separate three-item promotional strip.
- Animate trust icons subtly: delivery translates horizontally, quality rotates slowly, support rings. Disable loops under reduced-motion.
- Product detail remains a two-column desktop layout but becomes more compact; mobile supports touch image swiping and a sticky Add to Cart action above the existing bottom navigation. Trust copy becomes Fast Delivery, Secure Checkout and Easy Returns.
- “Recommended for You” gets a dedicated header with View All, four columns on desktop and a horizontal mobile rail.
- Bridal booking alignment is normalized around its hero icon/eyebrow and summary cards. Bridal package cards use equal heights and a three-column package grid on desktop.
- Testimonials use 3/2/1 responsive columns, consistent avatar treatment, restrained shadow and hover lift.
- Promotions retain current data and functionality but gain a compact conversion-oriented hero/cards layout.
- Admin gallery uses small landscape thumbnails and never allows images to dominate the viewport. Dashboard/media previews are bounded.
- Do not add another global stylesheet; modify the existing canonical `jayluxe-design-system.css` and `admin-design-system.css` layers.

## Accessibility/performance
Preserve keyboard focus, ARIA labels and touch targets. Motion must honor `prefers-reduced-motion`. No new runtime dependency is required.

## Verification
Add a static regression script that asserts the exact product-card values, homepage ordering/classes, product mobile sticky cart/recommendation rail, testimonial grid, and compact admin gallery rules. Run syntax checks and the existing project verification scripts. Run Next build/lint if dependencies are available.
