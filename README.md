# JayLuxe E-commerce Website

JayLuxe is a responsive luxury e-commerce application built with Next.js 16.3.3, React 19.2.7, TypeScript, Firebase Authentication/Firestore, Firebase Admin, Paystack, Resend, Cloudinary, and optional Termii integration and an intentionally disabled OPay placeholder.

**Canonical production URL:** `https://jayluxestore.com`

Current release-readiness authority: `PHASE34_SECURITY_PAYMENT_INTEGRITY_REPORT.md`. Older phase reports are retained only as historical implementation records.

`https://www.jayluxestore.com` is supported as an alternate hostname and is redirected permanently by `next.config.js` to the apex canonical domain. The hosting/DNS layer must also enforce HTTPS.

## Requirements

- Node.js 22 or later
- npm
- Firebase project `jayjaystyles` with Email/Password Authentication, Firestore, and Storage enabled
- Firebase Admin credentials or Application Default Credentials for server routes
- Paystack secret key for server-initialized checkout
- Optional: Resend, Cloudinary, Termii, OPay, and Google Analytics

## Local setup

```bash
npm install
cp .env.example .env.local
```

`firebase-admin` is pinned exactly to `12.7.0`. The application dependencies have been updated to the current patched Next.js 16 Active LTS line and React 19.2.7. A package lock could not be regenerated inside the stabilization environment because the npm registry was unreachable. Before deployment, run `npm install` once in a network-enabled environment, review/commit the resulting `package-lock.json`, then use `npm ci` for repeatable builds.

For local development, override these two values in `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then run:

```bash
npm run dev
```

Open `http://localhost:3000`. Never commit `.env.local`, service-account JSON files, private keys, Paystack secret keys, Resend keys, Cloudinary secrets, or anything inside `secrets/`.

## Firebase production configuration

The checked-in Firebase project mapping remains:

```text
jayjaystyles
```

No second Firebase project is referenced by the application, so do not create or switch to another Firebase project merely because the public brand/domain is JayLuxe.

In Firebase Console:

1. Confirm **Authentication → Sign-in method → Email/Password** is enabled.
2. Open **Authentication → Settings → Authorized domains** and add:
   - `jayluxestore.com`
   - `www.jayluxestore.com`
   - retain `localhost` if local Firebase Authentication is required.
3. Keep `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` set to the auth domain shown for the existing Firebase web app unless a custom Firebase Auth redirect/email-action domain has been explicitly configured. Do not simply replace it with `jayluxestore.com`.
4. For fully branded password-recovery/action emails, optionally configure the custom Authentication email/action domain under **Authentication → Templates** and complete Firebase's required DNS verification. The application already sets the password-reset continuation URL back to `https://jayluxestore.com/login` in production.
5. Confirm Firestore is enabled in the `jayjaystyles` project.
6. Confirm Cloudinary credentials are configured for all admin-managed catalog/content image uploads.
7. Configure the browser Firebase values from this same Firebase web app using the `NEXT_PUBLIC_FIREBASE_*` variables.
8. Configure Firebase Admin with server-only `FIREBASE_ADMIN_*` values or Application Default Credentials.
9. Deploy the checked-in Firestore and Storage rules after reviewing them:

```bash
firebase deploy --only firestore:rules
```

The browser Firebase configuration is public application configuration. Firebase Admin credentials and private keys are never exposed through `NEXT_PUBLIC_*` variables.

### Authentication and sessions

Customer authentication remains Firebase Email/Password. Customer password reset returns users to the production login URL. Admin/staff sign-in still exchanges a recent Firebase ID token for a signed, HttpOnly, `SameSite=Lax`, Secure-in-production session cookie. Protected admin APIs continue verifying the session server-side.

The direct Firestore rules remain permission-based and deny unmatched access. The new Storage rules permit public reads only for the existing public media paths and restrict writes to authenticated admins/staff with the corresponding custom-claim permission and image file constraints.

## Required production environment variables

At minimum configure the following in the production hosting environment:

