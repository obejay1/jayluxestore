# JayLuxe Branded Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send password-reset emails with a `jayluxestore.com/reset-password` URL while Firebase continues to securely create and validate reset action codes.

**Architecture:** Firebase Admin generates the reset action link server-side. A small server helper extracts the Firebase `oobCode` and creates the branded JayLuxe URL; the client reset page verifies and consumes that code with the Firebase Auth SDK.

**Tech Stack:** Next.js 14 App Router, React 18, Firebase Auth/Admin, Resend.

**Spec:** `docs/superpowers/specs/2026-08-20-branded-password-reset-design.md`

## Global Constraints
- Do not replace Firebase Authentication.
- Do not replace Resend.
- Do not persist passwords.
- Do not expose reset codes or credentials in logs.
- Preserve existing forgot-password anti-enumeration behavior and rate limiting.

---

### Task 1: Regression guard

**Files:**
- Create: `scripts/verify-branded-password-reset.mjs`

**Interfaces:**
- Consumes: current password-reset workflow and route sources.
- Produces: a deterministic source-level regression check for branded reset URL generation and Firebase client reset handling.

- [ ] Write assertions requiring a JayLuxe reset-link helper, `/reset-password` page, Firebase code verification, password confirmation, and no password persistence.
- [ ] Run `node scripts/verify-branded-password-reset.mjs` and confirm it fails against the current project.

### Task 2: Branded reset-link generation

**Files:**
- Create: `lib/passwordReset.ts`
- Modify: `lib/email/workflows.ts`
- Modify: `lib/email/templates.ts`

**Interfaces:**
- Consumes: Firebase Admin generated reset URLs and `getSiteUrlString()`.
- Produces: `buildBrandedPasswordResetLink(firebaseResetLink: string): string`.

- [ ] Extract `oobCode` from the Firebase-generated link without logging it.
- [ ] Build `${getSiteUrlString()}/reset-password?oobCode=<encoded code>`.
- [ ] Use the branded URL in the customer reset email template.
- [ ] Use the production JayLuxe URL for outbound email shell links/assets so local development emails do not contain localhost links.

### Task 3: JayLuxe reset-password page

**Files:**
- Create: `app/reset-password/page.tsx`
- Create: `app/reset-password/layout.tsx`

**Interfaces:**
- Consumes: `oobCode` URL parameter and Firebase client `auth`.
- Produces: secure password reset completion using `verifyPasswordResetCode()` and `confirmPasswordReset()`.

- [ ] Read the `oobCode` after mount.
- [ ] Verify the code with Firebase before enabling password submission.
- [ ] Require matching passwords with a minimum of 6 characters.
- [ ] Confirm reset through Firebase, clear password state, and show a safe success state with a login link.
- [ ] Keep password values only in transient component state.

### Task 4: Verification

**Files:**
- Test: `scripts/verify-branded-password-reset.mjs`

**Interfaces:**
- Consumes: final project tree.
- Produces: verification evidence.

- [ ] Run the new regression guard and require PASS.
- [ ] Run all existing `scripts/verify-*.mjs` checks and record results.
- [ ] Run available TypeScript/build checks if dependencies are installed; otherwise report the environment limitation.
- [ ] Package the verified project ZIP.
