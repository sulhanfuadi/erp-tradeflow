# 00 - MVP Scope (ERP TradeFlow Next.js, NetSuite-Aligned)

## Tujuan Sprint
Menyiapkan project agar **siap dinilai dosen** untuk mata kuliah Sistem Enterprise dengan tiga domain wajib:

1. O2C (Order-to-Cash)
2. P2P (Procure-to-Pay)
3. Inventory Management

Kriteria lulus tambahan:
- Fitur berjalan end-to-end
- Bukti test terdokumentasi
- Demo siap 5–10 menit

---

## In Scope (Wajib Selesai)

### A. O2C (NetSuite Terms)
- **Sales Order** create + validasi stock availability (anti oversell)
- **Item Fulfillment** (partial/full)
- **Customer Invoice** create dari fulfilled sales order
- **Customer Payment** (partial → paid)

### B. P2P (NetSuite Terms)
- Supplier → **Purchase Order** → **Item Receipt** → **Vendor Bill** → **Bill Payment**
- Reverse Item Receipt (storno) dengan jejak audit

### C. Inventory
- Stock allocation per warehouse
- Inter-warehouse transfer (create pending, complete, cancel, reverse)
- Stock issue + reverse issue
- Stock card / movement ledger (receipt, issue, transfer, reversal)

### D. Delivery Evidence
- Dokumen skenario TS-01 s/d TS-12
- Evidence path (screenshot/video) per skenario
- Script demo terstruktur dengan fallback

---

## Out of Scope (Ditunda)
- Fitur non-core di luar O2C/P2P/Inventory
- Full accounting engine setara ERP besar (GL posting, period close, multi-book)
- Polishing UI mendalam yang tidak berdampak ke penilaian

---

## Definition of Done
- Seluruh flow wajib bisa dijalankan tanpa blocker
- `npm run lint`, `npm test`, `npm run test:invalidate`, `npm run test:e2e` lulus
- Dokumen test + demo terisi dan bisa dipakai presentasi langsung

---

## Dependency Data (Minimal)
- 1 akun admin/user internal
- 2 warehouse aktif
- 1 supplier aktif
- ≥1 produk aktif dengan stok cukup
- Data Sales Order/PO baseline untuk uji fulfillment, receipt, payment, transfer, issue