```env
NEXT_PUBLIC_APP_URL=https://jayluxestore.com
NEXT_PUBLIC_SITE_URL=https://jayluxestore.com

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

PAYSTACK_SECRET_KEY=

RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
RESEND_FROM_EMAIL=
ADMIN_EMAIL_FROM=
CONTACT_FROM_EMAIL=
ORDER_FROM_EMAIL=
ACCOUNT_FROM_EMAIL=
BOOKING_FROM_EMAIL=
NEWSLETTER_FROM_EMAIL=

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

NEXT_PUBLIC_GA_ID=
```

See `.env.example` for optional integrations and recipient addresses. Do not invent or commit secret values.

## Hosting architecture and domain

This application is **not a static export**. It contains Node.js route handlers, Firebase Admin authentication/session logic, Paystack server verification, Resend email routes, and protected APIs. The previous `firebase.json` configuration that published only an `out/` directory was therefore not a valid deployment definition for this application and has been removed.

The repository archive does not contain a provider-specific production web-host binding (`.vercel/project.json`, an App Hosting backend definition, or another verified runtime target), so the live web hosting provider cannot safely be asserted from source code alone. Keep the existing Node-capable production host; do not deploy this project as a bare static `out/` site.

If the existing production host is Firebase, use a supported dynamic Next.js architecture. Firebase currently recommends **App Hosting** for Next.js rather than starting a new framework-aware Firebase Hosting experiment. Do not create a new Firebase *project* for this: an App Hosting backend, if required, should be created inside the existing `jayjaystyles` Firebase project and connected to the existing repository/live branch.

### DNS records

Do **not** copy guessed A/CNAME values from this README. The exact DNS values are generated by the web host when `jayluxestore.com` is attached to the real production project/backend.

- For Firebase App Hosting: open the existing backend → **Settings → Add custom domain**. Add `jayluxestore.com`, then add `www.jayluxestore.com` and select the option to redirect it to `jayluxestore.com`. Copy the exact A/CNAME/TXT/ACME records shown by Firebase into your DNS provider.
- If the actual existing host is another Node-capable provider, attach both hostnames there and copy that provider's exact DNS records instead.

The desired behavior is:

```text
http://jayluxestore.com      -> https://jayluxestore.com
http://www.jayluxestore.com  -> https://jayluxestore.com
https://www.jayluxestore.com -> https://jayluxestore.com
```

The application handles the `www` → apex permanent redirect. HTTP → HTTPS and certificate provisioning must be enforced by the hosting edge/platform. Do not create DNS records until the actual production project/backend displays the required values.

## SEO

The canonical site URL is generated from the shared site URL helper and defaults to `https://jayluxestore.com` in production. Public routes have explicit canonical and Open Graph URLs. The root Organization JSON-LD uses the canonical website and logo URLs.

Production endpoints:

```text
https://jayluxestore.com/sitemap.xml
https://jayluxestore.com/robots.txt
```

`robots.txt` and route metadata prevent indexing of admin, API, checkout, account, order, invoice, login, registration, password-reset, and booking-form routes.

## Resend

Do not activate `@jayluxestore.com` sender values until the domain has been verified in the Resend account. After verification, suitable sender values include:

```env
RESEND_FROM_EMAIL="JayLuxe <hello@jayluxestore.com>"
ADMIN_EMAIL_FROM="JayLuxe Administration <admin@jayluxestore.com>"
CONTACT_FROM_EMAIL="JayLuxe Client Care <care@jayluxestore.com>"
ORDER_FROM_EMAIL="JayLuxe Orders <orders@jayluxestore.com>"
BOOKING_FROM_EMAIL="JayLuxe Bookings <bookings@jayluxestore.com>"
NEWSLETTER_FROM_EMAIL="The JayLuxe Edit <newsletter@jayluxestore.com>"
```

Keep the existing recipient/reply-to addresses unless the business intentionally changes them. Resend API keys remain server-only.

## Paystack checkout

Configure the real production credentials in the hosting environment only:

```env
PAYSTACK_SECRET_KEY=
```

