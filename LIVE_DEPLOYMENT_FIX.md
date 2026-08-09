# JayLuxe live deployment fix

## Confirmed symptom

Local `npm run dev` works, while the live site returns HTML for dynamic `/api/*`
requests and/or Firebase Admin reports `invalid_grant`. The application contains
Node.js Route Handlers, Firebase Admin, server session cookies, Resend and payment
verification, so it must run on a Node-capable production runtime.

## Recommended production target

Keep the existing Firebase project: `jayjaystyles`.

Use **Firebase App Hosting** for the Next.js web application. Do not deploy the
web application as a bare static `out/` directory. `firebase.json` should remain
focused on Firestore/Storage rules; App Hosting is configured from the Firebase
console/backend rather than with a `hosting.public = out` block.

## Firebase App Hosting setup

1. Firebase Console -> `jayjaystyles` -> Hosting & Serverless -> App Hosting.
2. Create a backend in the existing project and connect `obejay1/jayluxestore`.
3. Select the production branch that contains the current JayLuxe code.
4. If the repository root is the Next.js app root, leave root directory as `/`.
5. Add the production environment variables from `.env.example` in the App
   Hosting backend Environment Variables screen.
6. On App Hosting, do **not** require a downloaded service-account private key.
   The patched `lib/firebaseAdmin.ts` automatically uses Application Default
   Credentials on Google-managed runtimes.
7. Remove stale production values for `FIREBASE_ADMIN_CLIENT_EMAIL` and
   `FIREBASE_ADMIN_PRIVATE_KEY` from the App Hosting backend unless you have a
   deliberate cross-project setup. JayLuxe uses the same Firebase project, so
   ADC is the preferred production credential.
8. Keep `NEXT_PUBLIC_FIREBASE_PROJECT_ID=jayjaystyles` and the real browser SDK
   values from Firebase Project Settings -> Your apps -> Web app.
9. Set `NEXT_PUBLIC_APP_URL=https://jayluxestore.com` and
   `NEXT_PUBLIC_SITE_URL=https://jayluxestore.com`.
10. Add the real Paystack, Resend, Cloudinary and other server-side variables in
    the backend. Never commit their secrets.

## Firebase Authentication

In Firebase Console -> Authentication -> Settings -> Authorized domains, ensure:

- `jayluxestore.com`
- `www.jayluxestore.com`
- localhost only if it is still required for development

## Custom domain migration

In the App Hosting backend -> Settings -> Add custom domain:

1. Add `jayluxestore.com`.
2. Use Firebase's **Migrate a domain** flow if the domain is already serving the
   old deployment.
3. Copy only the exact DNS records Firebase shows for this backend.
4. Add `www.jayluxestore.com` and configure it to redirect to
   `jayluxestore.com`.
5. Do not leave conflicting old A/CNAME records after Firebase instructs you to
   remove them.

## Production verification

After the App Hosting rollout is green and the custom domain points to it:

- `https://jayluxestore.com/api/health` must return JSON containing `"ok": true`.
- `https://jayluxestore.com/api/account/orders` without a customer token should
  return a JSON `401`, not an HTML page.
- Customer login -> Order History should load without `Unexpected token '<'`.
- Admin login should create `/api/admin/session` successfully and set the secure
  HttpOnly session cookie.
- Newsletter submission should return JSON, even if Resend configuration later
  reports a provider-specific error.

If `/api/health` returns HTML, the custom domain is still pointing at the old
static deployment or another frontend-only host.
