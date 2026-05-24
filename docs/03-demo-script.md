# 03 - Demo Script (5–10 Menit, NetSuite Terms)

## Tujuan Demo
Membuktikan tiga domain wajib dosen berjalan sesuai acuan proses NetSuite:
- O2C: **Sales Order → Item Fulfillment → Customer Invoice → Customer Payment**
- P2P: **Purchase Order → Item Receipt → Vendor Bill → Bill Payment**
- Inventory Management: allocation, transfer, issue, ledger, reversal trail

Bukti otomatis tersedia di:
- `docs/evidence/auto/TS-01..TS-12.json`
- `docs/evidence/auto/TS-01..TS-12.png`

## Persiapan Sebelum Demo
- [ ] Jalankan quick smoke:
  - `npm run lint`
  - `npm test`
  - `npm run test:invalidate`
  - `npm run test:e2e`
- [ ] Login dengan akun internal/admin
- [ ] Data master siap (supplier, warehouse, produk)
- [ ] Buka tab utama:
  - `/orders` (Sales Orders)
  - `/invoices` (Customer Invoices)
  - `/procurement` (P2P Workbench)
  - `/warehouses/[id]` (Inventory)

---

## Alur Presentasi

### 0:00 – 2:30 | O2C (NetSuite Sequence)
1. Buka **Sales Orders** (`/orders`).
2. Tunjukkan pembuatan sales order + anti oversell.
3. Tunjukkan **Item Fulfillment** (partial/full).
4. Tunjukkan **Customer Invoice**.
5. Tunjukkan **Customer Payment** partial lalu paid.

Evidence referensi:
- `TS-01`, `TS-02`, `TS-03`, `TS-04`

### 2:30 – 5:00 | P2P (NetSuite Sequence)
1. Buka **Procure-to-Pay** (`/procurement`).
2. Tunjukkan create + post **Purchase Order**.
3. Tunjukkan **Item Receipt** (stok naik).
4. Tunjukkan create **Vendor Bill**.
5. Tunjukkan **Bill Payment** partial lalu paid.

Evidence referensi:
- `TS-05`, `TS-06`, `TS-07`, `TS-08`

### 5:00 – 8:00 | Inventory Management
1. Buka warehouse detail (`/warehouses/[id]`).
2. Tunjukkan transfer pending → completed → reverse.
3. Tunjukkan issue → reverse issue.
4. Tunjukkan stock ledger (movement + running balance).

Evidence referensi:
- `TS-09`, `TS-10`, `TS-11`

### 8:00 – 9:00 | Compatibility Proof
1. Jelaskan endpoint legacy tetap aktif (compatibility 1 sprint).
2. Tunjukkan bukti TS-12.

Evidence referensi:
- `TS-12`

---

## Fallback Saat Demo
- Jika warning ImageKit/Redis muncul, jelaskan sebagai integrasi non-blocking.
- Jika satu klik UI tidak responsif, validasi melalui evidence JSON/PNG yang sudah pass.
- Jika waktu mepet, tampilkan ringkasan `docs/02-test-scenarios.md` + 2 bukti detail per domain.

---

## Closing (30 detik)
- Scope wajib dosen terpenuhi: O2C + P2P + Inventory.
- Flow berjalan end-to-end dengan istilah NetSuite.
- Bukti test 12 skenario lengkap dan demo siap 5–10 menit.