Do not commit live keys. Standard and first-installment checkout is initialized on the server through `/api/checkout/initialize`; the browser never decides the trusted Paystack amount or reference. The server snapshots authoritative products/settings/coupons, reserves managed inventory, creates a short-lived checkout intent, and then initializes Paystack. Abandoned/failed reservations are releasable and expired reservations are cleaned opportunistically during later checkout initialization.

The callback returns to `/checkout/complete`, while the signed webhook at `/api/paystack/webhook` can finalize the same checkout intent even if the customer's browser closes. Finalization verifies reference, successful status, `NGN` currency, amount, email and payment-reference reuse, and is idempotent. Order access credentials are not stored in query strings; guest links use a URL fragment that is captured into session storage and then removed from the visible URL.

## Cloudinary media uploads

Admin-managed product, category, bridal, gallery, transformation, testimonial and service images use signed Cloudinary uploads. The Cloudinary API secret remains server-only; the browser receives only a short-lived signature after the admin session and folder permission are verified. Legacy Firebase/Google Storage image URLs remain readable by Next.js image configuration for existing records, but new admin uploads use Cloudinary.

## Analytics

Google Analytics is loaded only when `NEXT_PUBLIC_GA_ID` is configured. There is no hard-coded fallback measurement ID. Manual page views deliberately send only the pathname, excluding query strings and fragments so checkout/order credentials cannot be forwarded to analytics. Do not invent a measurement ID.

## Admin and staff bootstrap

After Firebase Admin credentials are configured, create or upgrade the first Super Admin from the project root:

```bash
npm run admin:bootstrap
```

Then sign in at `/admin/login`. Passwords remain in Firebase Authentication; they are not stored in Firestore or environment variables.


### CSS source layout

`app/globals.css` and `app/jayluxe-design-system.css` are generated compatibility bundles. Edit the ordered source modules under `app/styles/globals/` and `app/styles/design-system/`, then run `npm run css:build`. `predev` and `prebuild` regenerate the bundles automatically. This keeps the existing cascade visually stable while making changes reviewable by section.

## Validation before deployment

First generate and commit `package-lock.json` from a network-enabled environment if this archive does not already contain one. After the lockfile exists, run:

```bash
npm ci
npm run verify:security
npm test
npm run lint
npm run typecheck --incremental false
npm run build
```

When Firebase CLI access is available, also validate/deploy the production rules against the intended `jayjaystyles` project. Do not bypass TypeScript, ESLint, authentication, payment verification, or Firebase security checks to force a deployment.

## Production deployment checklist

1. Confirm the existing Node-capable web host/back end and attach `jayluxestore.com` plus `www.jayluxestore.com`.
2. Add the exact DNS records generated by that host and configure `www` to redirect to the apex domain.
3. Set all required environment variables; keep all secrets server-only.
4. In Firebase Authentication, authorize both JayLuxe domains and retain localhost only if development needs it.
5. Confirm `.firebaserc` still targets `jayjaystyles` and deploy Firestore/Storage rules.
6. Verify `jayluxestore.com` in Resend before enabling domain sender addresses.
7. Add genuine Paystack live credentials; perform a low-value live checkout test and confirm server verification/order creation.
8. Confirm signed Cloudinary uploads from the admin dashboard across product, category and content folders.
9. Confirm `sitemap.xml`, `robots.txt`, canonical tags, password reset, order email links, admin login/logout, and checkout on the production domain.
10. Confirm `https://www.jayluxestore.com/...` permanently redirects to `https://jayluxestore.com/...` without loops.

### Customer dashboard shows `Unexpected token '<'` when loading orders

The account page requests `/api/account/orders`, which is a dynamic Node.js Route Handler. If the browser receives HTML beginning with `<!DOCTYPE` instead of JSON, the request is not reaching the Next.js runtime (commonly because the frontend was deployed as static files or the host is rewriting `/api/*` to an HTML page).

After production deployment, verify both URLs before testing order history:

```text
https://jayluxestore.com/api/health
https://jayluxestore.com/api/account/orders
```

