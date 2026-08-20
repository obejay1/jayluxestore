# JayLuxe Branded Password Reset Design

## Goal
Keep Firebase Authentication and Resend, but replace the Firebase-hosted URL inside customer password-reset emails with a JayLuxe-domain reset URL.

## Architecture
The server continues using Firebase Admin `generatePasswordResetLink()` to create a genuine Firebase action code. JayLuxe extracts only the `oobCode` from that server-generated link and builds `https://jayluxestore.com/reset-password?oobCode=...`. The new client reset page uses Firebase Authentication `verifyPasswordResetCode()` and `confirmPasswordReset()` with that code.

## Security
- Firebase remains the authority for reset-code creation, validation, expiry, and password update.
- The password is held only in transient React state and is never stored in localStorage, sessionStorage, cookies, Firestore, or a URL.
- Reset codes are not logged.
- Customer-facing errors do not expose Firebase internals.
- Existing rate limiting and account-enumeration-safe forgot-password responses remain unchanged.

## Scope
- Add a shared helper to convert Firebase-generated reset links to the JayLuxe reset route.
- Update the customer password-reset email workflow to use the branded reset URL.
- Add `/reset-password` UI for code verification and password confirmation.
- Add no-index metadata for the reset route.
- Preserve Resend, Firebase Auth, login, registration, checkout, and all unrelated functionality.

## Outbound email link alignment
Outbound JayLuxe emails use `https://jayluxestore.com` for site links and assets even when generated from local development, so Resend does not see localhost/Firebase-hosted links that conflict with the verified sending domain.
