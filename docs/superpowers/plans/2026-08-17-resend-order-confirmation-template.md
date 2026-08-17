# Resend Order Confirmation Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send JayLuxe customer order confirmations through a published Resend hosted template when configured, while preserving the existing HTML email as a no-config fallback.

**Architecture:** Keep `sendManagedEmail` as the only Resend transport boundary. Add optional template metadata to the managed email input, have the service choose exactly one Resend content mode (template or HTML/text), and change only `sendOrderCreatedEmails` to provide the order-confirmation template variables when `RESEND_ORDER_CONFIRMATION_TEMPLATE_ID` is configured.

**Tech Stack:** Next.js 14, TypeScript, Resend Node SDK 6.x, Firebase Admin/Firestore.

## Global Constraints
- Do not change checkout, payment, Firestore order creation, authentication, or any non-order-confirmation email workflow.
- Do not send `template` together with `html`, `text`, or `react` in the Resend API payload.
- Preserve current recipient validation and Firestore idempotency behavior.
- Preserve the existing HTML order-confirmation email as fallback when `RESEND_ORDER_CONFIRMATION_TEMPLATE_ID` is not configured.
- Template variable names are exactly `CUSTOMER_NAME`, `ORDER_NUMBER`, `ORDER_DATE`, `ORDER_TOTAL`, `DELIVERY_ADDRESS`, and `ORDER_URL`.

---

### Task 1: Add regression coverage

**Files:**
- Create: `scripts/verify-resend-order-template.mjs`

**Interfaces:**
- Consumes: source files `lib/email/config.ts`, `lib/email/service.ts`, `lib/email/workflows.ts`.
- Produces: a dependency-free Node verification command that exits non-zero until the template integration exists.

- [ ] **Step 1: Write a source-level regression test** that requires the optional config key, service template branch, six variable names, and HTML fallback.
- [ ] **Step 2: Run `node scripts/verify-resend-order-template.mjs`** and verify it fails because the integration does not yet exist.

### Task 2: Add optional template configuration

**Files:**
- Modify: `lib/email/config.ts`

**Interfaces:**
- Produces: `getEmailConfig().orderConfirmationTemplateId: string`, empty when not configured.

- [ ] **Step 1: Add `orderConfirmationTemplateId: process.env.RESEND_ORDER_CONFIRMATION_TEMPLATE_ID?.trim() || ''`** to the returned config object.
- [ ] **Step 2: Re-run the regression test** and confirm it still fails on the remaining service/workflow requirements.

### Task 3: Support hosted templates in the central sender

**Files:**
- Modify: `lib/email/service.ts`

**Interfaces:**
- Consumes: optional `template` object `{ id: string; variables: Record<string, string | number> }`.
- Produces: one Resend send request that uses either `template` or `html`/`text`, never both.

- [ ] **Step 1: Make `html` optional and add optional `template` metadata** to `ManagedEmailInput`.
- [ ] **Step 2: Before sending, fail clearly if neither a template ID nor HTML content is available.**
- [ ] **Step 3: Build a shared base payload** for `from`, `to`, `subject`, `replyTo`, `scheduledAt`, and `headers`.
- [ ] **Step 4: Branch the Resend request:** template mode passes `template` only; fallback mode passes `html` and optional `text`.
- [ ] **Step 5: Store `templateId` and `deliveryMode` in the email event result metadata for diagnostics.**
- [ ] **Step 6: Re-run the regression test.**

### Task 4: Use the template only for customer order confirmation

**Files:**
- Modify: `lib/email/workflows.ts`

**Interfaces:**
- Consumes: `getEmailConfig().orderConfirmationTemplateId` and existing `Order` fields.
- Produces: `template: { id, variables } | undefined` passed only to the customer order-confirmation call.

- [ ] **Step 1: Add local formatting helpers** for Nigerian currency/date and order URL/address values needed by the six template variables.
- [ ] **Step 2: In `sendOrderCreatedEmails`, keep generating `orderConfirmationTemplate(order)` for HTML fallback.**
- [ ] **Step 3: If `orderConfirmationTemplateId` is non-empty, add the six required variables to the customer confirmation `sendManagedEmail` call.**
- [ ] **Step 4: Leave the admin new-order send and all other workflows unchanged.**
- [ ] **Step 5: Run the regression test and verify PASS.**

### Task 5: Full verification and packaging

**Files:**
- Verify all source and scripts.

**Interfaces:**
- Produces: verified source ZIP ready for the user to deploy after publishing the Resend template and setting the environment variable.

- [ ] **Step 1: Run every `scripts/verify-*.mjs` script.**
- [ ] **Step 2: Run TypeScript compiler parsing/check attempt and report dependency-related limitations honestly.**
- [ ] **Step 3: Compare against the V8 base and verify only `lib/email/config.ts`, `lib/email/service.ts`, and `lib/email/workflows.ts` changed in application code.**
- [ ] **Step 4: Create ZIP and run `unzip -t` integrity check.**
