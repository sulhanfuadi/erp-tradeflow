# 04 - Dummy Data Pack

## Tujuan
Menyiapkan data minimum agar demo O2C, P2P, dan Inventory bisa jalan tanpa hambatan.

---

## 1) Master Data

### Users
- 1 akun admin/internal (pemilik data)

### Warehouses
- `WH-MAIN` (gudang utama)
- `WH-SEC` (gudang sekunder)

### Suppliers
- `SUP-A`
- `SUP-B`

### Products
Minimal 3 produk:
1. `PRD-001` (stok normal)
2. `PRD-002` (stok menengah)
3. `PRD-003` (stok rendah, untuk uji anti-oversell)

Rekomendasi qty awal:
- `PRD-001`: 40
- `PRD-002`: 25
- `PRD-003`: 5

---

## 2) Baseline O2C
- 1 order pending (qty kecil, valid)
- 1 invoice terkait order tersebut
- 1 order untuk uji over-qty (ditolak oleh validasi)

---

## 3) Baseline P2P
- 1 PO draft (siap di-post saat demo)
- 1 PO posted (siap dibuat GR)
- 1 AP invoice unpaid (untuk demo payment partial/paid)

---

## 4) Baseline Inventory
- Stock allocation untuk 2 warehouse pada minimal 2 produk
- 1 transfer pending
- 1 transfer completed (opsional, untuk quick reverse demo)
- 1 stock issue record (opsional, untuk reverse issue demo)

---

## 5) Checklist Readiness
- [ ] Semua supplier aktif
- [ ] Semua warehouse aktif
- [ ] Produk tidak soft deleted
- [ ] Ada stok available untuk transfer/issue
- [ ] Tidak ada data referensi putus (PO/GR/AP/order)
