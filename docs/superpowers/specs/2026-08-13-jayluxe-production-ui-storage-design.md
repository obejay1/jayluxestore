# JayLuxe Production UI Cleanup and Firebase Storage Reliability Design

## Status
Approved direction: preserve the existing JayLuxe architecture, keep Firebase Storage, require the production Firebase project to satisfy current Cloud Storage billing/access requirements, and consolidate the UI around existing shared components/styles rather than adding another override layer.

## Goals

1. Make the customer and admin interfaces compact, consistent, premium, and responsive without removing or changing working business logic.
2. Reduce excessive whitespace, oversized typography, oversized controls, and conflicting spacing rules across all major routes.
3. Consolidate shared visual tokens and component rules so fixes propagate predictably instead of adding more page-specific CSS patches.
4. Make product/category image uploads observable and failure-safe: validate, upload with progress, obtain a durable URL, preserve edit-state images, show a preview, and always exit loading state on error/timeout.
5. Preserve Firebase Auth, Firestore, Firebase Admin, Storage paths, cart, wishlist, checkout, payment, orders, bookings, reports, Resend, and existing route/data contracts.

## Current-Code Findings

### Styling architecture

`app/layout.tsx` currently imports ten global stylesheets:

- `globals.css`
- `luxury-theme.css`
- `jayluxe-redesign.css`
- `jayluxe-refactor.css`
- `jayluxe-mobile.css`
- `jayluxe-mobile-polish.css`
- `jayluxe-card-system.css`
- `jayluxe-consistency-fixes.css`
- `jayluxe-production-stability.css`
- `jayluxe-feature-update.css`

Several files style the same cards, grids, page sections, mobile breakpoints, navigation, and forms. The codebase also contains many large `60px`–`120px` section paddings/margins and several viewport-height rules. The design will not add an eleventh global override file.

### Image upload architecture

`lib/catalogImages.ts` already uses the correct Firebase client flow:

`uploadBytesResumable()` → progress callback → `getDownloadURL()` → existing Firestore image field.

`app/admin/(protected)/page.tsx` already wraps product/category image selection in `try/catch/finally`, so the visible stuck state is not caused by a missing `finally` block. The uploader presently has a 90-second application timeout and maps common Firebase Storage errors.

The Firebase client reads `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` from `lib/firebase.ts`. The project copy does not contain the user's actual production `.env.local`, so the exact deployed bucket cannot be proven from source alone and must be verified at runtime/configuration time rather than hardcoded.

`storage.rules` currently limits product/category writes to authenticated admins with the matching custom permission and validates JPEG/PNG/WebP files up to 8 MB. Public reads remain enabled for catalog media.

## Design Principles

### 1. One compact spacing system

Add a small shared token layer to the existing global design system, using CSS custom properties rather than hardcoded spacing values scattered across routes.

Proposed values:

- `--jl-space-1: 4px`
- `--jl-space-2: 8px`
- `--jl-space-3: 12px`
- `--jl-space-4: 16px`
- `--jl-space-5: 20px`
- `--jl-space-6: 24px`
- `--jl-section-gap: clamp(24px, 4vw, 40px)`
- compact control heights around 40–44px
- card radius and shadows remain aligned with existing JayLuxe brand styling

Large spacing remains only where it has a functional/design purpose, such as hero composition, full-screen mobile drawers, and fixed/sticky navigation clearances.

### 2. Consolidate rather than blanket-override

The implementation will identify the authoritative stylesheet for each concern and move/reconcile rules there:

- global tokens/base typography → `app/globals.css`
- shared product/category/card density → `app/jayluxe-card-system.css`
- intentional mobile-only structural behavior → `app/jayluxe-mobile.css`
- page-specific exceptions remain in existing CSS Modules (for example checkout)
- admin density stays in existing admin-scoped selectors/styles

Rules duplicated only to compensate for earlier files will be removed or narrowed. Existing class names will be retained where possible to avoid large JSX rewrites.

### 3. Route audit by component family

The audit will cover the actual route families rather than manually changing every element independently:

