# 02 - Test Scenarios (TS-01 s/d TS-12)

Dokumen ini diisi dari eksekusi otomatis Playwright pada **Minggu, 24 Mei 2026** dengan command:

- `npm run test:e2e`

Status yang dipakai:
- `Pass`
- `Fail`
- `Blocked`

## Ringkasan Hasil

| ID | Domain | Scenario | Status | Evidence Path | Catatan |
|---|---|---|---|---|---|
| TS-01 | O2C | Sales Order create + reservation + oversell prevention | Pass | `docs/evidence/auto/TS-01.json`, `docs/evidence/auto/TS-01.png` | Sales order terbentuk, reservation naik, oversell prevention aktif |
| TS-02 | O2C | Item Fulfillment (partial/full) + status transition | Pass | `docs/evidence/auto/TS-02.json`, `docs/evidence/auto/TS-02.png` | Fulfillment partial + final berhasil, status SO berubah sesuai flow |
| TS-03 | O2C | Customer Invoice generation from fulfilled qty | Pass | `docs/evidence/auto/TS-03.json`, `docs/evidence/auto/TS-03.png` | Invoice hanya dibuat setelah qty fulfilled |
| TS-04 | O2C | Customer Payment partial→paid + payment doc | Pass | `docs/evidence/auto/TS-04.json`, `docs/evidence/auto/TS-04.png` | Payment doc tercatat, status invoice partial lalu paid |
| TS-05 | P2P | Purchase Order create + post | Pass | `docs/evidence/auto/TS-05.json`, `docs/evidence/auto/TS-05.png` | PO berhasil dibuat dan diposting |
| TS-06 | P2P | Item Receipt + stock increment | Pass | `docs/evidence/auto/TS-06.json`, `docs/evidence/auto/TS-06.png` | Item receipt posted, stok naik sesuai qty |
| TS-07 | P2P | Vendor Bill creation from PO/Item Receipt | Pass | `docs/evidence/auto/TS-07.json`, `docs/evidence/auto/TS-07.png` | Vendor bill berhasil dibuat dari dokumen upstream |
| TS-08 | P2P | Bill Payment partial→paid + payment doc | Pass | `docs/evidence/auto/TS-08.json`, `docs/evidence/auto/TS-08.png` | Bill payment partial lalu paid berjalan |
| TS-09 | Inventory | Transfer pending→completed→reverse | Pass | `docs/evidence/auto/TS-09.json`, `docs/evidence/auto/TS-09.png` | Transfer lifecycle lengkap dengan reversal trail |
| TS-10 | Inventory | Issue stock→reverse issue | Pass | `docs/evidence/auto/TS-10.json`, `docs/evidence/auto/TS-10.png` | Issue dan reverse issue tercatat |
| TS-11 | Inventory | Ledger integrity (movement order + running balance) | Pass | `docs/evidence/auto/TS-11.json`, `docs/evidence/auto/TS-11.png` | Ledger berurutan, running balance tersedia |
| TS-12 | Compatibility | Legacy endpoint compatibility regression | Pass | `docs/evidence/auto/TS-12.json`, `docs/evidence/auto/TS-12.png` | Endpoint lama tetap berjalan saat endpoint NetSuite aktif |

---

## Checklist Run (Hybrid Manual + Auto)

- [x] Jalankan `npm run test:e2e`
- [x] Pastikan output menunjukkan `12 passed`
- [x] Cek bukti JSON tiap TS (`TS-01` s/d `TS-12`)
- [x] Cek screenshot tiap TS (`TS-01` s/d `TS-12`)
- [x] Simpan hasil pada folder `docs/evidence/auto/`

---

## Catatan Environment Run

- Test berjalan dengan Playwright `webServer` (Next.js dev server otomatis)
- Warning non-blocking muncul untuk integrasi eksternal (ImageKit/Redis) namun **tidak memblokir flow inti O2C/P2P/Inventory**
- Skenario tetap `Pass` karena acceptance flow utama terpenuhi
