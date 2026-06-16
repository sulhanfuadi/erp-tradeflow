# API_CONTRACT.md — Endpoint Documentation
> Last verified: 2026-06-16. Based on direct inspection of `app/api/` route files.
> "Primary" = NetSuite narrative endpoint. "Legacy" = compatibility endpoint (both active).

---

## Auth / User

### POST /api/auth/login
- **Auth**: None required
- **Body**: `{ email: string, password: string }`
- **Response**: `{ userId, userName, userEmail, userRole, sessionId }` + sets `session_id` cookie
- **Roles**: Public
- **Side effects**: Creates session

### POST /api/auth/logout
- **Auth**: Session required
- **Body**: None
- **Response**: `{ success: true }`
- **Side effects**: Destroys session

### GET /api/auth/session
- **Auth**: Session required
- **Response**: `{ id, name, email, role, ... }`

---

## O2C — Primary (NetSuite-style)

### GET /api/netsuite/sales-orders
- **Auth**: `requireNetSuiteSession()` (blocks client/supplier)
- **Response**: `Order[]` with NetSuite status fields
- **Role enforcement**: Any authenticated non-client/supplier

### POST /api/netsuite/sales-orders
- **Auth**: `requireNetSuiteSession()`
- **Body**: `CreateOrderInput` (validated via `createOrderSchema`)
- **Response**: `Order` with `netsuiteStatus`, `netsuiteDocRefs`
- **Business rules**: Validates available stock; increments `product.reservedQuantity`; returns 400 on oversell
- **Status transitions**: → `Order.status = "pending"`
- **Side effects**: `product.reservedQuantity` +qty; cache invalidated
- **Error cases**: 400 oversell, 400 validation failure, 401 unauthorized, 403 forbidden role

### GET /api/netsuite/item-fulfillments
- **Auth**: `requireNetSuiteSession()`
- **Response**: `ItemFulfillment[]` with items

### POST /api/netsuite/item-fulfillments
- **Auth**: `requireNetSuiteSession()`
- **Body**: `{ orderId: string, notes?: string, items: [{ orderItemId: string, quantity: number }] }`
- **Business rules**: Must supply `orderId` and at least one item; quantity validation via `createItemFulfillment()`
- **Status transitions**: `OrderItem.fulfilledQuantity` incremented; `product.quantity` decremented; `product.reservedQuantity` decremented
- **Side effects**: Stock decremented; cache invalidated
- **Error cases**: 400 bad body, 400 insufficient stock, 401, 403

### GET /api/netsuite/customer-invoices
- **Auth**: `requireNetSuiteSession()`
- **Response**: `Invoice[]`

### POST /api/netsuite/customer-invoices
- **Auth**: `requireNetSuiteSession()`
- **Body**: `CreateCustomerInvoiceInput` (`orderId`, `dueDate`, `notes?`, `paymentLink?`)
- **Business rules**: Order must have fulfilled items; one invoice per order (`orderId @unique`)
- **Status transitions**: `Invoice.status = "draft"` or `"sent"` depending on impl
- **Side effects**: Cache invalidated
- **Error cases**: 400 if order already has invoice, 401, 403

### GET /api/netsuite/customer-payments
- **Auth**: `requireNetSuiteSession()`
- **Response**: `CustomerPayment[]`

### POST /api/netsuite/customer-payments
- **Auth**: `requireNetSuiteSession()`
- **Body**: `RecordCustomerPaymentInput` (`invoiceId`, `paymentAmount`, `notes?`)
- **Business rules**: `paymentAmount > 0`; updates `Invoice.amountPaid`, `amountDue`; sets status to `"partial"` or `"paid"`
- **Status transitions**: `Invoice.status` → `partial` or `paid`
- **Side effects**: `CustomerPayment` record created; cache invalidated

---

## P2P — Primary (NetSuite-style)

### GET /api/netsuite/purchase-orders
- **Auth**: `requireNetSuiteSession()`
- **Response**: `PurchaseOrder[]` with `netsuiteDocType: "Purchase Order"`

