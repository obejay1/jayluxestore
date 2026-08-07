# JayLuxe E-commerce Website

JayLuxe is a responsive luxury e-commerce application built with Next.js 14, React 18, TypeScript, Firebase, Firestore, Paystack, Resend, Cloudinary, and optional Termii messaging.

## Requirements

- Node.js 22 or later
- npm
- A Firebase project with Email/Password Authentication and Firestore enabled
- Firebase Admin service-account credentials for server routes
- Paystack keys for checkout

Optional services include Resend, Cloudinary, Termii, and OPay.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Never commit `.env.local`, Firebase service-account JSON files, or anything inside `secrets/`.

## Firebase

1. Create or select a Firebase project.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create a Firestore database.
4. Add the browser Firebase values to `.env.local`.
5. Store the Firebase Admin service-account JSON at `secrets/firebase-service-account.json`, or configure equivalent server credentials.
6. Deploy the included Firestore rules:

```bash
firebase deploy --only firestore:rules
```

Customer passwords are handled by Firebase Authentication and are never stored in localStorage or Firestore.

## Admin and staff access

JayLuxe uses unique Firebase Email/Password accounts for every administrator and staff member. Passwords remain in Firebase Authentication and are never saved in Firestore or environment variables.

After Firebase Admin credentials are configured, create the first Super Admin from the project root:

```bash
npm run admin:bootstrap
```

The script asks locally for the Super Admin's name, email, temporary password, and optional E.164 phone number. It creates or upgrades the Firebase Authentication user, assigns the `super_admin` custom claim, and creates the matching `adminUsers/{uid}` Firestore profile.

Then visit `/admin/login`. The Super Admin can manage staff at `/admin/users` and review the audit trail at `/admin/activity`.

Default access:

- **Super Admin:** all administration areas, staff management, and activity logs.
- **Admin:** products, categories, orders, bookings, reports, promotions, testimonials, customers, content, settings, and activity.
- **Staff:** dashboard, orders, bookings, and reports. A Super Admin can assign additional permissions.

The browser signs in with Firebase Authentication and exchanges a recently issued Firebase ID token for an 8-hour, signed, HttpOnly session cookie. Protected pages and API routes verify the session and account status on the server. Firestore rules independently enforce the Firebase custom claims for direct client SDK operations.

Password-reset email from `/admin/users` uses:

```env
RESEND_API_KEY=
ADMIN_EMAIL_FROM="JayLuxe Administration <admin@your-verified-domain.com>"
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

`ADMIN_EMAIL_FROM` must use a sender/domain that is allowed by your Resend account. Do not store any administrator password in `.env.local`.

## Paystack checkout

Set both Paystack values:

```env
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=
```

The browser opens Paystack, but the server independently verifies the transaction reference, amount, currency, customer email, products, stock, tax, shipping, coupon, and payment-reference reuse before creating an order.

## Contact and order email

Configure Resend with:

```env
RESEND_API_KEY=
CONTACT_TO_EMAIL=
CONTACT_FROM_EMAIL=
ORDER_FROM_EMAIL=
```

A verified sending domain is required for production delivery to arbitrary recipients.

## Optional integrations

Cloudinary admin uploads require Cloudinary credentials and an authenticated admin session.

Termii order SMS can be configured with the `TERMII_*` variables. OTP endpoints remain disabled unless `TERMII_OTP_ENABLED=true`.

OPay remains disabled unless both `NEXT_PUBLIC_OPAY_ENABLED=true` and `OPAY_ENABLED=true`. Keep it disabled until the merchant callback and webhook verification flow is configured and tested for the production merchant account.

## Validation

```bash
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

## Deployment

Add all required environment variables in the hosting provider’s server settings. Keep server secrets server-only, deploy Firestore rules, and use a Node.js 22 runtime.

## Phase 3 platform features

The customer-facing site now includes route-level loading, error, and not-found experiences; accessible modal focus management; route-aware customer navigation; a responsive cart; working legal/support pages; collection redirects; and SEO metadata, sitemap, robots, and web-app manifest files.

Available support and collection routes include:

- `/faq`
- `/privacy`
- `/terms`
- `/search?q=...`
- `/flash-sale`
- `/featured-products`
- `/new-arrivals`
- `/best-sellers`
- `/beauty-services`

Search and collection routes redirect into the Shop page while preserving the requested query or collection filter.

## Newsletter and bookings

Newsletter subscriptions are validated and saved server-side in the `newsletterSubscribers` Firestore collection through `/api/newsletter`.

Service and bridal requests are validated and saved server-side in the `bookings` collection through `/api/bookings`. Admin users can read and manage those bookings in the dashboard. Optional booking notification email uses:

```env
BOOKING_TO_EMAIL=
BOOKING_FROM_EMAIL="JayLuxe Bookings <bookings@your-verified-domain.com>"
```

The public browser does not write directly to either collection. Deploy the included Firestore rules after deployment changes.

## Analytics

Google Analytics is loaded only when this public measurement ID is configured:

```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

No analytics script is added when the value is empty.
