# ERP TradeFlow (Next.js)

> **Tugas Mata Kuliah Sistem Enterprise**  
> Acuan proses utama: **Oracle NetSuite**  
> Fokus wajib: **O2C, P2P, dan Inventory Management**

---

## 1) Konteks Project

Repository ini adalah implementasi aplikasi enterprise berbasis `Next.js + Prisma + MongoDB` untuk memenuhi requirement penilaian mata kuliah **Sistem Enterprise**.

Project ini **bukan clone penuh NetSuite**, tetapi menyelaraskan **proses bisnis dan terminologi utama** NetSuite untuk scope akademik.

### Fokus Penilaian Dosen

- **O2C (Order-to-Cash)**
- **P2P (Procure-to-Pay)**
- **Inventory Management**
- Fitur berjalan end-to-end
- Bukti test terdokumentasi
- Demo siap 5–10 menit

---

## 2) NetSuite-Oriented Process (Acuan Utama)

### O2C (NetSuite Sequence)

`Sales Order -> Item Fulfillment -> Customer Invoice -> Customer Payment`

### P2P (NetSuite Sequence)

`Purchase Order -> Item Receipt -> Vendor Bill -> Bill Payment`

### Inventory (NetSuite-Oriented Coverage)

- Receipt impact ke stock
- Issue/Fulfillment impact ke stock
- Transfer antar warehouse
- Reversal trail (storno/audit), tanpa menghapus histori movement

---

## 3) Status Implementasi Saat Ini

### O2C

- Sales Order creation + oversell prevention
- Item Fulfillment partial/full
- Customer Invoice generation dari fulfilled order
- Customer Payment partial -> paid

### P2P

- Purchase Order create + post
- Item Receipt + stock increment
- Vendor Bill creation (from PO/Item Receipt)
- Bill Payment partial -> paid
- Reverse Item Receipt (audit trail)

### Inventory

- Stock allocation per warehouse
- Transfer pending -> completed -> reverse
- Stock issue -> reverse issue
- Stock ledger (movement log + running balance)

---

## 4) Evidence & Dokumen Submission

Semua paket bukti ada di folder `docs/`:

- Scope MVP: `docs/00-mvp-scope.md`
- Business flows: `docs/01-business-flows.md`
- Test scenarios TS-01..TS-12: `docs/02-test-scenarios.md`
- Demo script 5–10 menit: `docs/03-demo-script.md`
- Dummy data pack: `docs/04-dummy-data-pack.md`
- Implementation board: `docs/05-implementation-plan.md`
- Submit checklist: `docs/06-submit-checklist.md`
- Local runbook: `docs/07-local-runbook.md`
- NetSuite mapping: `docs/08-netsuite-mapping.md`

Evidence otomatis (JSON + screenshot):
- `docs/evidence/auto/TS-01..TS-12`

---

## 5) Tech Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Prisma`
- `MongoDB`
- `TanStack React Query`
- `Playwright` (E2E)
- `Vitest` (unit/invalidation checks)

---

## 6) Menjalankan Project Lokal

### Prasyarat

- Node.js 20+
- npm
- MongoDB (disarankan replica set `rs0` untuk parity test)

### Install

```bash
npm install
```

### Jalankan app (manual)

```bash
DATABASE_URL='mongodb://127.0.0.1:27017/erp_tradeflow?replicaSet=rs0' npm run dev -- --port 3100
```

Buka:
- `http://127.0.0.1:3100/orders`
- `http://127.0.0.1:3100/procurement`
- `http://127.0.0.1:3100/warehouses`

---

## 7) Validasi Sebelum Submit

### One command (direkomendasikan)

```bash
npm run submit:smoke
```

Command ini menjalankan smoke pipeline submit (test + e2e) sesuai `docs/07-local-runbook.md`.

### Manual command set

```bash
npm run lint
npm test
npm run test:invalidate
npm run test:e2e
```

---

## 8) Endpoint Strategy (Compatibility Window)

Selama sprint alignment:

- Endpoint **legacy** tetap aktif untuk menjaga flow existing.
- Endpoint **NetSuite-style** ditambahkan paralel di `/api/netsuite/*` sebagai jalur utama narrative/testing.

Contoh endpoint NetSuite:

- `/api/netsuite/sales-orders`
- `/api/netsuite/item-fulfillments`
- `/api/netsuite/customer-invoices`
- `/api/netsuite/customer-payments`
- `/api/netsuite/purchase-orders`
- `/api/netsuite/item-receipts`
- `/api/netsuite/vendor-bills`
- `/api/netsuite/bill-payments`
- `/api/netsuite/inventory/allocations`
- `/api/netsuite/inventory/transfers/*`
- `/api/netsuite/inventory/issues/*`
- `/api/netsuite/inventory/ledger`

---

## 9) Catatan Akademik Penting

- Project ini disusun untuk **tujuan pembelajaran dan penilaian kampus**.
- Acuan proses utama adalah **Oracle NetSuite** pada level **process & terminology alignment**.
- Scope ini **tidak mencakup** full NetSuite accounting engine (GL posting, period close, multi-book).

---

## 10) Ringkasan Kesiapan Submit

Checklist cepat:

- [x] O2C berjalan end-to-end
- [x] P2P berjalan end-to-end
- [x] Inventory management berjalan end-to-end
- [x] Bukti test TS-01..TS-12 lengkap
- [x] Demo script 5–10 menit siap

Final verifikasi detail lihat: `docs/06-submit-checklist.md`
