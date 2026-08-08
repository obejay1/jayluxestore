# JayLuxe Unified Product, Service and Bridal Card Redesign

## Modified files

- `app/page.tsx`
- `app/categories/page.tsx`
- `app/services/page.tsx`
- `app/bridal/page.tsx`
- `app/bridal/book/page.tsx`
- `app/layout.tsx`
- `app/jayluxe-card-system.css` (new)
- `components/ProductCard.tsx`
- `components/ServiceCard.tsx` (new)
- `lib/layoutClasses.ts`
- `lib/types.ts`
- `lib/bridal.ts`

## Home page

- Seasonal Promotions and Best-Selling Pieces now use a dedicated equal-height two-card row on desktop.
- The two promotional cards stack on tablet and mobile.
- Flash Sale remains a separate featured promotion.
- Featured Products, New Arrivals, Best Sellers and Flash Sale use the same shared responsive product grid.
- Home category cards use the same 2-column mobile, 3-column tablet and 4-column desktop grid pattern.

## Shared product grid

The shared layout is now:

- Mobile: 2 columns
- Tablet: 3 columns
- Desktop and large desktop: 4 columns

This applies to the Home product sections, Shop, Wishlist, Promotions, Related Products, category collections and all routes that redirect into the Shop catalog.

Product cards now include:

- Equal card and image proportions
- Two-line product titles
- Ratings and review count display
- Existing wishlist control
- Existing Quick View behavior
- Existing badges and pricing
- Existing Add to Cart behavior
- Consistent 14px radius, soft shadow and hover lift

## Services

- Added a reusable `ServiceCard` component.
- Featured and filtered services now use the same shared responsive grid.
- Each card includes image, category, optional Featured badge, name, short description, Starting at price and Book Now button.
- Existing search, category filtering, booking selection, booking form and API submission are unchanged.

## Bridal packages

- Bridal cards now use the shared 2 / 3 / 4 responsive grid.
- Cards have equal heights, consistent images, compact included-service summaries, Starting at pricing and full-width booking buttons.
- Complete package features remain available in the comparison table.
- Existing package loading, Firestore data, animations and booking links are unchanged.

## Bridal booking

- Moved “Back to Bridal Packages” above the booking layout.
- Rebuilt Selected Package as a premium summary card with:
  - Package image
  - Package name and price
  - Description
  - Duration
  - Live bridal date
  - Included services
  - Live booking summary for bride, date and location
- Added optional `duration` support to the bridal package data type while preserving packages that do not have a duration value.
- Existing Firestore booking creation remains intact. The booking document now also records package price and duration.

## Validation

Completed successfully:

- `npx tsc --noEmit`
- `npm run lint`
- CSS brace and comment validation

A production build was not run in the repair environment because the available extracted dependency set did not include the Tailwind CSS v3 package referenced by the project PostCSS configuration. The project `package.json` already declares Tailwind CSS, PostCSS and Autoprefixer; run a clean `npm install` locally before building.
