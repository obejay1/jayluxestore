# JayLuxe Production Stability Report — 2026-08-11

This package is based on the supplied JayLuxe project and preserves the existing Next.js, Firebase Authentication/Firestore/Storage, Paystack, admin, cart, wishlist, product, category and UI architecture. The changes are targeted fixes rather than a replacement application.

## 1. Catalog image upload root cause and fix

### Root cause
The Admin Products and Categories image inputs were converting selected files to browser `data:image/...` URLs with `FileReader` and then storing those large data URLs in the existing Firestore `image` fields. The public image safety helper intentionally accepted only local paths and approved HTTPS hosts, so those stored data URLs were converted to the placeholder on public product/category surfaces. They were also not durable Storage objects.

### Fix
- Added `lib/catalogImages.ts` using the existing Firebase Storage client.
- Product uploads are stored in `products/`; category uploads in `categories/`.
- JPEG, PNG and WebP are accepted up to 8 MB.
- The uploader waits for Storage to finish, then obtains the Firebase HTTPS download URL and saves that URL in the existing `image` Firestore field.
- Admin preview continues to use the same field, so the preview and public site resolve the same asset.
- `storage.rules` now permits public reads for catalog images and restricts writes to authenticated admin/staff custom claims with the existing `products` or `categories` permission.
- Legacy safe image data URLs remain renderable so older catalog records do not suddenly disappear; new uploads no longer create new data URLs.

**Required manual action:** deploy the included Storage rules:

```bash
firebase deploy --only storage
```

## 2. Reports page

`components/admin/AdminReportsClient.tsx` now has a purpose-built responsive dashboard layout with `AdminReportsClient.module.css`.

- 4-column desktop statistics, 2-column tablet layout, 1-column small-phone layout.
- Charts use Recharts `ResponsiveContainer` and constrained responsive heights.
- Filters stack on mobile.
- Export controls remain full-width/tappable on small screens.
- Data tables stay inside controlled horizontal scrolling containers rather than forcing page-level horizontal overflow.
- Loading, empty and error states are explicit.
- Existing Firestore report data and CSV/Excel/PDF export functionality were preserved.

Breakpoints explicitly cover layouts below 1100 px, 700 px and 420 px, including the requested 320/375/390/414 px phone range.

## 3. Mobile hamburger/drawer

### Root cause
The repository contained multiple generations of global mobile-menu CSS. Competing `.jl-mobile-menu-backdrop` and drawer rules created stacking contexts and applied `backdrop-filter: blur(...)`, while transformed ancestors/animations could make the overlay appear to blur or cover the drawer.

### Fix
- The existing Header/auth/cart/wishlist/category implementation is reused; no second navigation system was added.
- The existing menu remains portaled to `document.body`.
- A final production stability stylesheet is imported last and establishes one isolated fixed menu layer.
- The overlay has no blur/filter and sits below the drawer.
- The drawer slides from the right and remains above the overlay.
- Existing Escape handling, overlay close, X close, route-change close, body scroll lock, `aria-expanded`, `aria-controls`, dialog semantics and `react-focus-lock` focus trapping/return-focus behavior are retained.
- `prefers-reduced-motion` disables nonessential transition duration.

## 4. Resend production email system

The existing centralized email architecture was retained and hardened.

### Production sender routing
Default sender identities now use the verified JayLuxe domain:

- `JayLuxe Orders <orders@jayluxestore.com>`
- `JayLuxe Support <support@jayluxestore.com>`
- `JayLuxe <noreply@jayluxestore.com>`
- `JayLuxe Admin <admin@jayluxestore.com>`

The corresponding Vercel environment variables may override these. No recipient-redirect test mode remains in the production service.

### Reliability and idempotency
- `sendManagedEmail()` uses deterministic Firestore `emailEvents` documents.
- Firestore transactions claim an event before sending and prevent concurrent/repeated sends.
- A deterministic Resend idempotency key is also supplied.
- Sent/scheduled events are skipped on retry.
- Failures are logged and returned to the caller; successful order/payment persistence is not rolled back because Resend is temporarily unavailable.

### Webhook verification/tracking
`/api/email/resend-webhook`:

- reads the raw body before verification;
- requires the Svix ID/timestamp/signature headers;
- verifies the signature with `RESEND_WEBHOOK_SECRET` before trusting the event;
- transactionally claims `svix-id` so replay/retry deliveries do not create duplicate processing;
- tracks sent/scheduled/delivered/delivery-delayed/bounced/failed/complained/suppressed states;
- stores provider timestamps and refuses to let an older, out-of-order webhook regress a newer delivery state;
- stores bounce/failure/provider details;
- updates associated order email-delivery information;
- suppresses newsletter marketing consent after bounce/complaint/suppression;
- returns non-2xx on verified processing failures so the provider can retry.

