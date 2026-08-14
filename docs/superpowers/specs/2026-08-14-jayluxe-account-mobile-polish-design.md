# JayLuxe Account Mobile Polish Design

## Goal
Tighten the signed-in Account page mobile rhythm without changing authentication, order fetching, cart/wishlist counts, invoice export, logout, or desktop behavior.

## Approved Visual Direction
- Keep the existing 2-column account overview on normal mobile widths.
- Reduce overview card height/padding slightly while retaining touch/readability.
- Reduce the space between overview cards and the signed-in profile bar.
- Reduce profile-bar height and make the Sign Out action shorter.
- Bring Order History closer to the profile bar.
- Replace the plain "Refresh orders" text control with a compact outlined refresh icon + "Refresh" control.
- Keep desktop slightly more spacious than mobile.

## Mobile Targets
- Account overview cards: min-height about 68–74px; padding about 10–12px; gap 8–10px.
- Overview → profile bar: about 12px.
- Profile bar: padding about 12–14px; bottom margin about 12px.
- Sign Out: 36–38px high.
- Profile bar → Order History: about 10–14px.
- Order History title: about 22–24px.
- Refresh: outlined, refresh icon + "Refresh", about 34–36px high, compact 11–12px label.

## Architecture
Use the existing Account page markup and the final imported `app/jayluxe-card-system.css` as the authority layer. Add only the small semantic icon change needed to the existing refresh button. Do not introduce a second Account component or new data state.

## Responsive Behavior
At <=700px, apply the compact values. At <=420px, keep the header row usable with the title block and refresh control aligned without overflow. At <=299px, retain the existing one-column account overview fallback.

## Accessibility
- Keep the refresh control as a native button.
- Preserve disabled behavior while orders are loading.
- Add an `aria-label` that describes refreshing order history.
- Mark the refresh icon decorative with `aria-hidden="true"`.
- Maintain practical touch dimensions and visible focus/hover states.

## Non-Goals
No changes to Firebase, `/api/account/orders`, order calculations, authentication, wishlist/cart storage, invoice/PDF logic, or desktop Account content structure.
