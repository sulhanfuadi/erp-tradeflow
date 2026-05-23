# 01 - Business Flows

## 1) O2C (Order-to-Cash)

### Actor
- Admin / internal user

### Preconditions
- Product dan warehouse sudah tersedia
- Stock tersedia (available >= qty order)

### Flow
1. User membuat order baru.
2. Sistem validasi available stock (quantity - reserved).
3. Sistem reserve stock untuk order pending.
4. User membuat invoice dari order.
5. User memproses delivery/shipping (label/tracking/status).
6. Status order bergerak sesuai proses (pending → processing/shipped/delivered).

### Output
- Order + invoice tercatat
- Status pengiriman tercatat
- Stock/reservation konsisten

---

## 2) P2P (Procure-to-Pay)

### Actor
- Admin / internal user

### Preconditions
- Supplier aktif
- Warehouse aktif
- Produk milik supplier tersedia

### Flow
1. User membuat Purchase Order (draft).
2. User post PO (status posted).
3. User create Goods Receipt dari PO.
4. Sistem menaikkan stock product + stock allocation warehouse.
5. User create AP Invoice berdasarkan PO/GR.
6. User record payment AP invoice (unpaid → partial → paid).
7. Jika diperlukan, user reverse Goods Receipt (storno).
8. Sistem rollback stock + received qty PO dan simpan audit trail.

### Output
- Dokumen PO/GR/AP tersimpan
- Stock masuk dari receipt
- Payment status AP terpantau
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
2. Sistem update allocation + stock movement adjustment.

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

### Flow D: Stock Card
1. User buka stock card per warehouse (opsional filter product).
2. Sistem tampilkan kronologi movement + quantity change + running balance.

### Output
- Receipt / issue / transfer / reversal tercatat
- Stock card merefleksikan histori pergerakan
- Audit trail tersedia untuk koreksi (storno)