## 5. Email workflows preserved/hardened

- Order confirmation after trusted server-side order creation.
- Payment confirmation only after Paystack is verified on the server.
- Admin new-order and payment notifications.
- Customer order-status emails.
- Admin cancellation/refund notifications.
- Secure Firebase-generated password-reset emails through Resend.
- Registration verification + welcome emails.
- Contact admin notification + customer acknowledgement with existing validation, honeypot, duplicate hash and Firestore rate limiting.
- Newsletter status/consent storage, duplicate prevention, welcome email and unsubscribe support.
- Admin email retry endpoint remains protected by trusted-origin and server-side admin permission checks.

## 6. Contact page

The existing contact workflow is retained, while the page is redesigned for readability and mobile use:

- high-contrast information panel;
- readable address/phone/email/hours/support information;
- responsive 2-column-to-1-column layout;
- accessible labels, focus/validation states and honeypot field;
- no page-level horizontal overflow.

## 7. Decorative star cleanup

Decorative `Sparkles`/star ornaments were removed at their component/source imports rather than hidden with CSS. Product/testimonial review rating stars were intentionally retained.

## 8. Firebase Admin / dependency stability

- `firebase-admin` remains pinned exactly to `12.7.0`, matching the existing Next.js 14 compatibility fix.
- The supplied `package-lock.json` was internally inconsistent: its Firebase Admin entry said `12.7.0` but its resolved tarball/dependency tree was still `14.2.0`, including the `jwks-rsa` 4 / `jose` 6 ESM path that had produced the Vercel `ERR_REQUIRE_ESM` failure.
- That corrupt lockfile was removed rather than shipping a misleading production lock.
- The prior forced `jose` override was also removed because Firebase Admin 12.7.0 declares its own compatible dependency tree.
- The first successful `npm install` will create a fresh `package-lock.json`; commit that regenerated lock before the final rollout.
- All API routes that directly depend on Firebase Admin are explicitly Node.js runtime routes.

## 9. Production environment

Configure the values listed in `.env.example` in Vercel. At minimum the production server needs the Firebase browser configuration, Firebase Admin service-account values, Paystack values, the Resend API/webhook values and the JayLuxe canonical URL.

Do not expose Firebase Admin, Paystack secret, Resend key or Cloudinary secret through `NEXT_PUBLIC_*` variables.

## 10. Resend DNS/webhook manual actions

Use the exact values displayed in Resend for `jayluxestore.com`; do not guess or replace Vercel web-host DNS records.

Typical required Resend sending records in the existing account are:

- TXT `resend._domainkey` — full DKIM value from Resend.
- MX `send` — exact Resend feedback SMTP target, priority 10.
- TXT `send` — exact SPF value shown by Resend.

Webhook endpoint:

`https://jayluxestore.com/api/email/resend-webhook`

Configure the signing secret as `RESEND_WEBHOOK_SECRET` and subscribe to the email events documented in the README.

## 11. Validation performed in this workspace

Successful static validation:

- 152 `.ts`/`.tsx` source files parsed/transpiled with TypeScript 5.8.3: **0 syntax diagnostics**.
- All local `@/` imports resolve, including CSS-module imports.
- All Firebase Admin API routes inspected have explicit `runtime = 'nodejs'`.
- `package.json`, `tsconfig.json`, `firebase.json` parse successfully.
- `next.config.js` passes Node syntax validation.
- CSS brace-balance audit passes.
- Source audit finds no `EMAIL_TEST_MODE`/`EMAIL_TEST_RECIPIENT` implementation.
- Decorative-star audit leaves only review/rating stars.

Dependency-based validation could not be completed in this execution environment because outbound npm registry DNS is unavailable. `npm install` repeatedly fails with `EAI_AGAIN` while resolving `registry.npmjs.org`; therefore `next` and the project type packages cannot be installed here. As a consequence:

- `npm run lint` cannot launch (`next: not found`).
- full `tsc --noEmit` reports missing React/Next/Firebase package types rather than a meaningful installed-project result.
- `npm run build` cannot launch (`next: not found`).

Run these after a normal networked `npm install` (which also regenerates the clean lockfile):

```bash
npm install
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

No lint/type/build failure has been hidden or disabled.