- storefront shell/header/footer/navigation
- homepage/shared showcases
- shop/search/category/product-card surfaces
- product detail
- cart/wishlist/account/orders
- checkout
- auth pages
- services/gallery/bridal/contact/testimonials/promotions
- invoice/order confirmation
- admin dashboard and shared admin page frame
- admin products/categories/forms/tables/modals/pagination
- reports/users/activity/settings

Shared components are changed first, page-level CSS only where a route genuinely has unique layout needs.

## UI Specification

### Typography

Preserve existing JayLuxe fonts and hierarchy while reducing oversized values.

Customer-facing target ranges:

- page/hero title: responsive, generally 24–40px depending on context
- section heading: 18–28px
- card title: 13–17px
- body/supporting text: 12–15px
- metadata/labels: 10–13px
- buttons: 12–14px

Admin target ranges:

- page title: 20–24px
- section title: 15–18px
- card title: 13–15px
- metric: 18–24px
- body: 11–13px
- metadata: 10–12px

Typography changes remain scoped; no blanket reduction of all text.

### Cards and grids

- Reuse existing `ProductCard`, `ServiceCard`, category card markup, admin cards, and shared showcase components.
- Standardize image aspect ratios per component type.
- Reduce card body padding and vertical gaps.
- Clamp long titles/descriptions where needed without hiding critical information.
- Keep 2-column mobile grids where previously approved and functionally appropriate.
- Use natural-height grid rows unless equal-height alignment adds value.
- Avoid viewport-height sections for content-driven card lists.

### Forms and controls

- Inputs/selects/buttons target 40–44px heights where practical.
- Textareas remain content-appropriate rather than forced to compact single-line heights.
- Reduce repeated vertical margin between labels/fields/actions.
- Maintain minimum tap target/accessibility needs.
- Group related controls within clear sections rather than relying on large blank space.

### Containers and sections

- Use bounded content widths instead of stretching administrative/store content across very wide displays.
- Default section separation generally 24–40px.
- Hero and marketing sections may exceed this only intentionally.
- Mobile bottom-navigation/header safe spacing is preserved but not duplicated as blank section padding.

## Firebase Storage Reliability Design

### Production prerequisite

Keep Firebase Storage. Production must use the exact bucket assigned to the JayLuxe Firebase project; code must never substitute a guessed `*.appspot.com` or `*.firebasestorage.app` value.

The current Firebase platform requires Blaze billing to use/maintain access to Cloud Storage. This is an environment prerequisite, not something application code can bypass. The application should diagnose this cleanly rather than masking it as a generic timeout.

### Client initialization

`lib/firebase.ts` remains the single client Firebase app initializer.

Add development/runtime diagnostics that validate:

- `projectId` exists
- `storageBucket` exists
- the configured bucket belongs to the same expected project identifier when format permits comparison

Never log API keys, tokens, service-account data, or other secrets.

### Upload helper

Keep `lib/catalogImages.ts` as the single catalog-upload helper.

Enhance it to:

1. Validate MIME type and 8 MB limit before task creation.
2. Acquire the existing Firebase Storage instance from the existing app.
3. Use `uploadBytesResumable()` only once per user selection.
4. Report real progress through the existing callback.
5. Normalize Firebase Storage errors while retaining the underlying error code for diagnostics.
6. Align SDK retry behavior with the application timeout using supported Storage retry configuration rather than allowing the SDK to retry longer than the UI permits.
7. Cancel the task on application timeout.
8. On success, call `getDownloadURL()` and return only the durable HTTPS URL.
9. Guarantee a single resolve/reject path.

### Diagnostic error presentation

Admin UI messages should distinguish at least:

- unauthorized/admin-claim failure
- quota/billing restriction
- bucket missing or wrong
- project mismatch
- retry/network timeout
- cancelled upload
- unsupported/oversized file
- unknown Firebase Storage error

The visible toast remains user-friendly. In development, console diagnostics may include the Firebase error code and configured project/bucket names, but never credentials/tokens.

### Image-editing UX

For product and category forms:

