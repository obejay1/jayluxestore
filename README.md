# JayLuxe E-commerce Website

JayLuxe is a responsive luxury e-commerce application built with Next.js 14, React 18, TypeScript, Firebase Authentication/Firestore/Storage, Firebase Admin, Paystack, Resend, Cloudinary, and optional Termii/OPay integrations.

**Canonical production URL:** `https://jayluxestore.com`

`https://www.jayluxestore.com` is supported as an alternate hostname and is redirected permanently by `next.config.js` to the apex canonical domain. The hosting/DNS layer must also enforce HTTPS.

## Requirements

- Node.js 22 or later
- npm
- Firebase project `jayjaystyles` with Email/Password Authentication, Firestore, and Storage enabled
- Firebase Admin credentials or Application Default Credentials for server routes
- Paystack credentials for checkout
- Optional: Resend, Cloudinary, Termii, OPay, and Google Analytics

## Local setup

```bash
npm install
cp .env.example .env.local
```

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
6. Confirm Firebase Storage is enabled if the existing bridal/testimonial/transformation upload features are used.
7. Configure the browser Firebase values from this same Firebase web app using the `NEXT_PUBLIC_FIREBASE_*` variables.
8. Configure Firebase Admin with server-only `FIREBASE_ADMIN_*` values or Application Default Credentials.
9. Deploy the checked-in Firestore and Storage rules after reviewing them:

```bash
firebase deploy --only firestore:rules,storage
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

NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=

RESEND_API_KEY=
RESEND_FROM_EMAIL=
ADMIN_EMAIL_FROM=
CONTACT_FROM_EMAIL=
ORDER_FROM_EMAIL=
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
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=
```

Do not commit live keys. The current popup checkout remains unchanged. The order API independently reloads product/stock/pricing data and verifies the Paystack transaction on the server, including reference, successful status, `NGN` currency, amount, customer email, and payment-reference reuse before creating the order and decrementing stock.

No Paystack webhook endpoint is currently implemented in this codebase. Do not enter an invented webhook URL in Paystack. If a webhook is later added, it must verify Paystack's `x-paystack-signature` before processing events and preserve the existing duplicate-payment protections.

## Cloudinary and Firebase Storage

The existing architecture is preserved:

- Cloudinary server uploads keep the API secret server-side.
- Firebase Storage remains available for the existing bridal/testimonial/transformation media flows.
- Next.js image configuration continues allowing Cloudinary, Firebase Storage, Google Storage, and Unsplash sources used by the application.

## Analytics

Google Analytics is loaded only when `NEXT_PUBLIC_GA_ID` is configured. Do not invent a measurement ID.

## Admin and staff bootstrap

After Firebase Admin credentials are configured, create or upgrade the first Super Admin from the project root:

```bash
npm run admin:bootstrap
```

Then sign in at `/admin/login`. Passwords remain in Firebase Authentication; they are not stored in Firestore or environment variables.

## Validation before deployment

Run:

```bash
npm install
npm run lint
npx tsc --noEmit --incremental false
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
8. Confirm Cloudinary/Firebase Storage uploads from the admin dashboard.
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


## Live-site runtime correction (2026-08-08)

If local authentication/order APIs work but the custom domain returns HTML for
`/api/*`, use the App Hosting procedure in `LIVE_DEPLOYMENT_FIX.md`. The included
Firebase Admin bootstrap now prefers Google Application Default Credentials when
running on Firebase App Hosting/Cloud Run, while preserving explicit
service-account credentials for local development and non-Google hosts.