### POST /api/netsuite/purchase-orders
- **Auth**: `requireNetSuiteSession()`
- **Body**: `CreatePurchaseOrderInput` (validated via `createPurchaseOrderSchema`)
- **Response**: `PurchaseOrder` (serialized — BigInt → Number)
- **Status transitions**: → `PurchaseOrder.status = "draft"`
- **Side effects**: Cache invalidated

### GET /api/netsuite/item-receipts
- **Auth**: `requireNetSuiteSession()`
- **Response**: `GoodsReceipt[]`

### POST /api/netsuite/item-receipts
- **Auth**: `requireNetSuiteSession()`
- **Body**: `CreateGoodsReceiptInput` (`purchaseOrderId`, `items: [{ purchaseOrderItemId, quantity }]`, `notes?`)
- **Business rules**: PO must be in `posted` status; quantity per item ≤ remaining (PO qty - receivedQty); stock incremented
- **Status transitions**: `GoodsReceipt.status = "received"`; `PurchaseOrderItem.receivedQuantity` += qty; `product.quantity` += qty; `StockAllocation.quantity` += qty
- **Side effects**: Stock increased; `StockMovement` entry written (`movementType: "receipt"`); cache invalidated

### GET /api/netsuite/vendor-bills
- **Auth**: `requireNetSuiteSession()`
- **Response**: `APInvoice[]` (serialized)

### POST /api/netsuite/vendor-bills
- **Auth**: `requireNetSuiteSession()`
- **Body**: `CreateVendorBillInput` (`supplierId`, `purchaseOrderId?`, `goodsReceiptId?`, `subtotal`, `tax?`, `dueDate?`, `notes?`)
- **Validation**: `createAPInvoiceSchema`
- **Status transitions**: `APInvoice.status = "unpaid"`
- **Side effects**: Cache invalidated

### GET /api/netsuite/bill-payments
- **Auth**: `requireNetSuiteSession()`
- **Response**: `BillPayment[]`

### POST /api/netsuite/bill-payments
- **Auth**: `requireNetSuiteSession()`
- **Body**: `{ apInvoiceId: string, paymentAmount: number, notes?: string }`
- **Business rules**: `paymentAmount > 0`; updates `APInvoice.amountPaid`, `amountDue`; status → `"partial"` or `"paid"`
- **Status transitions**: `BillPayment.status = "posted"`; `APInvoice` status updated
- **Side effects**: `BillPayment` record created; cache invalidated

---

## Inventory — Primary (NetSuite-style)

### GET /api/netsuite/inventory/allocations
### POST /api/netsuite/inventory/allocations
- **Auth**: `requireNetSuiteSession()` (POST requires `inventory_manager` or `admin`)
- **Body (POST)**: `CreateStockAllocationInput` (`productId`, `warehouseId`, `quantity`)
- **Business rules**: Upserts allocation; product and warehouse must belong to user
- **Status transitions**: `StockAllocation.quantity` set/updated
- **Note**: No `StockMovement` written on simple allocation set

### GET /api/netsuite/inventory/transfers
- **Auth**: `requireNetSuiteSession()`
- **Query params**: `productId?`, `warehouseId?`
- **Response**: `StockTransfer[]` (BigInt serialized)

### POST /api/netsuite/inventory/transfers
- **Auth**: `requireNetSuiteSession()` (requires `inventory_manager` or `admin`)
- **Body**: `CreateStockTransferInput` (`productId`, `fromWarehouseId`, `toWarehouseId`, `quantity`, `notes?`)
- **Validation**: `createStockTransferSchema`
- **Status transitions**: → `StockTransfer.status = "pending"`
- **Side effects**: No stock movement yet (on pending). Movement happens on complete.

### POST /api/netsuite/inventory/transfers/[id]/complete (or equivalent)
- **Auth**: `requireNetSuiteSession()` (requires `inventory_manager` or `admin`)
- **Status transitions**: `pending` → `completed`
- **Side effects**: `StockAllocation` source decremented, dest incremented; two `StockMovement` entries written

