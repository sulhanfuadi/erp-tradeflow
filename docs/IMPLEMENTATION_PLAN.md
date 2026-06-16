# IMPLEMENTATION_PLAN.md — Development Plan (Post-Audit)
> Updated: 2026-06-16 post-audit phase.
> Based on verified gaps from `docs/IMPLEMENTATION_AUDIT.md`.

---

## Overview

This plan covers the remaining implementation work after the audit and documentation phase. Work is ordered by priority: P0 (demo-blocking) → P1 (correctness/role) → P2 (polish).

---

## P0 — Demo-Blocking Fixes

### P0-01: Fix `npm test` (74 failures — invalidation coverage test)

**Problem**: `lib/react-query/invalidate-coverage.test.ts` fails because the NetSuite endpoints and several other new routes are not registered in the test's spec/exempt list.

**Files affected**:
- `lib/react-query/invalidate-coverage.test.ts`

**Fix**:
1. Read `invalidate-coverage.test.ts` fully to understand the spec/exempt structure
2. For each failing route, either:
   - Add it to the `API_WRITE_EXEMPT` set (if it intentionally skips cache invalidation), OR
   - Verify it calls `invalidateAllServerCaches()` and add it to the spec list
3. Run `npm test` — should pass 0 failures

**Acceptance criteria**:
- `npm test` exits with 0 failures
- No routes are exempted without justification comment

**Commands to verify**:
```bash
npm test
npm run test:invalidate
```

---

### P0-02: Pull latest commits from origin/main

**Problem**: Local branch is 43 commits behind `origin/main`.

**Fix**:
```bash
git pull origin main
# Resolve any conflicts
npm install
npx prisma generate
npm run lint
npm test
```

**Acceptance criteria**:
- `git status` shows no divergence with origin/main
- `npm run lint` passes
- App starts without errors

---

### P0-03: Verify P2PWorkbench endpoint alignment

**Problem**: `components/p2p/P2PWorkbench.tsx` calls legacy `/api/p2p/*` endpoints, not the NetSuite-style endpoints.

**Files affected**:
- `components/p2p/P2PWorkbench.tsx`

**Fix options** (choose one):
- **Option A** (Recommended): Update P2PWorkbench to call `/api/netsuite/*` for PO creation, goods receipt, vendor bill, and bill payment. This makes the UI-to-NetSuite narrative consistent.
- **Option B** (Minimal): Add comment to demo script noting that the P2P UI uses legacy endpoints (both produce identical DB records), and the NetSuite endpoints are verified by Playwright E2E tests.

**Acceptance criteria**:
- P2P Workbench loads and all operations work without error
- Demo narrative is coherent

---

## P1 — Correctness and Role Issues

### P1-01: Add Sales Order Approval Step

**Problem**: NetSuite O2C flow includes `Sales Order → Approval → Item Fulfillment`. No approval step exists.

**Files to modify**:
- `prisma/schema.prisma` — add status `"pending_approval"` or approval-related fields to Order, OR use separate approach
- `prisma/order.ts` — add `approveOrder()` function
- `app/api/netsuite/sales-orders/[id]/approve/route.ts` — NEW endpoint
- `types/netsuite.ts` — update `NetSuiteSalesOrderStatus` type
- `components/orders/` — add Approve/Reject button for Sales Manager role

**Implementation approach** (minimal):
1. Add `"pending_approval"` to allowed Order statuses
2. Make Sales Order creation set status `"pending_approval"` (optional toggle)
3. Add `PATCH /api/netsuite/sales-orders/[id]/approve` endpoint
4. Add `PATCH /api/netsuite/sales-orders/[id]/reject` endpoint
5. Guard with role check: only `sales_manager` or `admin` can approve

**Note**: If adding ERP roles is too complex, implement with `admin` only for now and document the gap.

**Acceptance criteria**:
- Sales Order can be created in `pending_approval` status
- Admin/Sales Manager can approve → moves to `pending_fulfillment`
- Admin/Sales Manager can reject → moves to `cancelled`
- Item Fulfillment blocked until order is approved

---

### P1-02: Verify and fix stock consistency

**Problem**: `product.quantity` and `StockAllocation.quantity` might diverge.

**Files to read first**:
- `prisma/p2p.ts` — goods receipt stock increment logic
- `prisma/stock-allocation.ts` — stock issue and transfer logic

**Fix**:
1. Read both files completely
2. Verify that every write to `product.quantity` also writes to `StockAllocation.quantity` in the same Prisma transaction
3. If not atomic: wrap in `prisma.$transaction()`
4. Add assertion in TS-13 test scenario

**Acceptance criteria**:
- After GoodsReceipt: `product.quantity` and `StockAllocation.quantity` both increase by same amount
- After StockIssue: both decrease by same amount
- TS-13 test passes

---

### P1-03: Clarify/document BillPayment endpoint alignment

**Problem**: P2PWorkbench calls `/api/p2p/ap-invoices/[id]/payment`, but the `BillPayment` model is created by `/api/netsuite/bill-payments`. Verify both create equivalent records.

**Files to read**:
- `app/api/p2p/ap-invoices/[id]/payment/route.ts`
- `app/api/netsuite/bill-payments/route.ts`

**Fix**:
1. Compare both route implementations
2. If legacy creates `BillPayment` record: document the equivalence
3. If legacy uses a different mechanism: update P2PWorkbench to use NetSuite endpoint

**Acceptance criteria**:
- Both endpoints create `BillPayment` records in the DB OR
- P2PWorkbench is updated to use `/api/netsuite/bill-payments`

---

## P2 — Polish and Documentation

### P2-01: Update invalidation coverage test for future routes

After P0-01 fix, add documentation comment in the test file explaining the pattern for new routes.

### P2-02: Add AP aging / vendor balance view (optional)

**Files**:
- `app/procurement/` — add AP aging section
- `app/api/netsuite/vendor-bills/route.ts` — add query params for supplier filter

### P2-03: Add AR aging / customer balance view (optional)

**Files**:
- `app/invoices/` — add customer balance tab
- `app/api/netsuite/customer-invoices/route.ts` — add query params for client filter

### P2-04: Verify negative stock prevention at warehouse level

**File**: `prisma/stock-allocation.ts`
- Read `createStockIssue()` function
- Verify it checks `StockAllocation.quantity >= requested quantity` before decrementing
- If not: add validation and return error

### P2-05: Re-run E2E tests and regenerate evidence

```bash
npm run test:e2e
```
Evidence auto-saved to `docs/evidence/auto/TS-01..TS-12.*`.

---

## Verification Command After Each Phase

```bash
# After P0 fixes:
npm run lint && npm test && npm run test:e2e

# After P1 fixes:
npm run lint && npm test && npm run test:e2e

# Full smoke before submission:
npm run submit:smoke
```

---

## Recommended Commit Grouping

| Branch / Commit | Changes |
|---|---|
| `fix/invalidation-coverage` | P0-01: update invalidate-coverage.test.ts |
| `fix/git-sync` | P0-02: git pull + dependency update |
| `fix/p2p-endpoint-alignment` | P0-03: P2PWorkbench endpoint update |
| `feat/sales-order-approval` | P1-01: approval workflow |
| `fix/stock-consistency` | P1-02: product.quantity + allocation sync |
| `fix/bill-payment-alignment` | P1-03: bill payment endpoint clarification |
| `docs/governance-update` | All new governance docs from audit |
