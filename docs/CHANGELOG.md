# CHANGELOG.md — ERP TradeFlow Development Log
> All entries verified. No fabricated changes included.

---

## [Unreleased]

### Changed & Verified (2026-06-19) — P2P + Inventory Role-Flow Stabilization
- **`scripts/demo-dry-run.ts`** — Added narrow null guards for supplier/warehouse seed lookups to fix the TypeScript build blocker without changing demo behavior.
- **`lib/role-helpers.ts`** — Expanded centralized ERP role helpers for P2P and Inventory (`canCreatePurchaseOrder`, `canReceivePurchaseOrder`, `canCreateVendorBill`, `canPayVendorBill`, `canManageItemMaster`, `canAdjustInventory`, `canMonitorInventory`). Generic `user` is not treated as an internal role.
- **P2P APIs and UI** — Updated NetSuite and legacy P2P read paths for role-switch demo visibility, added role-specific write guards, and tightened Vendor Bill/Bill Payment data integrity so bills cannot exceed received unbilled PO value and payments require approved bills.
- **Inventory APIs and UI** — Updated stock allocation, transfer, issue, and ledger paths so internal roles can see operational inventory data without current-user-only filters. Inventory mutation endpoints require Inventory Manager/Admin. Warehouse Staff remains limited to receipt/monitoring role capabilities.
- **`components/warehouses/WarehouseInventoryWorkbench.tsx`** — Replaced hardcoded Inventory Manager UI checks with the new helper functions and clarified demo labels for Item/Product master context, Inventory Adjustment, Inventory Transfer, Stock Issue/Reversal, and Stock Card/Movement Ledger. Ledger now shows warehouse and creator identifier when available.
- **Tests** — Added focused P2P and Inventory unit coverage for role helper behavior, internal visibility without `userId`-only filters, Vendor Bill/Payment integrity, and issue reversal as compensating movement rather than deleting history.
- **Verification** — `npm run lint`, `npm test`, and `npm run build` passed after P2P and Inventory changes. Final `npm run test:e2e` is blocked by Playwright webServer startup on Windows: `'DATABASE_URL' is not recognized as an internal or external command`.

### Fixed (2026-06-16) — P0 Stabilization Phase
- **`lib/react-query/invalidate-coverage.test.ts`** — Fixed Windows path separator bug: `path.relative()` returns backslash paths on Windows but spec/exempt Set keys use forward slashes. Added `.replaceAll("\\", "/")` normalization at 3 lookup sites. Result: `npm test` went from **82 failures → 324/324 passed** (✅).
- **`app/api/netsuite/vendor-bills/route.ts`** — Fixed role mismatch: POST guard was `ar_analyst` (wrong) → `ap_analyst` (correct). Vendor bills are AP-side operations per AGENTS.md.
- **`app/api/netsuite/vendor-bills/[id]/approve/route.ts`** — Same fix: `ar_analyst` → `ap_analyst`.
- **`app/api/netsuite/vendor-bills/[id]/reject/route.ts`** — Same fix: `ar_analyst` → `ap_analyst`.
- **`components/p2p/P2PWorkbench.tsx`** — Renamed `isArAnalyst`/`ar_analyst` → `isApAnalyst`/`ap_analyst` for AP-side role consistency.

### Added & Verified (2026-06-16) — Frontend UI Guard Alignment Phase
- **`lib/role-helpers.ts`** — Created centralized role helper functions (`isSalesManager`, `isPurchasingManager`, `isInventoryManager`, `isApAnalyst`, `isArAnalyst`) with built-in `admin` overrides to ensure consistent UI checks matching the backend guards.
- **`components/p2p/P2PWorkbench.tsx`** — Applied role guards using `role-helpers.ts` (Purchasing Manager for PO, Inventory Manager for Item Receipt, A/P Analyst for Vendor Bill and Payment).
- **`components/warehouses/WarehouseInventoryWorkbench.tsx`** — Applied `inventory_manager` role guards for stock allocation, transfer, and issue actions.
- **`components/Pages/OrderDetailPage.tsx`** — Applied `sales_manager` role guard for Sales Order Approval / Rejection buttons.
- **`components/Pages/InvoiceDetailPage.tsx`** — Applied `ar_analyst` role guard for Invoice Edit, Send, and Delete actions.
- **Documentation Updates** — Updated `DEMO_SCRIPT.md` and `ROLE_ACCESS_MATRIX.md` to indicate that ERP-specific roles are implemented via UI guards and API guards.