### POST /api/netsuite/inventory/transfers/[id]/reverse
- **Auth**: `requireNetSuiteSession()` (requires `inventory_manager` or `admin`)
- **Status transitions**: New reversal `StockTransfer` created with `reversalOfId` pointing to original
- **Side effects**: Compensating `StockMovement` entries written; original preserved

### GET /api/netsuite/inventory/issues
### POST /api/netsuite/inventory/issues
- **Auth**: `requireNetSuiteSession()` (POST requires `inventory_manager` or `admin`)
- **Body (POST)**: `CreateStockIssueInput` (`productId`, `warehouseId`, `quantity`, `notes?`)
- **Validation**: `createStockIssueSchema`
- **Status transitions**: `StockMovement` written (`movementType: "issue"`, negative `quantityChange`)
- **Side effects**: `StockAllocation.quantity` decremented; `product.quantity` decremented (verify in prisma layer)

### POST /api/netsuite/inventory/issues/[id]/reverse (or equivalent legacy path)
- **Auth**: `requireNetSuiteSession()` (requires `inventory_manager` or `admin`)
- **Status transitions**: New `StockMovement` written (`movementType: "reversal"`, positive `quantityChange`)
- **Side effects**: Stock restored; original movement preserved

### GET /api/netsuite/inventory/ledger
- **Auth**: `requireNetSuiteSession()`
- **Query params**: `warehouseId?`, `productId?`, `limit?` (default 200)
- **Response**: `StockMovement[]` sorted chronologically + `runningBalance` computed per product:warehouse
- **Note**: Running balance computed server-side; no persistent balance field

---

## Legacy Compatibility Endpoints (Active During Transition)

| Endpoint | Method | Equivalent NetSuite Endpoint |
|---|---|---|
| `/api/orders` | GET/POST | `/api/netsuite/sales-orders` |
| `/api/orders/[id]` | GET/PUT/PATCH/DELETE | — |
| `/api/invoices` | GET/POST | `/api/netsuite/customer-invoices` |
| `/api/p2p/purchase-orders` | GET/POST | `/api/netsuite/purchase-orders` |
| `/api/p2p/purchase-orders/[id]` | GET/PATCH/DELETE | — |
| `/api/p2p/goods-receipts` | GET/POST | `/api/netsuite/item-receipts` |
| `/api/p2p/goods-receipts/[id]/reverse` | POST | — (storno) |
| `/api/p2p/ap-invoices` | GET/POST | `/api/netsuite/vendor-bills` |
| `/api/p2p/ap-invoices/[id]/payment` | POST | `/api/netsuite/bill-payments` |
| `/api/stock-allocations` | GET/POST | `/api/netsuite/inventory/allocations` |
| `/api/stock-allocations/transfers` | GET/POST | `/api/netsuite/inventory/transfers` |
| `/api/stock-allocations/transfers/[id]/complete` | POST | — |
| `/api/stock-allocations/transfers/[id]/cancel` | POST | — |
| `/api/stock-allocations/transfers/[id]/reverse` | POST | — |
| `/api/stock-allocations/issues` | GET/POST | `/api/netsuite/inventory/issues` |
| `/api/stock-allocations/issues/[id]/reverse` | POST | — |

> **P2PWorkbench.tsx currently uses legacy endpoints**. For demo, this is acceptable as both paths produce equivalent DB records. For NetSuite narrative, prefer showing `/api/netsuite/*` endpoints.

---

## Common Error Patterns

| Code | Meaning | Common Cause |
|---|---|---|
| 400 | Bad Request | Validation failure, business rule violation (e.g., oversell) |
| 401 | Unauthorized | No session / expired session |
| 403 | Forbidden | `isForbiddenRole()` — client or supplier trying to access internal endpoint |
| 404 | Not Found | Resource doesn't exist or doesn't belong to authenticated user |
| 429 | Rate Limited | Too many requests (`withRateLimit()`) |
| 500 | Server Error | Unexpected error; logged to Sentry |
