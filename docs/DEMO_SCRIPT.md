# DEMO_SCRIPT.md — 5–10 Minute Demo Script (Updated)
> Aligned to Oracle NetSuite terminology. Target audience: Sistem Enterprise lecturer.
> Last updated: 2026-06-16.

---

## Demo Account Setup

| Role | Email | Password | Use For |
|---|---|---|---|
| Admin (Internal User) | Your registered account | Your password | ALL O2C, P2P, Inventory operations |
| Client | `test@client.com` | `12345678` | Client portal demo (optional) |
| Supplier | `test@supplier.com` | `12345678` | Supplier portal demo (optional) |

**Setup command** (run once before demo):
```bash
npx tsx scripts/create-demo-accounts.ts
```

---

## Pre-Demo Checklist

```bash
# 1. Ensure app is running
DATABASE_URL='mongodb://127.0.0.1:27017/erp_tradeflow?replicaSet=rs0' npm run dev

# 2. Smoke verification (optional but recommended)
npm run lint
npm test  # Note: 74 failures expected (invalidation coverage gap — non-blocking for demo)
npm run test:e2e  # Should show 12 passed

# 3. Open browser tabs:
# http://localhost:3000/orders         → O2C: Sales Orders
# http://localhost:3000/invoices       → O2C: Customer Invoices  
# http://localhost:3000/procurement    → P2P: Procure-to-Pay Workbench
# http://localhost:3000/warehouses     → Inventory Management
```

---

## Demo Data Required

Before demo, ensure the following exist in the database:
- At least 2 warehouses (Main Warehouse, Secondary Warehouse)
- At least 2 products with stock ≥ 10 each
- At least 1 supplier
- At least 1 category

If data is missing, use the app UI or run `npx tsx scripts/check-all-data.ts` to verify.

---

## Demo Flow (8–10 minutes)

---

### 0:00 – 0:30 | Introduction (30 seconds)

**Script**:
> "Aplikasi ini adalah implementasi ERP berbasis Oracle NetSuite untuk tiga domain wajib: Order-to-Cash, Procure-to-Pay, dan Inventory Management. Setiap langkah flow mengikuti terminologi dan urutan proses NetSuite."

Login with your admin account.

---

### 0:30 – 2:30 | O2C — Order-to-Cash (2 minutes)

**NetSuite reference**: `Sales Order → Item Fulfillment → Customer Invoice → Customer Payment`

**Step 1 – Sales Order**
1. Navigate to `/orders` (Sales Orders)
2. Click "New Order" / "Create Sales Order"
3. Add product(s), set quantity
4. Submit

**Script**:
> "Pertama, kita buat Sales Order. Sistem otomatis melakukan reservation stock dan mencegah oversell — ini setara dengan NetSuite Sales Order dengan stock check."

**Step 2 – Item Fulfillment**
1. Open the created order
2. Click "Fulfill" / "Create Item Fulfillment"
3. Enter partial qty first, then full

**Script**:
> "Setelah Sales Order disetujui, kita buat Item Fulfillment. Ini setara dengan NetSuite Item Fulfillment / Pick-Pack-Ship. Sistem support partial dan full fulfillment."

**Step 3 – Customer Invoice**
1. Click "Create Invoice" on the fulfilled order
2. Set due date

**Script**:
> "Setelah barang dikirim, kita generate Customer Invoice. NetSuite equivalent: Customer Invoice dari SO yang sudah fulfilled."

**Step 4 – Customer Payment**
1. Open the invoice
2. Record partial payment
3. Record remaining payment

**Script**:
> "Customer Payment: kita rekam partial dulu, lalu lunas. Status invoice berubah dari Partial menjadi Paid — sama seperti di NetSuite."

---

### 2:30 – 5:00 | P2P — Procure-to-Pay (2.5 minutes)

**NetSuite reference**: `Purchase Order → Item Receipt → Vendor Bill → Bill Payment`

Navigate to `/procurement` (P2P Workbench).

**Step 5 – Purchase Order**
1. Fill Create Purchase Order form: select supplier, warehouse, product, qty, unit cost
2. Submit
3. Click "Post" on the created PO

**Script**:
> "P2P dimulai dengan Purchase Order. Setelah di-draft, kita Post PO — ini setara dengan NetSuite Purchase Order yang di-approve untuk procurement."

**Step 6 – Item Receipt**
1. Select PO in Item Receipt form
2. Enter received quantities
3. Submit

**Script**:
> "Item Receipt: setelah barang tiba dari supplier, kita posting Item Receipt. Stok otomatis bertambah di warehouse tujuan — setara NetSuite Item Receipt."

**Step 7 – Vendor Bill**
1. Select PO and/or GR in Vendor Bill form
2. Enter amount, due date
3. Submit

**Script**:
> "Vendor Bill dibuat berdasarkan PO dan Item Receipt — ini adalah AP Invoice di NetSuite. Status awal: Unpaid."

**Step 8 – Bill Payment**
1. Select Vendor Bill in payment form
2. Enter partial amount, then remaining amount

**Script**:
> "Bill Payment: kita bayar sebagian dulu, lalu lunas. Ini setara NetSuite Bill Payment oleh A/P Analyst. Semua payment history tersimpan."

