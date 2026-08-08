# JayLuxe Admin & Staff Management System

Implementation date: 2026-08-05

## Delivered

The JayLuxe administration area now uses individual Firebase Authentication email/password accounts instead of a shared administrator password. Passwords remain exclusively in Firebase Authentication and are never written to Firestore, environment files, logs, or activity records.

### Administrator account management

- New Super Admin-only page: `/admin/users`
- Create Firebase Authentication users with a unique email and temporary password
- Firestore profiles in `adminUsers/{uid}`
- Roles: Super Admin, Admin, Staff
- Statuses: Active, Inactive, Suspended, Disabled
- View, edit, reset password, disable, enable, and delete actions
- Last login, last logout, recent online presence, and total login count
- Protection against deleting, disabling, or demoting the current Super Admin
- Protection against removing the final active Super Admin
- Seven dashboard widgets for total, active, online, disabled, Super Admin, Admin, and Staff counts

### Authentication and authorization

- Firebase Email/Password sign-in at `/admin/login`
- Firebase browser-local persistence
- Firebase Admin session cookie stored as secure HttpOnly cookie
- Session-cookie revocation checks on protected server requests
- Current Firestore profile status and permissions checked server-side
- Role and permission checks on protected pages and API routes
- Firestore rules verify the active `adminUsers` profile and assigned permissions
- State-changing administrator APIs validate the request origin
- Disabled accounts are signed out and shown the required disabled-account message

### Activity log

- New page: `/admin/activity`
- Firestore collection: `adminActivity`
- Records user name, email, role, action, description, timestamp, target, IP when available, and browser/user-agent when available
- Search, user, role, action, date, and pagination controls
- Server-generated audit records for login, logout, user creation/update/status/delete/password reset
- Existing dashboard actions log products, categories, bridal packages, orders, bookings, promotions, testimonials, gallery/content, and settings changes
- The activity page searches and paginates the latest 1,000 audit records; all audit records remain stored in Firestore unless removed by an external retention policy

### Existing application preservation

- Existing storefront routes remain intact
- Product, category, order, booking, report, promotion, testimonial, checkout, Paystack, OPay, Termii, newsletter, contact, wishlist, and cart logic remain present
- Bridal booking creation now uses the existing server API so stricter Firestore rules do not block customer booking submissions
- Existing privileged upload, order-status SMS, and order-update APIs now require administrator session permissions

## Main new files

```text
app/admin/(protected)/layout.tsx
app/admin/(protected)/users/page.tsx
app/admin/(protected)/activity/page.tsx
app/admin/access-denied/page.tsx
app/admin/admin-management.css
app/api/admin/me/route.ts
app/api/admin/presence/route.ts
app/api/admin/activity/route.ts
app/api/admin/users/route.ts
app/api/admin/users/[uid]/route.ts
app/api/admin/users/[uid]/reset-password/route.ts
components/admin/AdminPageFrame.tsx
components/admin/AdminUsersClient.tsx
components/admin/AdminActivityClient.tsx
lib/adminTypes.ts
lib/adminPermissions.ts
lib/adminServerAuth.ts
lib/adminRequest.ts
lib/adminAudit.ts
lib/adminActivityClient.ts
scripts/bootstrap-super-admin.mjs
```

The former dashboard and reports pages were moved into the protected route group without changing their public URLs:

```text
/admin
/admin/reports
```

## Firestore collections

### `adminUsers/{uid}`

Stores profile and access metadata, never passwords:

```text
fullName
email
emailLower
phoneNumber
role
status
permissions
online
loginCount
lastLoginAt
lastLogoutAt
lastSeenAt
createdAt
updatedAt
createdBy
updatedBy
```

### `adminActivity/{activityId}`

Stores audit metadata:

```text
actorUid
userName
email
role
action
description
targetType
targetId
ipAddress
browser
metadata
createdAt
```

## First-time setup

1. Extract the complete project.
2. Do not copy an old `node_modules` folder into the project.
3. Create the private local environment file:

```powershell
Copy-Item .env.example .env.local
```

4. Fill the Firebase browser variables and one Firebase Admin credential method in `.env.local`.
5. Install dependencies cleanly:

```powershell
npm install
```

6. Create or upgrade the first Super Admin:

```powershell
npm run admin:bootstrap
```

The script prompts locally for the full name, unique email address, temporary password, and optional E.164 phone number. It does not print or store the password in Firestore.

7. Deploy the new Firestore rules:

```powershell
npx firebase-tools deploy --only firestore:rules
```

8. Start the app and sign in:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

Open `/admin/login`.

## Password-reset email configuration

The Reset Password action generates a Firebase password-reset link on the server and sends it through Resend. Configure:

```env
RESEND_API_KEY=re_your_real_key
ADMIN_EMAIL_FROM=JayLuxe Administration <admin@jayluxestore.com>
NEXT_PUBLIC_APP_URL=https://jayluxestore.com
```

The sender domain must be verified in Resend. The API returns a configuration error instead of reporting false success when Resend is missing.

## Default permissions

- **Super Admin:** all permissions, including users and activity
- **Admin:** dashboard, products, categories, orders, bookings, reports, promotions, testimonials, customers, content, settings, and activity
- **Staff:** dashboard, orders, bookings, and reports

A Super Admin can customize non-Super-Admin permissions from the user editor.

## Validation performed

Passed in the provided project source:

```text
TypeScript: node node_modules/typescript/bin/tsc --noEmit --incremental false
Result: passed with zero errors

ESLint: node node_modules/next/dist/bin/next lint
Result: passed with zero warnings and zero errors

Bootstrap script syntax: node --check scripts/bootstrap-super-admin.mjs
Result: passed

package.json and package-lock.json parsing
Result: passed
```

## Production-build verification status

A production build was attempted with:

```text
node node_modules/next/dist/bin/next build
```

The build environment contained a Windows `node_modules` tree, while the validation container is Linux. Next.js stopped before application compilation because the Linux SWC optional binary was not installed:

```text
Attempted to load @next/swc-linux-x64-gnu, but it was not installed
Attempted to load @next/swc-linux-x64-musl, but it was not installed
Failed to load SWC binary for linux/x64
```

The lockfile includes the Windows, Linux, and macOS Next.js SWC optional packages. The final ZIP excludes `node_modules`; a clean `npm install` on Windows or Vercel will select the correct platform package. The sandbox could not download the missing Linux binary because external npm DNS/package access was unavailable, so a successful `next build` is not claimed in this report.

Run the final production verification after a clean dependency install:

```powershell
Remove-Item -Recurse -Force node_modules,.next -ErrorAction SilentlyContinue
npm install
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

## Security notes

- Keep `.env.local` and Firebase service-account credentials out of GitHub.
- Deploy `firestore.rules` before enabling staff access.
- Use a verified Resend sender domain for password-reset messages.
- Create every staff account with a unique email address.
- Do not restore the retired shared administrator PIN variables.
- Existing Firebase custom claims are preserved when administrator claims are updated.
