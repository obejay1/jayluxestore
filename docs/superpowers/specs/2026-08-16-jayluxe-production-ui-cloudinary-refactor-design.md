# JayLuxe Production UI + Cloudinary Upload Refactor Design

## Scope

Implement the user's full 2026-08-16 production refactor brief across the existing JayLuxe Next.js application without removing existing customer, checkout, Firebase Auth/Firestore, admin, payment, order, inventory, report, gallery, testimonial, service, or account functionality.

## Architecture

### Shared UI density system
Create a final shared stylesheet, imported last from `app/layout.tsx`, that defines JayLuxe spacing, container, typography, control-height, card, section, grid, modal, upload, table, and mobile-safe viewport tokens. Existing page-specific CSS remains for page identity, while equivalent surfaces are normalized through the shared system. Reusable React components such as ProductCard, ServiceCard, Header/Footer and admin upload fields use the shared classes so density is structural rather than a one-off negative-margin patch.

### Media upload architecture
Cloudinary remains the media backend. Firebase Storage is removed from admin content-upload helpers. The browser first requests an authenticated signed upload payload from `app/api/upload/route.ts`; the route verifies the existing JayLuxe admin session and signs only approved Cloudinary upload parameters without exposing `CLOUDINARY_API_SECRET`. The browser then sends the actual binary file directly to Cloudinary with `FormData` using `XMLHttpRequest`, giving upload progress, timeout handling, and reliable completion on desktop/Android/iPhone Safari while avoiding base64 expansion and Vercel request-body limits.

### Image processing
A single client helper validates MIME type and size, optionally resizes large JPEG/PNG/WebP images to a maximum dimension of 2400px, preserves GIF files without flattening animation, uploads via signed Cloudinary parameters, validates the JSON response, and returns `secure_url` plus `public_id`. Existing saved image URLs are retained until a replacement upload succeeds.

### Reusable admin upload field
A shared `AdminImageUploadField` component owns selection, compression/upload progress, errors, preview, replace/remove controls and independent state per upload slot. Product, category, bridal package, bridal gallery, transformation before/after and testimonial image controls use it. Parent forms only receive a successful URL and can independently block their own save action while a relevant upload is active.

### Responsive/mobile hardening
The final design system enforces two-column product-style grids on supported mobile widths, compact 10-12px gaps, safe `100dvh` fallback rules, `min-width: 0`, `max-width: 100%`, no horizontal page overflow, safe-area padding for fixed mobile navigation, and compact touch-friendly 40-44px controls.

## Data flow

1. User selects an image.
2. Shared client validates format and source size.
3. Large supported still image is resized if beneficial.
4. Client requests signed upload parameters from `/api/upload` using same-origin admin credentials.
5. Server verifies admin session and content/product permission.
6. Server signs Cloudinary timestamp/folder parameters.
7. Browser uploads binary image directly to Cloudinary using FormData/XHR.
8. Progress updates only that upload field.
9. Client validates Cloudinary response and returns URL/public ID.
10. Field updates preview/form state.
11. Existing Firestore save function persists the URL in the current schema.
12. `finally`/XHR completion paths always clear uploading state; errors are shown rather than leaving a stuck label.

## Constraints

- Do not expose `CLOUDINARY_API_SECRET` to the browser.
- Do not migrate Firestore/Auth to another provider.
- Do not migrate media to Firebase Storage.
- Preserve existing document field names and routes.
- Preserve existing stored Firebase/Cloudinary image URLs.
- Allowed upload MIME types: JPEG, PNG, WebP, GIF.
- Max original file guard: 20 MB; max final upload file: 8 MB.
- Max still-image dimension after optional resize: 2400px.
- Mobile product-style grids: two columns where practical.
- Shared page container target: max 1280px with responsive 16-24px gutters.
