# JayLuxe Production Fix Package

Changes applied:
- Pinned firebase-admin to 12.7.0 for Next.js 14/Vercel compatibility.
- Added jose override 5.9.6 to avoid jwks-rsa CommonJS/ESM conflict.
- Added Node.js runtime declarations to Firebase Admin API routes where missing.
- Preserved existing authentication, order API, admin API, and Resend architecture.

Note:
- Install dependencies locally/Vercel after replacing the project:
  npm install
- Verify Vercel environment variables before deployment.
- Existing Firebase Admin lazy initialization was preserved.
