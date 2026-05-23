# 03 - Demo Script (5–10 Menit)

## Tujuan Demo
Membuktikan 3 domain wajib dosen berjalan:
- O2C
- P2P
- Inventory Management

## Persiapan Sebelum Demo
- [ ] Login dengan akun internal/admin
- [ ] Data master sudah siap (supplier, warehouse, produk)
- [ ] Minimal ada 1 order baseline dan 1 PO baseline
- [ ] Browser tab untuk:
  - `/orders`, `/invoices`
  - `/procurement`
  - `/warehouses/[id]`

---

## Alur Presentasi (Rekomendasi)

### 0:00 – 1:30 | O2C Snapshot
1. Buka Orders.
2. Tunjukkan create order + validasi stock (anti oversell).
3. Buka Invoice terkait order.
4. Tunjukkan status delivery/tracking di order detail.

Poin nilai:
- Order–Invoice keterkaitan jelas
- Kontrol ketersediaan stok aktif

---

### 1:30 – 4:30 | P2P End-to-End
1. Buka Procurement page.
2. Tunjukkan daftar PO lalu create/post PO.
3. Tunjukkan create Goods Receipt dan efek stok naik.
4. Tunjukkan create AP Invoice.
5. Record payment sampai status paid.
6. Tunjukkan reverse goods receipt (storno) untuk audit trail.

Poin nilai:
- Flow PO → GR → AP → Payment jalan
- Reversal tidak hapus histori

---

### 4:30 – 8:00 | Inventory Management
1. Buka Warehouse Detail.
2. Tunjukkan Stock Allocation form.
3. Buat transfer pending lalu complete.
4. Lakukan reverse transfer.
5. Buat stock issue lalu reverse issue.
6. Tunjukkan stock card (movement ledger + running balance).

Poin nilai:
- Receipt/issue/transfer/reversal tercatat
- Stock card jadi bukti histori movement

---

### 8:00 – 9:00 | Bukti Test
1. Buka `docs/02-test-scenarios.md`.
2. Tunjukkan TS-01 sampai TS-08 dan status terbaru.
3. Sebutkan lokasi evidence (screenshot/video path).

---

## Fallback Jika Ada Kendala
- Jika integrasi eksternal shipping lambat, tampilkan status update manual di order detail.
- Jika satu skenario gagal, lanjutkan skenario lain dan tunjukkan log/error handling.
- Prioritaskan pembuktian flow inti di atas UI polish.

---

## Closing (30 detik)
- Project sudah mencakup O2C, P2P, dan Inventory.
- Fitur berjalan end-to-end.
- Bukti test dan script demo siap untuk evaluasi.
