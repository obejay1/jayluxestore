# JayLuxe Premium UI V2 Implementation Plan

**Goal:** Apply a production-wide compact luxury UI system while preserving JayLuxe routes, commerce, Firebase, Cloudinary uploads, authentication, admin, and business logic.

**Architecture:** Consolidate the imported theme layers into `app/jayluxe-design-system.css` while retaining `app/globals.css` as the legacy/base sheet. Make targeted component changes only where structure/behavior is required: homepage editorial composition and mobile carousels, compact ProductCard metadata/action layout, upload aspect-ratio semantics, and admin density. Keep upload transport and Firebase/Cloudinary business logic unchanged.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, CSS, Framer Motion, Firebase/Firestore/Auth, Cloudinary signed uploads.

## Global Constraints
- Preserve JayLuxe brand identity, logo, colors, content, routes, Firebase, Cloudinary, checkout, product data, admin and existing business logic.
- Use 4/8/12/16/20/24/32/40px spacing tokens.
- Product grids: 2 mobile, 3 tablet, 4 desktop.
- Homepage product/testimonial showcases may horizontally scroll on mobile; shop/category grids stay 2-column.
- Upload dropzones stay wide/horizontal; previews use content-specific aspect ratios.
- Do not expose Cloudinary secrets or migrate image storage.
- Preserve accessibility, keyboard/focus behavior, touch targets, and reduced-motion support.

### Task 1: Regression verification
- Create `scripts/verify-premium-ui-v2.mjs` checking design-system import consolidation, tokens, homepage structure, mobile carousel hooks, upload shape semantics, reduced-motion handling, and responsive grid rules.
- Run it before implementation and confirm it fails.

### Task 2: Consolidated design system
- Create `app/jayluxe-design-system.css` from the currently imported theme layers in their existing cascade order.
- Add Premium UI V2 tokens and refinements at the end.
- Modify `app/layout.tsx` so the root imports only `globals.css` and `jayluxe-design-system.css` for global theming.
- Keep specialized admin/module CSS where locally scoped/required.

### Task 3: Homepage editorial refinement
- Modify `app/page.tsx` for subtle 8px animation, compact trust animation, horizontal mobile product showcase hooks, simplified categories, compact bridal features, editorial compare CTA, horizontal mobile testimonials, and one primary WhatsApp CTA.
- Preserve all destination URLs, fetched data, quick view, product actions and business content.

### Task 4: Reusable product and upload presentation
- Keep ProductCard behavior intact and reduce structural dead height/min-height.
- Make `AdminImageUploadField` dropzone wide while previews honor `data-shape`.
- Update admin upload usages: categories/gallery/transformation/testimonials/services landscape; products/gallery portrait; bridal package portrait.

### Task 5: Global responsive/admin/accessibility polish
- Apply compact tokens to common page wrappers, forms, auth, checkout, account, wishlist, admin cards/tables/modals/footer/header.
- Standardize grid gaps and responsive columns.
- Add iOS-safe `100dvh`, `overflow-x: clip`, safe-area and reduced-motion rules.

### Task 6: Verification and packaging
- Run all repository verification scripts.
- Run TypeScript/ESLint/build when dependencies are available; otherwise report the exact blocker without claiming success.
- Scan for overflow-prone `100vw`, raw duplicate global CSS imports, large animation distances, and broken upload shape usage.
- Package the updated source and write a concise implementation report.