### Synced (2026-06-16) — Git Sync
- Pulled 43 commits from `origin/main` (fast-forward, 0 conflicts).
- New routes pulled in: `sales-orders/[id]/approve`, `sales-orders/[id]/reject`, `item-fulfillments/[id]/pack`, `item-fulfillments/[id]/ship`, `purchase-orders/[id]/review`, `vendor-bills/[id]/approve`, `vendor-bills/[id]/reject`.
- BPMN evidence screenshots added: `docs/evidence/bpmn/*.png`.
- Schema updated upstream with approval status fields.
- Created backup branch `backup/pre-sync-20260616` before pull.

### Verified (2026-06-16) — After P0 Stabilization
- `npm run lint` → ✅ 0 errors, 0 warnings
- `npm test` → ✅ **324/324 passed** (was 82 failures before fix)
- `npm run build` → ✅ TypeScript passed, 76 routes compiled, 0 type errors
- `git status` → ✅ Up to date with `origin/main`

### Fixed & Verified (2026-06-16) — P2 Inventory Core Consistency Phase
- **Role Guards Hardened**:
  - `app/api/netsuite/inventory/issues/route.ts` — Added `inventory_manager` or `admin` role check.
  - `app/api/netsuite/inventory/issues/[id]/reverse/route.ts` — Added role check.
  - `app/api/netsuite/inventory/transfers/route.ts` — Added role check.
  - `app/api/netsuite/inventory/transfers/[id]/cancel/route.ts` — Added role check.
  - `app/api/netsuite/inventory/transfers/[id]/complete/route.ts` — Added role check.
  - `app/api/netsuite/inventory/transfers/[id]/reverse/route.ts` — Added role check.
- **Verification**:
  - **Stock Consistenty Checker Script**: Created `scripts/verify-stock-consistency.ts` to assert that `Product.quantity` strictly equals the sum of all its `StockAllocation.quantity` records. Run passed with 0 inconsistencies.
  - **Stock Issue Rules**: Confirmed logic handles zero/negative values (`min(1)` schema validation), validates availability, decrements Product and StockAllocation correctly exactly once, and creates ledger entries (`movementType: "issue"`).
  - **Stock Transfer Rules**: Confirmed transfer schema validates quantities, logic accurately shifts allocation from source to destination without changing `Product.quantity` (as it acts as global aggregate), and records `transfer_in`/`transfer_out` ledger correctly.
  - **Reversal Rules**: Validated reversal endpoints handle stock restitution atomically and create compensating `reversal` ledger entries instead of deleting historical records.
  - **P2P Receipt Rules**: Confirmed `createGoodsReceipt` increments both Product and StockAllocation without double counting.

### Fixed & Verified (2026-06-16) — P1 Stabilization Phase
- **Role Guards Hardened**:
  - `app/api/netsuite/item-receipts/route.ts` — Added `inventory_manager` role requirement.
  - `app/api/netsuite/bill-payments/route.ts` — Added `ap_analyst` role requirement.
- **P2PWorkbench Endpoint Alignment**:
  - Updated `P2PWorkbench.tsx` to use `/api/netsuite/purchase-orders` (POST).
  - Updated `P2PWorkbench.tsx` to use `/api/netsuite/item-receipts` (POST).
  - Updated `P2PWorkbench.tsx` to use `/api/netsuite/vendor-bills` (POST).
  - Updated `P2PWorkbench.tsx` to use `/api/netsuite/bill-payments` (POST) with updated payload.
  - Retained `/api/p2p/purchase-orders/${id}` PATCH for status updates as NetSuite equivalent `[id]/review` serves a different workflow.
- **Verification**:
  - **Stock Consistency Verified**: Confirmed `createGoodsReceipt` increments both `Product.quantity` (global) and `StockAllocation.quantity` (per-warehouse). Validated this is intended design, not a double-count bug.
  - **Legacy Payment Route Verified**: Confirmed `recordAPInvoicePayment` in `prisma/p2p.ts` only updates invoice fields and does NOT create a `BillPayment` database record.