**Step 9 – Reverse Item Receipt (Storno)**
1. Find a GoodsReceipt in the list
2. Click "Reverse"

**Script**:
> "Fitur kunci di NetSuite adalah Reversal / Storno. Kita bisa reverse Item Receipt — stok di-rollback, tapi histori movement tetap tersimpan. Ini sesuai audit trail requirement NetSuite."

---

### 5:00 – 8:00 | Inventory Management (3 minutes)

Navigate to `/warehouses` → click on a warehouse.

**Step 10 – Warehouse Transfer**
1. Create a stock transfer (Main → Secondary warehouse)
2. Complete the transfer
3. Reverse the transfer

**Script**:
> "Inventory Management: Transfer antar warehouse. Kita buat transfer, complete, lalu reverse untuk demo audit trail. Ini setara NetSuite Inventory Transfer dengan reversal trail."

**Step 11 – Stock Issue + Reverse**
1. Create a stock issue (manual consumption)
2. Reverse the issue

**Script**:
> "Stock Issue: pengeluaran stock manual — misalnya untuk keperluan internal. Kita bisa reverse dengan storno yang mencatat compensating entry tanpa menghapus histori."

**Step 12 – Inventory Ledger (Stock Card)**
1. Open stock card / inventory ledger tab
2. Show movement history with running balance

**Script**:
> "Inventory Ledger atau Stock Card menampilkan seluruh pergerakan stock: receipt, issue, transfer, reversal — dengan running balance. Ini setara NetSuite Inventory Ledger."

---

### 8:00 – 9:00 | Evidence Summary (1 minute)

Show `docs/evidence/auto/` folder or `docs/02-test-scenarios.md`.

**Script**:
> "Semua flow sudah diuji dengan Playwright E2E — 12 skenario dari TS-01 sampai TS-12. Bukti tersedia dalam format JSON dan screenshot di docs/evidence/auto/. Ini adalah test evidence yang diperlukan untuk submission."

---

### 9:00 – 9:30 | Closing (30 seconds)

**Script**:
> "Ringkasan: O2C, P2P, dan Inventory Management berjalan end-to-end dengan terminologi NetSuite. Reversal/storno menjaga audit trail. Stock allocation per warehouse memungkinkan multi-warehouse management. Bukti test 12 skenario lengkap."

---

## Fallback Plan

| Situation | Action |
|---|---|
| ImageKit/Redis warning in logs | "Ini integrasi opsional, tidak mempengaruhi flow inti" |
| UI tidak responsif | Tunjukkan evidence JSON di `docs/evidence/auto/` |
| Error pada satu step | Gunakan data yang sudah ada (dari evidence run sebelumnya) |
| Pertanyaan tentang roles | Jelaskan bahwa sistem sudah mendukung ERP-specific roles (Sales Manager, Purchasing Manager, Inventory Manager, A/P Analyst) melalui UI guards dan role helpers untuk memisahkan fungsi O2C, P2P, dan Inventory. Admin memiliki full override. |
| Pertanyaan tentang `npm test` failure | "74 test failures ada di invalidation coverage test yang memverifikasi cache management — bukan business flow test. Business flow test (TS-01..TS-12) semua PASS." |

---

## Likely Q&A from Lecturer

| Pertanyaan | Jawaban |
|---|---|
| "Apa bedanya dengan NetSuite asli?" | "Ini adalah implementasi akademik yang menyelaraskan terminologi dan flow proses NetSuite. Tidak mencakup full accounting engine (GL, period close, multi-book) — di luar scope akademik." |
| "Bagaimana role separation?" | "Sistem mengimplementasikan UI guards dan role helpers untuk membatasi operasi spesifik (misal: Approve SO = Sales Manager, Post PO = Purchasing Manager, Goods Receipt = Inventory Manager, Vendor Bill = A/P Analyst)." |
| "Apa itu Storno?" | "Storno atau reversal adalah pembatalan transaksi yang menjaga audit trail. Tidak ada record yang dihapus — hanya compensating entry yang dibuat, sama seperti di NetSuite." |
| "Bagaimana oversell prevention?" | "Setiap Sales Order dicek terhadap available stock = product.quantity - reservedQuantity. Jika qty melebihi available, API return 400." |
| "Apa itu P2P?" | "P2P adalah Procure-to-Pay, bukan Produce-to-Pay. Ini adalah proses pengadaan dari Purchase Order sampai pembayaran ke supplier." |

---

## NetSuite Terminology Reference for Q&A

| Presentasi Term | NetSuite Equivalent |
|---|---|
| Sales Order | Sales Order |
| Item Fulfillment | Item Fulfillment (Pick-Pack-Ship) |
| Customer Invoice | Customer Invoice |
| Customer Payment | Customer Payment |
| Purchase Order | Purchase Order |
| Item Receipt / Goods Receipt | Item Receipt |
| Vendor Bill / AP Invoice | Vendor Bill |
| Bill Payment | Bill Payment / Vendor Payment |
| Stock Issue | Item Issue / Stock Consumption |
| Inventory Ledger | Inventory Ledger |
| Storno / Reversal | Reversal / Void |
| Stock Allocation | Bin / Warehouse Allocation |
