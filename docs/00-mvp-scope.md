# 00 - MVP Scope (ERP TradeFlow Next.js)

## Tujuan Sprint
Menyiapkan project agar **siap dinilai dosen** untuk mata kuliah Sistem Enterprise dengan 3 domain wajib:

1. O2C (Order-to-Cash)
2. P2P (Procure-to-Pay)
3. Inventory Management

Kriteria lulus tambahan:
- Fitur berjalan end-to-end
- Bukti test terdokumentasi
- Demo siap 5–10 menit

---

## In Scope (Wajib Selesai)

### A. O2C
- Order create + validasi stock availability (anti oversell)
- Invoice create dari order
- Delivery/shipping update status order

### B. P2P
- Supplier → Purchase Order → Goods Receipt → AP Invoice → Payment Status
- Reverse Goods Receipt (storno) dengan jejak audit

### C. Inventory
- Stock allocation per warehouse
- Inter-warehouse transfer (create pending, complete, cancel, reverse)
- Stock issue + reverse issue
- Stock card / movement ledger (receipt, issue, transfer, reversal)

### D. Delivery Evidence
- Dokumen skenario TS-01 s/d TS-08
- Evidence path (screenshot/video) per skenario
- Script demo terstruktur dengan fallback

---

## Out of Scope (Ditunda)
- Fitur non-core di luar O2C/P2P/Inventory
- Polishing UI mendalam yang tidak berdampak ke penilaian
- Optimasi performa lanjutan yang tidak blocker demo

---

## Definition of Done
- Seluruh flow wajib bisa dijalankan tanpa blocker
- `npm run lint`, `npm test`, `npm run test:invalidate` lulus
- Dokumen test + demo terisi dan bisa dipakai presentasi langsung

---

## Dependency Data (Minimal)
- 1 akun admin/user internal
- 2 warehouse aktif
- 2 supplier aktif
- ≥3 produk aktif (dengan kombinasi stok low/normal)
- Data order + invoice baseline
- Data procurement baseline untuk PO/GR/AP