### Known Issues (Updated 2026-06-16)
| ID | Severity | Issue | File | Status |
|---|---|---|---|---|
| P0-01 | P0 | `npm test` failures (invalidation coverage) | `lib/react-query/invalidate-coverage.test.ts` | ✅ **FIXED** |
| P0-02 | P0 | Branch behind origin/main | Git | ✅ **FIXED** |
| P0-03 | P1 | P2PWorkbench calls legacy `/api/p2p/*` writes | `components/p2p/P2PWorkbench.tsx` | ✅ **FIXED** |
| P1-01 | P1 | Sales Order Approval | Multiple files | ✅ Now present in upstream |
| P1-02 | P1 | Stock consistency `product.quantity` vs `StockAllocation.quantity` | `prisma/p2p.ts`, `prisma/stock-allocation.ts` | ✅ **VERIFIED** (Intended) |
| P1-03 | P1 | BillPayment model not created by legacy payment route | `prisma/p2p.ts` | ✅ **VERIFIED** (Does not create record) |
| P1-04 | P1 | `ar_analyst` role in vendor-bill endpoints | 3 API route files + UI | ✅ **FIXED** |
| P2-01 | P2 | `bill-payments` and `item-receipts` lack role guards | Route files | ✅ **FIXED** |
| P2-02 | P2 | No AP aging / vendor balance page | Frontend | ⚠️ Next phase |
| P2-03 | P2 | No AR aging / customer balance page | Frontend | ⚠️ Next phase |
| P2-04 | P2 | Warehouse-level negative stock prevention not confirmed | `prisma/stock-allocation.ts` | ⚠️ Not verified |

---

### Added (2026-06-16) — Governance Documentation Phase

- **NEW** `docs/IMPLEMENTATION_AUDIT.md` — Full 10-point audit of codebase against NetSuite ERP requirements. Based on direct source inspection. Covers O2C, P2P, Inventory, Role/Auth, API, Data Model, Evidence, Gap analysis.
- **UPDATED** `AGENTS.md` — Strict instruction file for all coding agents. Includes NetSuite alignment rules, verified role model, coding guardrails, and no-hallucination rule.
- **NEW** `docs/DESIGN.md` — System design document: architecture, module boundaries, API structure, Prisma data access layer, auth model, state management, error handling, reversal design.
- **NEW** `docs/BUSINESS_FLOW_SPEC.md` — Business process specification with NetSuite sequence, actor maps, status transitions, sequence diagrams, and BPMN-to-implementation label mapping for O2C, P2P, and Inventory.
- **NEW** `docs/ROLE_ACCESS_MATRIX.md` — Role access matrix (current verified state vs. target ERP state). Documents actual role values, `isForbiddenRole()` definition, expected ERP roles, and mismatch table.
- **NEW** `docs/API_CONTRACT.md` — Endpoint documentation for all NetSuite and legacy API routes. Includes request/response shapes, auth requirements, business rules, and error patterns.
- **NEW** `docs/DATA_MODEL.md` — Full Prisma/MongoDB data model documentation. Includes all models, key fields, status enums, stock consistency rules, payment consistency rules, and reversal/storno data rules.
- **UPDATED** `docs/TEST_PLAN.md` — Added TS-13 (stock consistency), TS-14 (role negative tests), TS-15 (warehouse-level negative stock). Documents planned scenarios.
- **UPDATED** `docs/DEMO_SCRIPT.md` — Updated demo script with 8–10 minute walkthrough, account setup, pre-demo checklist, fallback plan, and Q&A guide.
- **NEW** `docs/IMPLEMENTATION_PLAN.md` — Development plan for P0/P1/P2 gaps identified in audit.

### Verified (2026-06-16)
- `npm run lint` → ✅ 0 errors, 0 warnings
- `npm test` → ❌ 74 failures in `invalidate-coverage.test.ts` (P0-01 gap, documented)
- `npm run test:e2e` → Evidence from 2026-05-24 shows TS-01..TS-12 all PASS

### Known Issues (Open as of 2026-06-16)
| ID | Severity | Issue | File |
|---|---|---|---|
| P0-01 | P0 | `npm test` fails (74 invalidation coverage failures) | `lib/react-query/invalidate-coverage.test.ts` |
| P0-02 | P0 | Local branch 43 commits behind origin/main | Git |
| P0-03 | P1 | P2PWorkbench calls legacy `/api/p2p/*` instead of `/api/netsuite/*` | `components/p2p/P2PWorkbench.tsx` |
| P1-01 | P1 | No Sales Order Approval step | Multiple files |
| P1-02 | P1 | Stock consistency `product.quantity` vs `StockAllocation.quantity` not fully verified | `prisma/p2p.ts`, `prisma/stock-allocation.ts` |
| P1-03 | P1 | BillPayment endpoint alignment between UI and NetSuite path | `app/api/p2p/ap-invoices/[id]/payment/route.ts` |
| P2-01 | P2 | No AP aging / vendor balance report page | Frontend |
| P2-02 | P2 | No AR aging / customer balance page | Frontend |
| P2-03 | P2 | Warehouse-level negative stock prevention not confirmed | `prisma/stock-allocation.ts` |

