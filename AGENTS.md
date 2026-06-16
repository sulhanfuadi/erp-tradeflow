# AGENTS.md
> **Strict instruction file for all coding agents working on this repository.**
> Last audited: 2026-06-16. Supersedes all previous versions of this file.

---

## Project Context

- **Repo**: `erp-tradeflow`
- **Course**: Sistem Enterprise
- **Evaluator focus**: Oracle NetSuite-style end-to-end business flow demonstration
- **Tech stack** (verified from actual code):
  - Next.js 16, React 19, TypeScript
  - Prisma 6 + MongoDB (replica set required for transactions)
  - TanStack React Query 5, Zustand, Radix UI, Tailwind CSS
  - Playwright (E2E), Vitest (unit/invalidation)
  - Redis (Upstash), Sentry, ImageKit (all non-blocking; app runs without them)

---

## Mandatory Domains (Non-Negotiable)

Every implementation task must keep the following flows stable and demo-ready:

1. **O2C (Order-to-Cash)**: Sales Order → Item Fulfillment → Customer Invoice → Customer Payment
2. **P2P (Procure-to-Pay)**: Purchase Order → Item Receipt (Goods Receipt) → Vendor Bill (AP Invoice) → Bill Payment
3. **Inventory Management**: Allocation → Transfer → Issue → Reversal → Ledger

---

## NetSuite Alignment Rules

### Terminology Mapping (use NetSuite terms in all new code, docs, and UI labels)

| Implementation Term | NetSuite Term | Status |
|---|---|---|
| Order | Sales Order | Active (use both; NetSuite primary) |
| Goods Receipt | Item Receipt | Active (use both; NetSuite primary) |
| AP Invoice | Vendor Bill | Active (use both; NetSuite primary) |
| AP Payment / Bill Payment | Bill Payment | Active |
| Invoice | Customer Invoice | Active |
| Stock Issue | Stock Issue / Item Issue | Active |
| Stock Transfer | Inventory Transfer | Active |

### Terminology Error to Avoid
- ❌ "Produce to Pay" — incorrect. Must be **"Procure to Pay" / "Procure-to-Pay" / "P2P"**.
- ❌ "A/R Analyst" for vendor bill and payment — incorrect. Must be **"A/P Analyst"** for AP side.

### NetSuite Process Sequence (reference only — implementation details may differ)

**O2C**:
```
Sales Order → [Approval] → Item Fulfillment → Customer Invoice → Customer Payment
```
> Note: Sales Order Approval step is NOT yet implemented (P1 gap). Do not remove the existing flow while adding it.

**P2P**:
```
Purchase Order → Item Receipt → Vendor Bill → Bill Payment
```
> Reverse Item Receipt (storno) is implemented and must be preserved.

**Inventory**:
```
Item Master → Stock Allocation → Transfer (pending→complete) → Issue → Reversal → Ledger
```

---

## Role Mapping

### Actual Roles in System (verified in `types/auth.ts`, `contexts/auth-context.tsx`)
```
user | admin | supplier | client | retailer
```

### Target ERP Role Addition (P1 task — do not implement without this file's guidance)
If adding ERP roles, these must be added to `User.role` and enforced at the **API level** (not just UI):
- `sales_rep` → can create Sales Orders
- `sales_manager` → can approve Sales Orders  
- `purchasing_manager` → can create and post Purchase Orders
- `inventory_manager` → can manage warehouse transfers, issues
- `ap_analyst` → can create Vendor Bills and record Bill Payments
- `ar_analyst` → can create Customer Invoices and record Customer Payments
- `warehouse_staff` → can perform Item Fulfillment

> ⚠️ **Do NOT rename existing roles** without checking: `contexts/auth-context.tsx`, `app/api/netsuite/_shared.ts`, all `session.role` checks in `app/api/`, seed scripts in `scripts/`, and all test evidence.

---

## Implementation Guardrails

### Before Modifying Any File
1. Read the file fully — do not rely on summaries or previous docs.
2. Run `npm run lint` and `npm test` before and after changes to confirm no regression.
3. Check `docs/IMPLEMENTATION_AUDIT.md` for known gaps and risks.

### API Changes
- Every new write-capable API route (`POST`, `PUT`, `PATCH`, `DELETE`) **must** call `invalidateAllServerCaches()` or have a legitimate exemption.
- Every new write route that is NOT in the exempt list of `lib/react-query/invalidate-coverage.test.ts` will cause `npm test` to fail. Update the test file after adding new routes.
- All new API routes must use `requireNetSuiteSession()` (for NetSuite path) or `getSessionFromRequest()` (for legacy path) — never expose unauthenticated write endpoints.
- Role guards must be enforced at the **API layer**, not only at the UI layer.

