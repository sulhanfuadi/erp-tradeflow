# DATA_MODEL.md — Prisma / Data Model Documentation
> Last verified: 2026-06-16 from `prisma/schema.prisma` direct inspection.
> MongoDB via Prisma 6. All ObjectId fields use `@db.ObjectId`.

---

## Model List

| Model | Purpose | Key Status Field |
|---|---|---|
| `User` | System users + authentication | `role` (string, nullable) |
| `Product` | Item master / inventory items | `status` (string), `deletedAt` (soft delete) |
| `Category` | Product categories | `status` (boolean) |
| `Supplier` | Vendor master | `status` (boolean) |
| `Warehouse` | Warehouse master | `status` (boolean) |
| `Order` | Sales orders (O2C) | `status`, `paymentStatus` |
| `OrderItem` | Line items of a sales order | `fulfilledQuantity`, `billedQuantity` |
| `Invoice` | Customer invoices (O2C) | `status`, `amountPaid`, `amountDue` |
| `CustomerPayment` | Customer payment records | `status` (posted/void) |
| `ItemFulfillment` | Item fulfillment records (O2C) | `status` (fulfilled/reversed) |
| `ItemFulfillmentItem` | Line items of a fulfillment | — |
| `PurchaseOrder` | Purchase orders (P2P) | `status` (draft/posted/completed/cancelled) |
| `PurchaseOrderItem` | Line items of a PO | `receivedQuantity`, `billedQuantity` |
| `GoodsReceipt` | Item receipts / goods receipts (P2P) | `status` (received/reversed) |
| `GoodsReceiptItem` | Line items of a goods receipt | — |
| `APInvoice` | Vendor bills / AP invoices (P2P) | `status` (draft/unpaid/partial/paid/cancelled) |
| `BillPayment` | Bill payment records (P2P) | `status` (posted/void) |
| `StockAllocation` | Per-product per-warehouse stock quantity | `quantity` (BigInt), `reservedQuantity` (BigInt) |
| `StockTransfer` | Warehouse-to-warehouse transfer | `status` (pending/completed/cancelled) |
| `StockMovement` | Append-only inventory ledger | `movementType`, `quantityChange` (BigInt) |
| `AuditLog` | User action audit trail | `action`, `entityType` |
| `Notification` | In-app notifications | `read` (boolean) |
| `SupportTicket` | Support tickets | `status`, `priority` |
| `SystemConfig` | App-wide settings | `key` (unique) |
| `ImportHistory` | CSV import history | `status` |
| `ProductReview` | Product reviews | `status` (pending/approved/rejected) |

---

## Key Model Definitions

### User
```prisma
model User {
  id               String    @id @default(auto()) @map("_id") @db.ObjectId
  email            String    @unique
  name             String
  password         String
  role             String?   // "user" | "admin" | "supplier" | "client" | "retailer" | null (= "user")
  username         String?   @unique
  googleId         String?
  image            String?
  emailPreferences Json?
  notifications    Notification[]
  createdAt        DateTime  @db.Date
  updatedAt        DateTime? @db.Date
}
```

> ⚠️ `role` is nullable. Null is treated as `"user"` in application logic. No ERP-specific roles (Purchasing Manager, A/P Analyst, etc.) exist yet.

### Product
```prisma
model Product {
  id               String      @id @default(auto()) @map("_id") @db.ObjectId
  name             String
  sku              String      @unique
  price            Float
  quantity         BigInt                        // Total stock at product level. INVARIANT: MUST equal sum(StockAllocation.quantity)
  reservedQuantity BigInt      @default(0)       // Reserved by pending orders
  status           String                        // No itemType field (inventory/non-inventory/service not modeled)
  categoryId       String      @db.ObjectId
  supplierId       String      @db.ObjectId
  userId           String      @db.ObjectId
  expirationDate   DateTime?   @db.Date
  deletedAt        DateTime?   @db.Date          // Soft delete
  deletedBy        String?     @db.ObjectId
  qrCodeUrl        String?
  imageUrl         String?
  orderItems       OrderItem[]
  createdAt        DateTime    @default(now()) @db.Date
  updatedAt        DateTime?   @db.Date
}
```

### Order (Sales Order)
```prisma
model Order {
  id              String      @id
  orderNumber     String      @unique   // ORD-YYYY-NNNN
  userId          String      @db.ObjectId
  clientId        String?     @db.ObjectId
  status          String      @default("pending")   // pending|confirmed|processing|shipped|delivered|cancelled
  paymentStatus   String      @default("unpaid")    // unpaid|paid|refunded|partial
  subtotal        Float
  tax             Float?
  shipping        Float?
  discount        Float?
  total           Float
  items           OrderItem[]
  invoice         Invoice?
  itemFulfillments ItemFulfillment[]
  customerPayments CustomerPayment[]
  // ... tracking fields, timestamps
}
```