- keep existing saved image URL when entering edit mode
- show compact thumbnail if an image exists
- selecting a replacement starts one upload task
- input/action disabled while that task is active
- show real percentage while uploading
- after success replace form URL with returned permanent URL
- provide a clear remove/replace control
- clearing a form image only changes the record field unless the existing system already has safe orphan-file deletion logic; do not invent destructive Storage deletion in this refactor
- on failure preserve the previous existing image when editing

### Rules

Keep the existing permission model:

- `products/*` → admins with `products`
- `categories/*` → admins with `categories`
- public catalog image reads
- allowed MIME types only
- maximum 8 MB

No public write fallback will be added.

## Data and Functionality Preservation

The refactor must not modify the semantics of:

- Firebase Authentication/custom claims
- Firestore collection/document shapes
- Firebase Admin SDK usage
- order creation/status/payment verification
- Paystack integration
- shipping logic
- cart/wishlist state
- product/category CRUD data contracts
- bookings
- reports
- settings
- Resend/email workflows
- invoice calculation/data

Visual changes should reuse existing component props and route/API contracts.

## Error Handling

### UI

- never return an empty layout solely because optional data is missing
- preserve existing loading/empty/error states
- avoid hiding overflow that conceals actionable content

### Upload

- loading state always exits on success, Firebase error, cancellation, or timeout
- progress resets in `finally`
- failed replacement does not destroy an existing saved image URL
- repeated clicks cannot create concurrent uploads from the same form control

## Responsive Strategy

Primary verification widths:

- 320px
- 360px
- 375px
- 390px
- 414px
- tablet around 768px
- laptop 1024–1440px
- wide desktop

At each size verify:

- no page-level horizontal overflow
- header and fixed navigation clearances are correct
- cards/grids do not overlap
- tables use controlled overflow where needed
- forms/buttons remain usable
- text does not clip
- shared product/category grids retain intended columns
- sections do not contain accidental large blank areas

## Testing and Verification

### Static regression checks

Extend the existing scripts rather than replacing them:

- scan critical selectors for reintroduced large mobile spacing/fixed heights
- verify 2-column account/category/product rules remain present where required
- verify no negative-margin workaround is introduced for layout cleanup
- verify catalog upload still uses `uploadBytesResumable` and `getDownloadURL`
- verify Storage rules remain permission-restricted

### Type/lint/build

Run when dependencies are available:

- `npm run lint`
- `npx tsc --noEmit --incremental false`
- `npm run build`

Any failure is fixed before the project is described as build-clean.

### Runtime QA

Manually exercise:

- homepage, shop, product, categories
- cart, wishlist, checkout
- account/order history/order details/invoice
- auth routes
- service/gallery/bridal/contact routes
- admin dashboard/products/categories/orders/reports/settings/users

Image-upload matrix:

1. valid small JPG/PNG/WebP upload
2. image replacement while editing
3. remove/clear image field
4. >8 MB validation
5. unsupported MIME validation
6. permission-denied response
7. incorrect/missing bucket diagnostic
8. slow/network timeout
9. successful preview survives page refresh after record save

### Production configuration QA

Before Vercel deployment confirm:

- exact Firebase project ID
- exact Firebase Storage bucket
- production Firebase billing/storage access
- deployed `storage.rules`
- fresh admin auth token after custom-claim/rule changes

## Files Expected to Change

Primary candidates based on current architecture:

- `app/globals.css`
- `app/jayluxe-card-system.css`
- `app/jayluxe-mobile.css`
- selected existing global override files where duplicate rules must be removed/narrowed
- `app/checkout/page.module.css` only where current spacing is demonstrably excessive
- `app/admin/(protected)/page.tsx`
- admin-scoped CSS used by the protected dashboard/pages
- `lib/catalogImages.ts`
- `lib/firebase.ts`
- `storage.rules` only if a verified mismatch is found
- existing verification scripts under `scripts/`

No new storage provider, database, auth system, checkout path, or parallel design framework will be introduced.

## Non-Goals

- visual rebranding
- changing JayLuxe colors/fonts
- replacing Firebase Storage
- deleting legacy CSS wholesale without proving selectors are superseded
- rewriting the admin dashboard architecture
- changing checkout/payment/shipping behavior
- automatically deleting orphaned Storage files without an existing safe reference-tracking mechanism