`/api/health` must return JSON containing `"ok": true`. `/api/account/orders` without a Firebase ID token should return a JSON `401` response, not HTML. If either URL returns an HTML page, fix the hosting/runtime routing before changing Firestore or authentication code.


## Live-site runtime correction

JayLuxe is deployed as a full-stack Next.js application. On Vercel, keep all Firebase Admin and payment/email routes on the Node.js runtime and provide the server-only Firebase Admin service-account environment variables. The Firebase Admin bootstrap also remains compatible with Google Application Default Credentials when intentionally deployed on Google-managed runtimes. Do not deploy the application as a static `out` directory because the `/api/*` routes, Firebase Admin sessions, payment verification and Resend workflows require a server runtime.


## Product and category image uploads

Admin catalog/content images use the Cloudinary upload pipeline in `lib/imageUpload.ts` and `/api/upload`. The admin API verifies the session and per-folder permission before issuing a signed upload. Do not deploy new catalog media through Firebase Storage; legacy storage URLs are supported only for backwards compatibility.

Deploy Storage rules after changing them:

```bash
```

## Production email system (Resend)

JayLuxe uses the official `resend` Node.js package, which is already declared in `package.json`. All Resend initialization now lives in `lib/email/service.ts`; application routes call trusted server-side workflow functions rather than sending email from the browser.

### Required Vercel environment variables

Set these in **Vercel → Project → Settings → Environment Variables** and redeploy after changing them:

Vercel also needs valid Firebase Admin service-account variables (`FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`). The private key must be the complete PEM value from the Firebase service-account JSON; do not paste the JSON field name or an escaped/truncated key.

```env
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=

RESEND_FROM_EMAIL=JayLuxe <noreply@jayluxestore.com>
ORDER_FROM_EMAIL=JayLuxe <orders@jayluxestore.com>
CONTACT_FROM_EMAIL=JayLuxe Support <support@jayluxestore.com>
ACCOUNT_FROM_EMAIL=JayLuxe <noreply@jayluxestore.com>
ADMIN_EMAIL_FROM=JayLuxe <admin@jayluxestore.com>
BOOKING_FROM_EMAIL=JayLuxe Support <support@jayluxestore.com>
NEWSLETTER_FROM_EMAIL=JayLuxe <noreply@jayluxestore.com>

ADMIN_NOTIFICATION_EMAIL=support@jayluxestore.com
CONTACT_TO_EMAIL=support@jayluxestore.com
BOOKING_TO_EMAIL=support@jayluxestore.com
SUPPORT_EMAIL=support@jayluxestore.com

REVIEW_REQUEST_EMAILS_ENABLED=false
```

Only configure `@jayluxestore.com` sender values after the domain shows **Verified** in Resend. Do not expose any of these server secrets through `NEXT_PUBLIC_*` variables.

JayLuxe does not include recipient-redirect test mode in the production email service. Local development uses the same server-side workflow and configured recipient addresses; use a dedicated Resend development domain/account or controlled recipient addresses when manually testing.

### Resend DNS on Vercel DNS

Use the exact values displayed by **Resend → Domains → jayluxestore.com**. The current domain setup requires:

- `TXT` name `resend._domainkey` → the complete DKIM `p=...` value from Resend.
- `MX` name `send` → the exact `feedback-smtp...amazonses.com` value from Resend, priority `10`.
- `TXT` name `send` → the exact SPF value shown by Resend (normally `v=spf1 include:amazonses.com ~all`).
- DMARC is optional and can be added after SPF/DKIM verify.

Do not replace Vercel's website ALIAS/A records when adding these mail records.

### Resend webhook

Create a Resend webhook pointing to:

`https://jayluxestore.com/api/email/resend-webhook`

Subscribe at minimum to `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.failed`, `email.bounced`, and `email.complained`. Put the webhook signing secret in `RESEND_WEBHOOK_SECRET`. The route verifies the raw signed payload before changing Firestore. Delivery/bounce/complaint state is attached to `emailEvents`, and bounced/complained newsletter recipients are suppressed from marketing.

### Email event architecture