### OrderItem
```prisma
model OrderItem {
  quantity          Int
  fulfilledQuantity Int     @default(0)   // NetSuite Item Fulfillment parity
  billedQuantity    Int     @default(0)   // NetSuite Invoice parity
  price             Float
  subtotal          Float
  // productName, sku snapshot at order time
}
```

### PurchaseOrder
```prisma
model PurchaseOrder {
  status   String  @default("draft")  // draft | posted | completed | cancelled
  items    PurchaseOrderItem[]
  goodsReceipts  GoodsReceipt[]
  apInvoices     APInvoice[]
  billPayments   BillPayment[]
  // supplierId, warehouseId, userId, totals, timestamps
}
```

### PurchaseOrderItem
```prisma
model PurchaseOrderItem {
  quantity         BigInt              // Ordered quantity
  receivedQuantity BigInt  @default(0) // Received so far
  billedQuantity   BigInt  @default(0) // Billed so far
  unitCost         Float
  subtotal         Float
}
```

### GoodsReceipt
```prisma
model GoodsReceipt {
  status      String    @default("received")  // received | reversed
  reversedAt  DateTime? @db.Date
  reversedBy  String?   @db.ObjectId
  items       GoodsReceiptItem[]
  apInvoices  APInvoice[]
  // purchaseOrderId, supplierId, warehouseId, userId, timestamps
}
```

### APInvoice (Vendor Bill)
```prisma
model APInvoice {
  status     String   @default("unpaid")  // draft | unpaid | partial | paid | cancelled
  subtotal   Float
  tax        Float?
  total      Float
  amountPaid Float    @default(0)
  amountDue  Float    @default(0)
  dueDate    DateTime? @db.Date
  paidAt     DateTime? @db.Date
  billPayments BillPayment[]
  // supplierId, purchaseOrderId?, goodsReceiptId?, userId, timestamps
}
```

### BillPayment
```prisma
model BillPayment {
  paymentNumber    String  @unique   // BP-YYYYMMDD-HHMMSS-XXXX
  apInvoiceId      String  @db.ObjectId
  purchaseOrderId  String? @db.ObjectId
  paymentAmount    Float
  amountApplied    Float
  amountRemaining  Float
  status           String  @default("posted")  // posted | void
  paidAt           DateTime @default(now()) @db.Date
}
```

### StockAllocation
```prisma
model StockAllocation {
  productId        String  @db.ObjectId
  warehouseId      String  @db.ObjectId
  quantity         BigInt  @default(0)   // Available in this warehouse
  reservedQuantity BigInt  @default(0)   // Reserved in this warehouse

  @@unique([productId, warehouseId])     // One allocation per product+warehouse
}
```

### StockTransfer
```prisma
model StockTransfer {
  productId           String  @db.ObjectId
  fromWarehouseId     String  @db.ObjectId
  toWarehouseId       String  @db.ObjectId
  quantity            BigInt
  status              String  @default("pending")  // pending | completed | cancelled
  reversalOfId        String? @db.ObjectId         // If this IS a reversal
  reversalTransferId  String? @db.ObjectId         // If this HAS been reversed
  reversedAt          DateTime? @db.Date
  reversedBy          String?   @db.ObjectId
  completedAt         DateTime? @db.Date
}
```

### StockMovement (Inventory Ledger)
```prisma
model StockMovement {
  productId      String  @db.ObjectId
  warehouseId    String  @db.ObjectId
  userId         String  @db.ObjectId
  movementType   String  // receipt | issue | transfer_in | transfer_out | reversal
  quantityChange BigInt  // Signed: +N (in), -N (out)
  referenceType  String? // goods_receipt | stock_transfer | stock_issue | reversal
  referenceId    String? @db.ObjectId
  notes          String?
  createdAt      DateTime @default(now()) @db.Date
  // NEVER DELETED — append-only ledger
}
```

### AuditLog
```prisma
model AuditLog {
  userId     String  @db.ObjectId
  action     String  // create | update | delete | login | logout
  entityType String  // product | order | invoice | user | ...
  entityId   String? @db.ObjectId
  details    Json?   // { changes: {...} }
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now()) @db.Date
  // NEVER DELETED
}
```

---

## Important Enums / Status Fields

