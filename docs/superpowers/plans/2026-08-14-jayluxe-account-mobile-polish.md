# JayLuxe Account Mobile Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the signed-in JayLuxe Account page more compact and continuous on mobile while preserving all account functionality.

**Architecture:** Keep `app/account/page.tsx` as the existing account UI and data owner. Put responsive density rules in the final-authority `app/jayluxe-card-system.css`, and add only a Lucide refresh icon/accessibility label to the existing refresh button.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Lucide React, existing global CSS architecture.

## Global Constraints
- Do not change Firebase authentication, order API calls, wishlist/cart counts, logout, invoice export, or order data mapping.
- Preserve the 2-column mobile account overview at normal phone widths and 1-column fallback below 300px.
- Keep desktop behavior stable.
- Avoid negative margins and fixed section heights.

---

### Task 1: Add Account mobile regression verification

**Files:**
- Create: `scripts/verify-account-mobile-polish.mjs`
- Test: `scripts/verify-account-mobile-polish.mjs`

**Interfaces:**
- Consumes: `app/account/page.tsx`, `app/jayluxe-card-system.css`
- Produces: a source-level regression check for the approved mobile Account contract.

- [ ] **Step 1: Write the failing verifier**

Create assertions that require `RefreshCw`, `aria-label="Refresh order history"`, the short text `Refresh`, and final-authority mobile rules for `.jl-account-overview`, `.jl-account-profile-bar`, `.jl-account-profile-bar button`, `.jl-order-history`, `.jl-order-history-header`, `.jl-order-history-header h2`, and `.jl-order-history-header button`.

- [ ] **Step 2: Run verifier to confirm RED**

Run: `node scripts/verify-account-mobile-polish.mjs`
Expected: FAIL because the refresh icon/label and dedicated account mobile authority block are absent.

- [ ] **Step 3: Proceed to Tasks 2–3 only after expected failure is observed**

---

### Task 2: Upgrade the existing refresh action

**Files:**
- Modify: `app/account/page.tsx`

**Interfaces:**
- Consumes: existing `ordersLoading` state and `loadCustomerOrders(email)` callback.
- Produces: the same refresh behavior with `RefreshCw`, `aria-label="Refresh order history"`, and visible label `Refresh`.

- [ ] **Step 1: Import `RefreshCw` from `lucide-react`**
- [ ] **Step 2: Add the accessibility label and decorative icon to the existing button**
- [ ] **Step 3: Preserve existing click handler and disabled state exactly**

---

### Task 3: Add final-authority Account mobile density rules

**Files:**
- Modify: `app/jayluxe-card-system.css`

**Interfaces:**
- Consumes: existing Account class names.
- Produces: <=700px compact mobile layout, <=420px narrow-phone alignment, existing <=299px one-column fallback remains valid.

- [ ] **Step 1: Add <=700px account-specific rules**

Required behavior: overview cards 72px min-height with 11px padding; profile/content separation about 12px; profile padding 12px 13px and 12px bottom margin; Sign Out min-height 36px; order history top/bottom margins removed inside account content; Order History title 24px; Refresh min-height 35px with outlined gold/neutral styling.

- [ ] **Step 2: Add <=420px header rule**

Keep `.jl-order-history-header` in a compact row, allow the title block to shrink, and prevent the refresh button from stretching full width.

- [ ] **Step 3: Keep existing <=299px overview fallback unchanged**

---

### Task 4: Verify and package

**Files:**
- Test: `scripts/verify-account-mobile-polish.mjs`
- Test: existing JayLuxe verifier scripts

**Interfaces:**
- Produces: validated full-project ZIP.

- [ ] **Step 1: Run account verifier and require PASS**
- [ ] **Step 2: Run existing mobile/global-density source verifiers**
- [ ] **Step 3: Parse all JS/TS source files for syntax errors**
- [ ] **Step 4: Validate CSS brace structure and JSON/config syntax**
- [ ] **Step 5: Create and integrity-test the full ZIP**
