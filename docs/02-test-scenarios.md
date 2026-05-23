# 02 - Test Scenarios (TS-01 s/d TS-08)

Dokumen ini sudah diisi berdasarkan eksekusi otomatis Playwright pada **Minggu, 24 Mei 2026**.

Status yang dipakai:
- `Pass`
- `Fail`
- `Blocked`

## Ringkasan Hasil

| ID | Domain | Scenario | Status | Evidence Path | Catatan |
|---|---|---|---|---|---|
| TS-01 | O2C | Create order + reserve stock | Pass | `docs/evidence/auto/TS-01.json`, `docs/evidence/auto/TS-01.png` | Order berhasil, reserved naik, oversell prevention aktif |
| TS-02 | O2C | Create invoice dari order | Pass | `docs/evidence/auto/TS-02.json`, `docs/evidence/auto/TS-02.png` | Invoice 1:1 terhadap order berhasil dibuat |
| TS-03 | O2C | Delivery / shipping status update | Pass | `docs/evidence/auto/TS-03.json`, `docs/evidence/auto/TS-03.png` | Status shipped/delivered + tracking tersimpan |
| TS-04 | P2P | PO create + post | Pass | `docs/evidence/auto/TS-04.json`, `docs/evidence/auto/TS-04.png` | PO berhasil dibuat dan diposting |
| TS-05 | P2P | GR receive + stock naik | Pass | `docs/evidence/auto/TS-05.json`, `docs/evidence/auto/TS-05.png` | GR received, quantity produk bertambah |
| TS-06 | P2P | AP invoice + payment unpaid→partial→paid | Pass | `docs/evidence/auto/TS-06.json`, `docs/evidence/auto/TS-06.png` | Payment flow lengkap + reverse GR sukses |
| TS-07 | Inventory | Transfer pending→completed + reverse | Pass | `docs/evidence/auto/TS-07.json`, `docs/evidence/auto/TS-07.png` | Transfer lifecycle lengkap dengan reversal trail |
| TS-08 | Inventory | Issue + reverse + stock card movement | Pass | `docs/evidence/auto/TS-08.json`, `docs/evidence/auto/TS-08.png` | Issue/reversal tercatat di stock card |

---

## Detail Skenario + Checklist Run

### TS-01 — O2C: Create Order + Reservation Check
- [x] Pilih product dengan stok tersedia
- [x] Buat order dengan qty valid
- [x] Verifikasi order tersimpan
- [x] Verifikasi `reservedQuantity` bertambah
- [x] Uji qty melebihi available (harus ditolak)

Expected:
- Order berhasil untuk qty valid
- Order gagal untuk qty di atas available

Evidence:
- `docs/evidence/auto/TS-01.json`
- `docs/evidence/auto/TS-01.png`

---

### TS-02 — O2C: Create Invoice dari Order
- [x] Buka order detail yang valid
- [x] Generate/create invoice
- [x] Verifikasi relasi invoice ke order
- [x] Verifikasi nilai subtotal/tax/total

Expected:
- Invoice terbuat 1:1 dengan order
- Nilai finansial konsisten

Evidence:
- `docs/evidence/auto/TS-02.json`
- `docs/evidence/auto/TS-02.png`

---

### TS-03 — O2C: Delivery / Shipping Status
- [x] Proses update tracking/shipping
- [x] Update status order ke shipped/delivered
- [x] Verifikasi tracking info tersimpan

Expected:
- Status order berubah sesuai aksi
- Tracking number/url terisi

Evidence:
- `docs/evidence/auto/TS-03.json`
- `docs/evidence/auto/TS-03.png`

---

### TS-04 — P2P: PO Create + Post
- [x] Pilih supplier, warehouse, dan product supplier yang sesuai
- [x] Buat PO (draft)
- [x] Post PO
- [x] Verifikasi status menjadi `posted`

Expected:
- PO tersimpan dengan nomor unik
- Status berubah dari draft ke posted

Evidence:
- `docs/evidence/auto/TS-04.json`
- `docs/evidence/auto/TS-04.png`

---

### TS-05 — P2P: GR Receive + Stock Naik
- [x] Pilih PO posted
- [x] Input qty penerimaan
- [x] Submit goods receipt
- [x] Verifikasi status GR `received`
- [x] Verifikasi stock product dan stock allocation naik

Expected:
- GR berhasil dibuat
- Qty received PO dan stok bertambah

Evidence:
- `docs/evidence/auto/TS-05.json`
- `docs/evidence/auto/TS-05.png`

---

### TS-06 — P2P: AP Invoice + Payment Flow
- [x] Buat AP invoice dari PO/GR
- [x] Verifikasi status awal `unpaid`
- [x] Record payment parsial
- [x] Verifikasi status `partial`
- [x] Record pelunasan
- [x] Verifikasi status `paid` dan amountDue = 0
- [x] Reverse goods receipt untuk validasi reversal trail

Expected:
- Transisi status: unpaid → partial → paid
- Reversal receipt tercatat tanpa delete histori

Evidence:
- `docs/evidence/auto/TS-06.json`
- `docs/evidence/auto/TS-06.png`

---

### TS-07 — Inventory: Transfer + Reverse
- [x] Buat transfer pending antar warehouse
- [x] Complete transfer
- [x] Verifikasi source turun, destination naik
- [x] Reverse transfer
- [x] Verifikasi balance kembali (compensating movement)

Expected:
- Transfer complete memindahkan stok
- Reverse membuat rollback terkontrol (tanpa delete histori)

Evidence:
- `docs/evidence/auto/TS-07.json`
- `docs/evidence/auto/TS-07.png`

---

### TS-08 — Inventory: Issue + Reverse + Stock Card
- [x] Buat stock issue dari warehouse
- [x] Verifikasi quantity berkurang
- [x] Reverse issue
- [x] Verifikasi quantity kembali
- [x] Buka stock card dan cek urutan movement + running balance

Expected:
- Issue dan reverse issue keduanya tercatat
- Stock card menampilkan movement ledger lengkap

Evidence:
- `docs/evidence/auto/TS-08.json`
- `docs/evidence/auto/TS-08.png`