| Model | Field | Values |
|---|---|---|
| Order | status | `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled` |
| Order | paymentStatus | `unpaid`, `paid`, `refunded`, `partial` |
| Invoice | status | `draft`, `sent`, `paid`, `overdue`, `cancelled` |
| CustomerPayment | status | `posted`, `void` |
| ItemFulfillment | status | `fulfilled`, `reversed` |
| PurchaseOrder | status | `draft`, `posted`, `completed`, `cancelled` |
| GoodsReceipt | status | `received`, `reversed` |
| APInvoice | status | `draft`, `unpaid`, `partial`, `paid`, `cancelled` |
| BillPayment | status | `posted`, `void` |
| StockTransfer | status | `pending`, `completed`, `cancelled` |
| StockMovement | movementType | `receipt`, `issue`, `transfer_in`, `transfer_out`, `reversal` |

---

## Stock Consistency Rules

> ⚠️ **CRITICAL**: `Product.quantity` and `StockAllocation.quantity` are two independent fields that MUST be kept in sync.

### Rules
1. When a `GoodsReceipt` is posted → increment BOTH `Product.quantity` AND `StockAllocation.quantity` for the PO's warehouse.
2. When a `GoodsReceipt` is reversed → decrement BOTH `Product.quantity` AND `StockAllocation.quantity`.
3. When a `StockIssue` is created → decrement BOTH `Product.quantity` AND `StockAllocation.quantity`.
4. When a `StockIssue` is reversed → increment BOTH `Product.quantity` AND `StockAllocation.quantity`.
5. When a `StockTransfer` completes → only `StockAllocation.quantity` changes (transfer between warehouses). `Product.quantity` total stays the same.
6. When a `SalesOrder` is created → increment ONLY `Product.reservedQuantity` (not `quantity`).
7. When an `ItemFulfillment` is created → decrement `Product.quantity` AND `Product.reservedQuantity`.

### Risk: Double-Counting
If `Product.quantity` represents total cross-warehouse stock and `StockAllocation.quantity` represents per-warehouse stock, they must satisfy:
```
Product.quantity = SUM(StockAllocation.quantity) for all warehouses for that product
```
Verify this invariant holds after every write operation. Not currently enforced by a DB-level constraint.

---

## Payment Consistency Rules

| Rule | Description |
|---|---|
| `Invoice.total = Invoice.subtotal + tax + shipping - discount` | Must hold at creation |
| `Invoice.amountPaid = SUM(CustomerPayment.amountApplied)` | Must hold after each payment |
| `Invoice.amountDue = Invoice.total - Invoice.amountPaid` | Must hold; status changes when amountDue = 0 |
| `APInvoice.total = APInvoice.subtotal + tax` | Must hold at creation |
| `APInvoice.amountPaid = SUM(BillPayment.amountApplied)` | Must hold after each payment |
| `APInvoice.amountDue = APInvoice.total - APInvoice.amountPaid` | Must hold; status changes when amountDue = 0 |

---

## Reversal / Storno Data Rules

| Entity | Reversal Method | Historical Record Preserved? |
|---|---|---|
| GoodsReceipt | `status = "reversed"`, `reversedAt`, `reversedBy` set | ✅ Yes — original record updated with reversal flag |
| StockTransfer | New transfer with `reversalOfId` pointing to original | ✅ Yes — original unchanged; new reversal record created |
| StockIssue | New StockMovement with `movementType = "reversal"`, positive `quantityChange` | ✅ Yes — original movement record preserved |
| CustomerPayment | `status = "void"` | ✅ Yes — record preserved, status updated |
| BillPayment | `status = "void"` | ✅ Yes — record preserved, status updated |

**Rule**: **Never delete** `StockMovement`, `GoodsReceipt`, `AuditLog` records. Use compensating entries or status flags.

---

## Known Placeholder / Empty Models

These models exist in the schema but have no business logic attached:

| Model | Status |
|---|---|
| `Department` | Empty placeholder (`id` only) |
| `UserAction` | Empty placeholder |
| `StockAlert` | Empty placeholder |
| `Session` | Legacy auth session (not used in current custom session) |
| `VerificationToken` | Legacy auth token (not used in current flow) |
| `Permission` | Generic permission model (not used in current role guards) |

---

## Product.quantity vs StockAllocation.quantity Explanation

| Field | Scope | Updated By | Risk |
|---|---|---|---|
| `Product.quantity` | Cross-warehouse total stock | GoodsReceipt, ItemFulfillment, StockIssue | If any operation updates one but not the other, totals diverge |
| `StockAllocation.quantity` | Per-warehouse stock | GoodsReceipt (for specific warehouse), StockTransfer, StockIssue | Must match product-level total when summed |

**Recommended verification**: After any GoodsReceipt or StockIssue, add an assertion:
```
assert Product.quantity == SUM(StockAllocation.quantity WHERE productId = productId)
```
