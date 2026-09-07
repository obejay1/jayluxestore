# JayLuxe Admin Full-Page Mobile Width Fix

Applied a viewport containment pass to the full `/admin` dashboard page.

## Scope
- Admin page shell/content width
- All direct dashboard sections/cards
- KPI/payment/operational grids
- Admin & Staff Overview
- Commerce Analytics
- Forms and settings cards
- Table wrappers

## Behaviour preserved
- Payment Status remains a 2-column mobile grid.
- Operational metrics remain a 2-column mobile grid.
- Content-heavy sections stack when needed to prevent clipping.
- Tables and the admin nav keep their own intentional horizontal scrolling.

No admin data, permissions, API, Firebase, OPay, Paystack, or business logic was changed.