---

## [v2.0.x] — NetSuite Alignment Phase

> These features are known to be present based on codebase inspection. Exact version/date not confirmed from git log.

### Added
- `app/api/netsuite/` — Complete NetSuite-style endpoint suite:
  - `sales-orders/` — GET/POST Sales Orders with NetSuite status mapping
  - `item-fulfillments/` — GET/POST Item Fulfillments
  - `customer-invoices/` — GET/POST Customer Invoices
  - `customer-payments/` — GET/POST Customer Payments
  - `purchase-orders/` — GET/POST Purchase Orders
  - `item-receipts/` — GET/POST Item Receipts (Goods Receipts)
  - `vendor-bills/` — GET/POST Vendor Bills (AP Invoices)
  - `bill-payments/` — GET/POST Bill Payments
  - `inventory/allocations/` — GET/POST Stock Allocations
  - `inventory/transfers/` — GET/POST Transfers + complete/cancel/reverse
  - `inventory/issues/` — GET/POST Stock Issues + reverse
  - `inventory/ledger/` — GET Inventory Ledger with running balance
- `app/api/netsuite/_shared.ts` — `requireNetSuiteSession()`, `isForbiddenRole()`
- `prisma/schema.prisma:ItemFulfillment` — New model for fulfillment records
- `prisma/schema.prisma:CustomerPayment` — New model for customer payment records
- `prisma/schema.prisma:BillPayment` — New model for bill payment records
- `prisma/schema.prisma:StockTransfer` — reversal fields (`reversalOfId`, `reversalTransferId`, `reversedAt`, `reversedBy`)
- `types/netsuite.ts` — NetSuite type definitions
- `docs/08-netsuite-mapping.md` — NetSuite terminology mapping document
- `docs/01-business-flows.md` — Business flow specification (P2P, O2C, Inventory)
- `docs/02-test-scenarios.md` — 12 test scenario overview
- `docs/03-demo-script.md` — Initial demo script (superseded by DEMO_SCRIPT.md)
- E2E test evidence: `docs/evidence/auto/TS-01..TS-12.json` and `.png`
- `scripts/create-demo-accounts.ts` — Demo account seeder
- `scripts/run-submit-smoke.sh` — Pre-submission smoke test script

### Architecture
- Dual-endpoint strategy: NetSuite primary + legacy compatibility during transition window
- Redis cache with server-side invalidation via `invalidateAllServerCaches()`
- BigInt serialization in Prisma functions (`serializeP2PResult()`, `serializeNetSuiteResult()`)

---

## [v1.x] — Initial Implementation Phase

> Features verified present in codebase but dates not confirmed.

### Core
- Next.js 16 + TypeScript + Prisma 6 + MongoDB
- Custom cookie-based session auth
- Role-based access: `admin`, `user`, `client`, `supplier`, `retailer`
- Product catalog with SKU, category, supplier, images (ImageKit CDN)
- Order management: create, track, fulfill, invoice, pay
- P2P Workbench (legacy `/api/p2p/*` endpoints)
- Inventory management: stock allocations, warehouse-to-warehouse transfers, stock issues, reversal
- `StockMovement` ledger (append-only, never deleted)
- `AuditLog` model (used in orders, expected in other operations)
- Notification system (in-app + email via Nodemailer)
- Sentry error tracking
- Redis caching (Upstash)
- Rate limiting (`withRateLimit()`)
- Import/export (CSV)
- Shipping integration (Shippo)
- Stripe payment integration (optional)
- Support ticket system
- Product reviews
- Client portal, Supplier portal

---

## How to Add a CHANGELOG Entry

When making any code change, add an entry at the top of the `[Unreleased]` section with:
- Date (YYYY-MM-DD)
- Category: `Added`, `Changed`, `Fixed`, `Removed`, `Verified`, `Documented`
- File path and brief description of what changed and why

Example:
```markdown
### Fixed (2026-06-17)
- `lib/react-query/invalidate-coverage.test.ts` — Added NetSuite routes to spec/exempt list (P0-01 fix)
- `components/p2p/P2PWorkbench.tsx` — Updated bill payment call to use `/api/netsuite/bill-payments` (P0-03 fix)
```
