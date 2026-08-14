# JayLuxe Global Density Cleanup Design

## Goal
Create one coherent compact luxury design system across the entire JayLuxe storefront and admin UI while preserving existing application behavior, data flows, Firebase integration, checkout, payments, orders, and protected admin functionality.

## Approved Direction
Use the existing shared compact design tokens and `jayluxe-card-system.css` as the authoritative density layer. Do not add another global override stylesheet. Reduce or neutralize legacy oversized rules only where they conflict with the shared system. Preserve large visual media where it is content-critical, but moderately compact marketing and functional hero areas.

## Density System
- Micro spacing: 4px
- Small spacing: 8px
- Medium spacing: 12–16px
- Large spacing: 20–24px
- Normal section spacing: 24–40px
- Control height: 40–44px
- Card padding: 12–20px
- Compact radius: 10–14px
- Page headings: approximately 24–36px storefront, 20–24px admin/function pages
- Section headings: approximately 18–26px depending on context
- Supporting text: approximately 12–15px

## Hero Strategy
Moderately compact storefront marketing heroes instead of removing them. Functional heroes (Account, Cart, Checkout, Wishlist, Orders, Auth, Admin, Invoice) should be substantially shorter. Editorial/marketing heroes (Home, Services, Gallery, Bridal, About, Contact) should retain visual presence but avoid 430–620px minimum heights unless actual media composition requires it.

## Architecture
1. Keep `app/globals.css` for tokens/base primitives.
2. Keep existing legacy files for route compatibility, but remove the most aggressive oversized declarations at their source where safe.
3. Extend `app/jayluxe-card-system.css`, imported last, as the authoritative shared density layer for recurring route families.
4. Use route/module CSS for unique layouts such as Checkout and Reports, not global selectors.
5. Preserve component behavior and data logic; this is a UI density cleanup, not a component/business-logic rewrite.

## Route Families
- Commerce: Home, Shop, Product, Categories, Cart, Checkout, Wishlist
- Customer: Account, Orders, Login, Register, Forgot Password, Invoice
- Editorial/Services: Services, Beauty Services, Bridal, Gallery, About, Contact, Testimonials, Promotions, FAQ, policies
- Admin: Dashboard, Products, Categories, Orders, Bookings, Users, Reports, Inventory, Settings, Promotions, Testimonials, Activity and related protected interfaces

## Responsive Rules
- 320–414px: compact gutters, 2-column grids where previously required, no horizontal page overflow, no oversized hero gaps.
- Tablet: preserve existing responsive grids while reducing dead space.
- Desktop: use bounded content widths; avoid stretched full-width forms/cards except deliberate banners.

## Non-Goals
- No Firebase schema changes.
- No checkout/payment changes.
- No authentication changes.
- No new design framework or dependency.
- No wholesale page rewrites.
- No negative-margin hacks or hidden content used to simulate compactness.

## Verification
- Static density regression verifier for tokens, hero caps, card/control sizing, mobile grids and forbidden oversized rules in the authoritative layer.
- Existing mobile, admin and production UI/storage verifiers.
- JS/TS parse check.
- CSS structural check.
- JSON/config syntax checks.
- Dependency-aware build only if npm dependencies are available.
