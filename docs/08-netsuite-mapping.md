# 08 - NetSuite vs Implementation Mapping

Dokumen ini dipakai untuk narasi sidang/demo agar istilah implementasi selalu konsisten dengan acuan Oracle NetSuite.

## A. Terminology Mapping

| Legacy Term | NetSuite Term | Status |
|---|---|---|
| Order | Sales Order | Aktif (compat + UI label) |
| Goods Receipt | Item Receipt | Aktif (compat + UI label) |
| AP Invoice | Vendor Bill | Aktif (compat + UI label) |
| AP Payment | Bill Payment | Aktif (compat + UI label) |
| Invoice | Customer Invoice | Aktif (compat + UI label) |

## B. O2C Process Mapping

| NetSuite Step | Endpoint Utama | Catatan |
|---|---|---|
| Sales Order | `POST /api/netsuite/sales-orders` | Validasi stock + reservation |
| Item Fulfillment | `POST /api/netsuite/item-fulfillments` | Mendukung partial/full fulfillment |
| Customer Invoice | `POST /api/netsuite/customer-invoices` | Hanya setelah fulfillment terpenuhi |
| Customer Payment | `POST /api/netsuite/customer-payments` | Partial/full + payment doc |

## C. P2P Process Mapping

| NetSuite Step | Endpoint Utama | Catatan |
|---|---|---|
| Purchase Order | `POST /api/netsuite/purchase-orders` | Draft + post via legacy patch |
| Item Receipt | `POST /api/netsuite/item-receipts` | Stok bertambah |
| Vendor Bill | `POST /api/netsuite/vendor-bills` | Dari PO/Item Receipt |
| Bill Payment | `POST /api/netsuite/bill-payments` | Partial/full + payment doc |

## D. Inventory Mapping

| Capability | Endpoint Utama | Catatan |
|---|---|---|
| Allocation | `GET/POST /api/netsuite/inventory/allocations` | Per warehouse |
| Transfer | `/api/netsuite/inventory/transfers/*` | Pending/complete/cancel/reverse |
| Issue | `/api/netsuite/inventory/issues/*` | Issue + reverse |
| Ledger | `GET /api/netsuite/inventory/ledger` | Movement + running balance |

## E. Compatibility Window (1 Sprint)

- Endpoint legacy **tetap hidup** selama masa transisi:
  - `/api/orders`, `/api/invoices`
  - `/api/p2p/purchase-orders`, `/api/p2p/goods-receipts`, `/api/p2p/ap-invoices`
  - `/api/stock-allocations/*`
- Endpoint NetSuite jadi jalur utama untuk narrative dan test evidence.

## F. Yang Belum Discope (Sengaja)

- Full NetSuite accounting engine (GL posting, period close, multi-book)
- Integrasi eksternal produksi (payment/shipping/accounting ERP) beyond mode demo
