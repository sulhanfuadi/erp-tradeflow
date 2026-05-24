# 01 - Business Flows (NetSuite Reference)

## 1) O2C (Order-to-Cash)

### Actor
- Admin / internal user

### Preconditions
- Product dan warehouse sudah tersedia
- Stock tersedia (available >= qty order)

### Flow (NetSuite Sequence)
1. User membuat **Sales Order**.
2. Sistem validasi available stock (quantity - reserved).
3. Sistem reserve stock untuk sales order.
4. User membuat **Item Fulfillment** (partial/full) dari line sales order.
5. Sistem mengurangi stock sesuai qty fulfilled.
6. User membuat **Customer Invoice** dari sales order yang sudah fulfilled.
7. User melakukan **Customer Payment** (partial atau full).
8. Sistem update payment status invoice + sales order.

### Output
- Sales Order, Item Fulfillment, Customer Invoice, Customer Payment tercatat
- Stock/reservation konsisten
- Status transaksi mengikuti sequence NetSuite

---

## 2) P2P (Procure-to-Pay)

### Actor
- Admin / internal user

### Preconditions
- Supplier aktif
- Warehouse aktif
- Produk milik supplier tersedia

### Flow (NetSuite Sequence)
1. User membuat **Purchase Order** (draft).
2. User post PO (status posted).
3. User membuat **Item Receipt** dari PO.
4. Sistem menaikkan stock product + stock allocation warehouse.
5. User membuat **Vendor Bill** berdasarkan PO/Item Receipt.
6. User record **Bill Payment** (partial/full).
7. Jika diperlukan, user reverse Item Receipt (storno).
8. Sistem rollback stock + received qty PO dan simpan audit trail.

### Output
- Dokumen PO/Item Receipt/Vendor Bill/Bill Payment tersimpan
- Stock masuk dari receipt
- Payment status vendor bill terpantau
- Reversal tercatat tanpa menghapus histori

---

## 3) Inventory Management

### Actor
- Admin / internal user

### Preconditions
- Product + warehouse tersedia
- Stock allocation ada untuk operasi transfer/issue

### Flow A: Stock Allocation
1. User set/update quantity alokasi produk ke warehouse.
2. Sistem update allocation.

### Flow B: Transfer
1. User create transfer pending (source → destination).
2. User complete transfer.
3. Sistem decrement source, increment destination, dan catat movement.
4. Jika salah, user reverse transfer.
5. Sistem buat compensating movement (bukan overwrite histori).

### Flow C: Issue
1. User create stock issue dari warehouse.
2. Sistem decrement allocation + product quantity.
3. Jika perlu koreksi, user reverse issue.
4. Sistem increment kembali stok dan catat reversal.

### Flow D: Stock Card / Ledger
1. User buka stock card per warehouse (opsional filter product).
2. Sistem tampilkan kronologi movement + quantity change + running balance.

### Output
- Receipt/issue/transfer/reversal tercatat
- Stock card merefleksikan histori pergerakan
- Audit trail tersedia untuk koreksi (storno)

---

## Terminology Mapping (Legacy ↔ NetSuite)
- `Order` ↔ `Sales Order`
- `Goods Receipt` ↔ `Item Receipt`
- `AP Invoice` ↔ `Vendor Bill`
