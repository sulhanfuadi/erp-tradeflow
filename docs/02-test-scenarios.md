# 02 - Test Scenarios (TS-01 s/d TS-08)

> Isi kolom `Status`, `Evidence Path`, dan `Catatan` setelah eksekusi real.
>
> Status yang dipakai: `Pass` / `Fail` / `Blocked`.

## Ringkasan Hasil

| ID | Domain | Scenario | Status | Evidence Path | Catatan |
|---|---|---|---|---|---|
| TS-01 | O2C | Create order + reserve stock | TODO | TODO | TODO |
| TS-02 | O2C | Create invoice dari order | TODO | TODO | TODO |
| TS-03 | O2C | Delivery / shipping status update | TODO | TODO | TODO |
| TS-04 | P2P | PO create + post | TODO | TODO | TODO |
| TS-05 | P2P | GR receive + stock naik | TODO | TODO | TODO |
| TS-06 | P2P | AP invoice + payment unpaid→partial→paid | TODO | TODO | TODO |
| TS-07 | Inventory | Transfer pending→completed + reverse | TODO | TODO | TODO |
| TS-08 | Inventory | Issue + reverse + stock card movement | TODO | TODO | TODO |

---

## Detail Skenario + Checklist Run

### TS-01 — O2C: Create Order + Reservation Check
- [ ] Pilih product dengan stok tersedia
- [ ] Buat order dengan qty valid
- [ ] Verifikasi order tersimpan
- [ ] Verifikasi `reservedQuantity` bertambah
- [ ] Uji qty melebihi available (harus ditolak)

Expected:
- Order berhasil untuk qty valid
- Order gagal untuk qty di atas available

Evidence minimal:
- Screenshot form order + hasil success
- Screenshot pesan error insufficient stock

---

### TS-02 — O2C: Create Invoice dari Order
- [ ] Buka order detail yang valid
- [ ] Generate/create invoice
- [ ] Verifikasi relasi invoice ke order
- [ ] Verifikasi nilai subtotal/tax/total

Expected:
- Invoice terbuat 1:1 dengan order
- Nilai finansial konsisten

Evidence minimal:
- Screenshot order detail + invoice number
- Screenshot invoice detail

---

### TS-03 — O2C: Delivery / Shipping Status
- [ ] Proses shipping label/tracking (mode test/fallback)
- [ ] Update status order ke shipped/delivered
- [ ] Verifikasi tracking info tersimpan

Expected:
- Status order berubah sesuai aksi
- Tracking number/url terisi

Evidence minimal:
- Screenshot status sebelum/sesudah
- Screenshot tracking field

---

### TS-04 — P2P: PO Create + Post
- [ ] Pilih supplier, warehouse, dan product supplier yang sesuai
- [ ] Buat PO (draft)
- [ ] Post PO
- [ ] Verifikasi status menjadi `posted`

Expected:
- PO tersimpan dengan nomor unik
- Status berubah dari draft ke posted

Evidence minimal:
- Screenshot list PO + status

---

### TS-05 — P2P: GR Receive + Stock Naik
- [ ] Pilih PO posted
- [ ] Input qty penerimaan
- [ ] Submit goods receipt
- [ ] Verifikasi status GR `received`
- [ ] Verifikasi stock product dan stock allocation naik

Expected:
- GR berhasil dibuat
- Qty received PO dan stok bertambah

Evidence minimal:
- Screenshot list GR
- Screenshot stock sebelum/sesudah

---

### TS-06 — P2P: AP Invoice + Payment Flow
- [ ] Buat AP invoice dari PO/GR
- [ ] Verifikasi status awal `unpaid`
- [ ] Record payment parsial
- [ ] Verifikasi status `partial`
- [ ] Record pelunasan
- [ ] Verifikasi status `paid` dan amountDue = 0

Expected:
- Transisi status: unpaid → partial → paid

Evidence minimal:
- Screenshot list AP invoice sebelum/sesudah payment

---

### TS-07 — Inventory: Transfer + Reverse
- [ ] Buat transfer pending antar warehouse
- [ ] Complete transfer
- [ ] Verifikasi source turun, destination naik
- [ ] Reverse transfer
- [ ] Verifikasi balance kembali (compensating movement)

Expected:
- Transfer complete memindahkan stok
- Reverse membuat rollback terkontrol (tanpa delete histori)

Evidence minimal:
- Screenshot transfer table (pending/completed/reversed)
- Screenshot stock card entries transfer

---

### TS-08 — Inventory: Issue + Reverse + Stock Card
- [ ] Buat stock issue dari warehouse
- [ ] Verifikasi quantity berkurang
- [ ] Reverse issue
- [ ] Verifikasi quantity kembali
- [ ] Buka stock card dan cek urutan movement + running balance

Expected:
- Issue dan reverse issue keduanya tercatat
- Stock card menampilkan movement ledger lengkap

Evidence minimal:
- Screenshot issue list
- Screenshot stock card (movementType, qty change, running balance)