### Data Model Changes
- Any change to `prisma/schema.prisma` must be followed by `npx prisma generate`.
- Do not add a new BigInt field without also updating serialization helpers (`serializeP2PResult`, etc.) — BigInt does not JSON-serialize natively.
- Do not delete historical records for reversals. Always use compensating entries (status flag + new movement record).
- The `product.quantity` and `StockAllocation.quantity` must be updated together in the same transaction to avoid double-counting.

### Frontend Changes
- P2PWorkbench (`components/p2p/P2PWorkbench.tsx`) currently calls **legacy** `/api/p2p/*`. If updating P2P flow, prefer updating the component to call `/api/netsuite/*` endpoints.
- UI role guards (hiding buttons based on user role) are supplementary. API guards are mandatory.

### Forbidden Actions
- ❌ Do not delete `StockMovement` records. They are the audit ledger.
- ❌ Do not hard-delete `GoodsReceipt` records. Use `status: "reversed"`.
- ❌ Do not add `NetSuite` features before fixing P0 gaps (see `docs/IMPLEMENTATION_AUDIT.md`).
- ❌ Do not mark a feature as "Implemented" unless code, data model, API, and test evidence all confirm it.

---

## Verification Commands

Run these in order before any submission or PR:

```bash
# 1. Lint (must pass 0 errors)
npm run lint

# 2. Unit + invalidation coverage tests (must pass)
npm test

# 3. Invalidation coverage specifically
npm run test:invalidate

# 4. E2E (requires running MongoDB + app)
npm run test:e2e

# 5. Submit smoke (lint + test + e2e)
npm run submit:smoke
```

### Known Test Status (as of 2026-06-16)
- `npm run lint` → ✅ 0 errors
- `npm test` → ❌ 74 failures in `invalidate-coverage.test.ts` (P0-01 to fix)
- `npm run test:e2e` → ✅ 12/12 scenarios PASS (as of 2026-05-24; re-run recommended)

---

## Coding Rules

1. **TypeScript strict**: Do not use `any` unless absolutely necessary and justified with a comment.
2. **BigInt serialization**: Always convert BigInt to `Number` before returning JSON. Use existing `serializeP2PResult` pattern.
3. **Error handling**: All API routes must return structured JSON errors `{ error: "..." }` with correct HTTP status codes.
4. **Rate limiting**: Apply `withRateLimit(request, defaultRateLimits.standard)` to all new API routes.
5. **Cache invalidation**: Call `invalidateAllServerCaches()` after any write operation that affects cached data.
6. **Logging**: Use `logger.error(...)` from `@/lib/logger` — not `console.log` or `console.error` in production routes.
7. **Validation**: Use Zod schemas from `@/lib/validations` for all request body parsing. Add new schemas there.

---

## Documentation Rules

1. Every doc must state what was **verified in code** vs. what is **assumed** or **not yet verified**.
2. Use exact file paths when referencing implementation (e.g., `app/api/netsuite/vendor-bills/route.ts`).
3. Status labels: `✅ Implemented`, `⚠️ Partial`, `❌ Missing`, `🔍 Not verified`, `⚠️ Not found in codebase`.
4. Never write "Production ready", "Fully secure", or "Completed" unless tests + lint + build all confirm it.
5. Update `docs/CHANGELOG.md` with every documentation or code change.

---

## No-Hallucination Rule

> **Agents must not fabricate findings.**
>
> If you have not read the relevant source file, write "Not verified — file not inspected." Do not infer from filenames or directory structure alone. Read the actual content before making claims.

---

## Verify Before Modifying Rule

> Before editing any file, read its current content fully using the file-reading tool. Editing based on memory or summary is forbidden.

---

## Demo Readiness Rule

- The app must be able to demo O2C + P2P + Inventory end-to-end in 5–10 minutes.
- Any change must not break the existing E2E test scenarios TS-01..TS-12.
- If a change modifies an endpoint path, update the E2E test and demo script.
- See `docs/DEMO_SCRIPT.md` for the authoritative demo flow.

---

## Test Evidence Rule

- Every new flow must have at minimum one automated test scenario with a JSON result + screenshot saved in `docs/evidence/auto/`.
- Test scenarios must be numbered sequentially (TS-13, TS-14, etc.) and added to `docs/TEST_PLAN.md`.
- Screenshots must be real (from Playwright), not generated or mocked.

---

## Delivery Priority

```
P0: Fix broken tests + git sync + ensure demo is runnable
P1: O2C Approval + P2P role enforcement + stock consistency verification
P2: Reporting pages (AP aging, AR aging) + role matrix UI + polish
```
