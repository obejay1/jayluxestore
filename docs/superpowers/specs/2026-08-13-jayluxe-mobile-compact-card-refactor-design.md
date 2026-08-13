# JayLuxe Mobile Homepage & Compact Card System Refactor — Design

Date: 2026-08-13
Status: Approved approach, pending final spec review

## Objective

Refactor the existing JayLuxe responsive presentation without replacing working commerce, Firebase, authentication, cart, wishlist, orders, bookings, filtering, category data, or desktop/tablet behavior. The work will repair the existing CSS cascade and reuse the current shared card components rather than adding a second UI system.

## Chosen Approach

Use the existing shared component and CSS architecture as the source of truth, with `app/jayluxe-card-system.css` as the compact-card layer and narrowly scoped corrections in the existing responsive styles. Avoid a new parallel card library and avoid another catch-all override stylesheet.

## Confirmed Existing Architecture

- `components/ProductCard.tsx` is the shared product card used across product surfaces.
- `components/ServiceCard.tsx` is the reusable service-card implementation.
- Homepage categories are driven by existing category data and rendered from the current collection.
- Category links already use `/shop?category=<category>` semantics and the Shop page reads the category query parameter.
- Multiple global stylesheets currently target overlapping homepage/card/category/account selectors.

## Root Causes to Repair

### Account summary layout

The existing account summary switches to two columns at a broader breakpoint, but a narrower mobile rule later forces a single column. The narrow override will be removed/replaced so 320–414px keeps a 2×2 layout where usable, with an emergency one-column fallback only below a deliberately tiny threshold if necessary.

### Category blank-space problem

The blank area is not to be solved with negative margins or fixed-height compensation. The refactor will remove inherited card/section minimum heights and conflicting mobile spacing rules from the responsible category/homepage selectors. Category containers will size naturally from content.

### CSS cascade conflicts

The same card and section selectors are currently styled in several global files. Existing rules will be consolidated or narrowed so compact card dimensions come from one shared layer and page-specific files only apply page-specific layout.

## Responsive Compact Card System

### Shared tokens

The existing design palette is preserved. Shared compact card rules will standardize:

- border radius
- border/shadow treatment
- image aspect ratio
- content padding
- row/column gaps
- heading/price line-height
- compact CTA height
- title clamping
- description clamping where appropriate
- focus/hover behavior

The implementation will prefer existing CSS variables where available and add only narrowly scoped variables if a repeated value currently lacks a token.

### Product cards

`ProductCard.tsx` remains the authoritative product-card behavior. Styling changes will preserve links, quick view, wishlist, cart, pricing, rating/review information, badges, and image behavior.

Mobile target: two columns with `minmax(0, 1fr)`, compact gap, consistent image crop, two-line title maximum, always-visible price, and usable CTA controls.

### Category cards

All active categories remain visible/browsable. Mobile target is a two-column natural-height grid. Each category link preserves the current category-filter route instead of falling back to a generic unfiltered `/shop` destination.

### Service cards

`ServiceCard.tsx` stays in place. Reduce padding/image excess and clamp long supporting copy where that does not hide essential service information. Existing booking/service links remain unchanged.

### Gallery items

Preserve gallery modal/navigation behavior. Normalize tile aspect ratio, crop with `object-fit: cover`, use compact gaps, and use two columns on mobile where the existing content supports it.

### Homepage help/booking cards

Preserve support/booking destinations. Reduce padding and vertical whitespace; align icon, text, and CTA consistently with the shared compact card language.

## Homepage Flow

Mobile flow after refactor:

1. Existing header/hero
2. Shop by Category
3. Curated by JayLuxe
4. Featured Products
5. View All
6. New Arrivals
7. Remaining existing homepage sections
8. Help / Booking
9. Footer / bottom navigation

No artificial fixed-height separator or hidden element may occupy layout space between these sections.

## Featured Products and New Arrivals

Both sections use the same existing product card component and shared compact styling. No duplicated card component will be introduced.

- two-column mobile product grid
- consistent image ratio
- compact heading spacing
- View All immediately associated with Featured Products
- no oversized section padding
- no blank area reserved for hidden content

## Shop Page

Preserve the existing search, sort, category filter, wishlist, cart, and product navigation logic. Only presentation changes are allowed unless a routing defect is directly found.

Category selection must continue to produce a filtered listing. The route/query value will be normalized using the current project convention; category objects will never be transformed into product objects.

## Account Summary

Maintain the four existing data-backed cards:

- Welcome / customer name
- Your Orders / order count
- Wishlist / saved item count
- Shopping Bag / cart count

Mobile layout: `repeat(2, minmax(0, 1fr))` with compact padding and natural height. Values and icons remain data-driven and interactive behavior remains unchanged.

## Breakpoint Strategy

Primary verification widths:

- 320px
- 360px
- 375px
- 390px
- 414px

Desktop and tablet receive only the minimum shared-card changes required for consistency. Existing stable desktop/tablet grids should not be collapsed or restructured without evidence of a defect.

## CSS Rules That Will Be Rejected

The implementation will not use these as layout patches:

- arbitrary negative margins
- fixed heights to mask spacing bugs
- `100vh`/`100dvh` for content sections that should size naturally
- hidden duplicate elements that still reserve space
- large bottom padding added solely to move sections visually
- another broad global override file

## Accessibility and Interaction

- preserve semantic links/buttons
- keep visible focus states
- maintain tap targets large enough for mobile use
- avoid text clipping that removes necessary information
- preserve reduced-motion behavior where already present
- do not remove alt text or accessible labels

## Verification Plan

### Static inspection

- search all relevant global/module CSS for duplicate selectors and fixed/min heights
- check local imports and route targets
- inspect account/category/product/service/gallery/help component use
- confirm category links preserve filter value

### Automated checks

Where dependencies are available:

- `npm run lint`
- `npx tsc --noEmit --incremental false`
- `npm run build`

If the execution environment cannot install packages, report that limitation explicitly and still perform syntax/import/CSS structural checks.

### Responsive verification

At 320, 360, 375, 390, and 414px verify:

- account summary remains 2×2 where usable
- all categories are visible and section height is natural
- category links filter the Shop listing
- Featured Products and New Arrivals use the same compact two-column system
- product titles/prices/CTAs remain readable and usable
- no horizontal page overflow
- no giant blank sections
- bottom navigation does not obscure content
- services/gallery/help cards are compact and aligned

At tablet/desktop verify no layout regression in shared cards or navigation.

## Data and Backend Safety

No changes are planned to:

- Firebase configuration
- Firestore collection structure
- authentication
- admin authorization
- order/payment logic
- checkout/shipping logic
- Resend/email integration
- cart/wishlist persistence
- booking APIs

Any backend modification discovered to be necessary during implementation must be directly tied to a verified routing/data defect and must preserve existing contracts.

## Completion Criteria

The refactor is complete only when the mobile homepage naturally flows without artificial spacing, all categories remain browsable, category filtering still works, shared card surfaces are compact and consistent, account summary is 2×2 on normal mobile widths, desktop/tablet remain stable, and the available type/lint/build checks pass or any environment limitation is explicitly documented.
