# JayLuxe Admin Compact Dashboard and Image Upload Design

## Goal

Refine the existing JayLuxe administration experience into a compact, horizontally navigated, premium e-commerce dashboard while preserving Firebase authentication, role/permission checks, Firestore data, order/product/category workflows, reporting, bookings, settings, invoices, and all existing APIs. Repair the catalog image upload path so it cannot remain stuck indefinitely in an "Uploading image…" state.

## Architecture

The implementation will extend the existing admin UI instead of creating a new shell. The main `/admin` page will retain its anchored single-page management sections and permission checks, but the vertical sidebar will become a compact horizontal navigation rail. Dedicated admin pages that already use `AdminPageFrame` keep that architecture; their shared `admin-management.css` typography and spacing will be tightened so Users, Activity, Reports and related pages match the main dashboard.

The image pipeline remains Firebase Storage. `lib/catalogImages.ts` will continue writing into the existing `products/` and `categories/` paths, but will use `uploadBytesResumable()` with progress reporting, a finite timeout/cancel path, validation aligned with `storage.rules`, bucket configuration checks, durable `getDownloadURL()` retrieval, and readable Firebase Storage error mapping. The existing product/category Firestore save flow remains unchanged and continues storing the returned HTTPS URL in the existing `image` field.

## Main Admin Navigation

- Replace the main page's vertical `.sidebar` presentation with a horizontal admin navigation shell.
- Preserve the exact permission-controlled destinations and existing in-page anchors/routes.
- Desktop/laptop: one compact horizontal bar with brand, scroll-safe navigation, and logout action.
- Mobile/tablet: the navigation rail remains one horizontally scrollable row using `overflow-x: auto` and `white-space: nowrap`; it does not become a tall stacked menu.
- Icons remain aligned with labels and use the current Lucide icon set.
- Dedicated admin pages retain `AdminPageFrame` and its `.amu-nav`; its sizing is refined to match the main navigation.

## Primary Metrics

The primary financial metrics become a three-column grid:

1. Total Revenue — existing `revenue` calculation.
2. Total Orders — existing `orders.length`.
3. Average Order Value — `orders.length > 0 ? revenue / orders.length : 0`.

Products and Customers remain visible as compact secondary operational metrics so no existing information is removed.

## Admin and Staff Overview

For super administrators, the section becomes a three-card grid:

1. Admin Overview — current super-admin + admin counts.
2. Staff Overview — current staff/disabled counts.
3. Manage Users — an actionable card linking to `/admin/users`.

Wide screens use three equal columns; medium layouts use two columns; narrow screens use one column only when needed. Card heights, padding and typography are consistent.

## Admin Typography and Density

Only admin-scoped CSS is changed. Customer-facing typography is untouched.

Target scale:

- Main page titles: 20–24px.
- Section headings: 15–18px.
- Card titles: 13–15px.
- Important figures: 18–24px.
- Supporting text: 11–13px.
- Metadata/labels: 10–12px.
- Navigation/buttons/table text: 11–13px.

The main dashboard, Products, Categories, Orders, Bookings, Reports, Promotions, Testimonials, Settings, Users/Admin management, forms, modals, tables, alerts and pagination inherit the same compact rhythm through `admin-dashboard-redesign.css` and `admin-management.css`.

## Image Upload Pipeline

The catalog upload path becomes:

Select file → validate MIME/size → verify Firebase Storage bucket config → create existing catalog path → `uploadBytesResumable()` → report progress → timeout/cancel if stalled → `getDownloadURL()` → update existing product/category form `image` field → preview → normal Firestore save.

Requirements:

- Allowed types remain JPEG, PNG and WebP.
- Maximum size is 8 MB and client/rules use the same boundary.
- Upload progress is surfaced in the product/category UI.
- A stalled upload is cancelled after a finite timeout instead of leaving the UI permanently busy.
- `try/catch/finally` on the admin form always clears the busy state.
- Firebase Storage errors are mapped to useful administrator messages.
- No new storage/database system is introduced.

## Invoice

The current invoice source contains no Dashboard link or Dashboard section and `SiteChrome` already suppresses global navigation on `/invoice`. No unnecessary invoice rewrite will be made. Regression verification will ensure no customer invoice source introduces a Dashboard UI element.

## Responsive Behavior

- Desktop/laptop: compact horizontal admin navigation, three-column primary KPI grid, three-column Admin/Staff/Manage Users layout.
- Tablet: horizontal nav remains scroll-safe; KPI cards remain balanced; team grid may become two columns.
- Phones: nav is horizontally scrollable; KPI cards use a compact three-column treatment where practical and collapse only if readability requires; team cards stack without gaps; tables retain controlled internal horizontal scrolling.
- No page-level horizontal overflow, oversized cards, arbitrary negative margins, or fixed-height hacks.

## Data and Security Preservation

No changes to:

- Firebase Authentication architecture.
- Server admin session architecture.
- Admin/staff permission model.
- Firestore collection/data structure.
- Product/category CRUD semantics.
- Orders, bookings, reports, promotions, testimonials, settings or payment logic.
- Existing product/category image field names.

Storage rules remain permission-based through existing Firebase custom claims.

## Verification

Add a lightweight source regression verifier because the project has no existing test suite. It will verify:

- horizontal main admin nav markup/classes exist and vertical sidebar markup is removed from `/admin`;
- primary KPI grid contains Revenue, Orders and Average Order Value;
- Admin/Staff/Manage Users cards exist;
- admin typography/navigation responsive rules exist;
- `uploadBytesResumable`, progress, timeout/cancel and `getDownloadURL` are present;
- Storage rule and client size limits agree;
- invoice source contains no customer-facing Dashboard control.

Then run source syntax checks, ESLint/TypeScript/production build when dependencies are available, and ZIP integrity validation before delivery.
