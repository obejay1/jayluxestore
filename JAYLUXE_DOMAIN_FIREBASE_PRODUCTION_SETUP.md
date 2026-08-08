# JayLuxe production-domain setup

Official storefront URL: **https://jayluxestore.com**

## Code changes in this package

- Production canonical/site URL falls back to `https://jayluxestore.com`.
- Vercel's `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` are recognized when an explicit site URL is absent.
- Order emails, OPay callback URLs, and administrator password-reset return URLs now use the shared site URL helper.
- The legacy root `firebase.ts` now re-exports the environment-based Firebase client instead of keeping a second hard-coded Firebase config.
- Admin login no longer fails just because a non-critical presence/audit write fails after Firebase has already created a valid session.
- `.env.production.example` documents the production variables for Vercel.

## Vercel

Attach both domains to the JayLuxe project:

- `jayluxestore.com` — primary
- `www.jayluxestore.com` — redirect to `https://jayluxestore.com`

Add the production environment variables from `.env.production.example` in **Project Settings > Environment Variables**, using real values from your private `.env.local` / provider dashboards. Redeploy after changing them.

## Firebase Authentication

In Firebase Console > Authentication > Settings > Authorized domains, add:

- `jayluxestore.com`
- `www.jayluxestore.com`
- keep `jayluxestore.vercel.app` while it remains a deployment alias

Do **not** change `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` to `jayluxestore.com` just because the storefront domain changed. Keep the Firebase-provided auth domain (for this project, normally `jayjaystyles.firebaseapp.com`) unless you separately configure a Firebase Hosting custom auth redirect domain.

## Firebase Admin on Vercel

Local `gcloud auth application-default login` credentials are not available inside Vercel. Set these server-only variables in Vercel:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

Do not prefix server secrets with `NEXT_PUBLIC_`.

## Email / Resend

Verify `jayluxestore.com` in Resend before using senders such as `hello@jayluxestore.com`, `orders@jayluxestore.com`, or `admin@jayluxestore.com`. Add exactly the DNS records Resend provides.

## Payments and SMS

- Paystack secret key stays server-only. Configure the exact production webhook/callback routes used by this code under `https://jayluxestore.com`.
- OPay return URL and webhook are generated from the production site URL. Keep OPay disabled until merchant credentials and callbacks are verified.
- Termii keys remain server-only; changing the website domain does not change the Termii API base URL.

## Before production

Run locally with a real `.env.local`:

```powershell
npm install
npm run lint
npx tsc --noEmit
npm run build
```

To validate production env variables in a shell where they are loaded:

```powershell
npm run verify:production-env
```