Every send goes through `sendManagedEmail()` and creates a deterministic Firestore record in `emailEvents`. The log stores the event type, intended recipient, related order/user, attempts, Resend message ID, send status, timestamps and errors. A Firestore transaction prevents simultaneous duplicate sends, while the same deterministic key is also sent to Resend as an idempotency key. Already-sent events are skipped. Failed events may be retried safely from the Admin Orders table with **Retry Email**.

Order/payment creation remains authoritative even if Resend is unavailable. Email errors are logged but do not roll back a verified payment, stock deduction or successful order.

### Implemented workflows

- Customer order confirmation after the server verifies Paystack and commits the order.
- Customer payment confirmation based only on the trusted backend Paystack verification result.
- Admin new-order notification to `support@jayluxestore.com`.
- Admin payment notification.
- Order status emails for Processing/Packed/Shipped/Out for Delivery/Delivered/Cancelled/Refunded and other supported statuses.
- Shipping email includes courier/tracking details when those fields exist on the order.
- Delivery email; optional review request is scheduled three days later when `REVIEW_REQUEST_EMAILS_ENABLED=true`.
- Firebase password-reset links delivered through Resend without account enumeration.
- Firebase email-verification and JayLuxe welcome emails after registration.
- Contact-form admin notification plus customer acknowledgement, with honeypot, duplicate detection and rate limiting.
- Newsletter welcome email with Firestore subscription state and RFC-style unsubscribe headers/endpoint.
- Booking admin notifications routed through the same centralized Resend service.
- Signed Resend webhook delivery/bounce/failure tracking.

Wishlist notifications are intentionally not enabled yet because the current wishlist is browser `localStorage`, not a server-side per-user subscription model. This avoids inventing an unreliable notification system.

### Smoke-test checklist

1. Use a Preview deployment or local development with controlled recipient addresses and a verified Resend sender domain.
2. Register a new Firebase account: verify welcome + verification emails.
3. Request a password reset from `/forgot-password`: response must remain generic and the test mailbox should receive the link.
4. Place a Paystack test order: verify order confirmation, payment confirmation, and both admin notifications; refresh/retry the request and confirm duplicates are skipped.
5. Change an order status from Admin: confirm the order state changes even if email fails; for Shipped/Delivered confirm the appropriate template.
6. Submit Contact: verify the admin message and customer acknowledgement; immediately repeat the exact message and confirm duplicate protection.
7. Subscribe to the newsletter: verify one subscription record and one welcome email; use the unsubscribe link and confirm `marketingConsent=false`.
8. Configure the Resend webhook and use Resend test events to confirm `providerStatus` updates in `emailEvents`.
9. Confirm the production domain and sender addresses are verified before live customer email testing.
10. Run `npm run lint`, `npm run typecheck --incremental false`, and `npm run build` before production deployment.

## Production UI + Cloudinary checklist (updated 2026-08-31)

JayLuxe stores new admin-managed media in Cloudinary and saves the returned HTTPS URL/public ID in the existing records.

Before testing Admin image uploads in production:

1. Confirm the Firebase project is on the Blaze plan. Cloud Storage for Firebase requires Blaze to maintain bucket access as of February 3, 2026.
2. In Firebase Console → Storage → Files, copy the exact default bucket name into `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`. The client normalizes an accidental `gs://` prefix, but the value must still belong to the same Firebase project used by the other `NEXT_PUBLIC_FIREBASE_*` settings.
3. Verify Cloudinary credentials and admin upload permissions, then sign out/in if admin claims were changed.
4. Product/category uploads remain restricted to JPG/PNG/WebP, maximum 8 MB, under `products/*` and `categories/*`.
5. The Admin upload UI reports progress, preserves the existing saved image when a replacement fails, and exposes Firebase error codes in DevTools instead of remaining indefinitely on “Uploading image…”.

Verification commands:

```bash
node scripts/verify-production-ui-storage.mjs
node scripts/verify-phase34-security.mjs
node scripts/verify-mobile-layout.mjs
node scripts/verify-admin-dashboard-refactor.mjs
npm run lint
npm run typecheck --incremental false
npm run build
```
