# ERP TradeFlow (BPMN 1-to-1 Alignment)

> **Tugas Mata Kuliah Sistem Enterprise**  
> Acuan proses utama: **BPMN TradeFlow & NetSuite**  
> Fokus wajib: **Order-to-Cash (O2C), Procure-to-Pay (P2P), dan Inventory Management**

Repositori ini adalah implementasi *end-to-end* aplikasi enterprise berbasis `Next.js + Prisma + MongoDB`. Sistem ini telah secara ketat diselaraskan agar memiliki kecocokan **1-to-1 dengan spesifikasi BPMN (TradeFlow_BPMN.pdf)**, baik dari segi alur proses (langkah demi langkah) maupun otorisasi peran (*Roles*).

---

## 1. Arsitektur Proses — TradeFlow BPMN Overview

Diagram di bawah menunjukkan alur **End-to-End proses TradeFlow** (Level 0) yang menjadi acuan utama implementasi.

> **BPMN Level 0 — End-to-End TradeFlow System**
![TradeFlow Level 0 — End-to-End Process](docs/evidence/bpmn/TradeFlow_Level0_ERP_EndToEnd_Process.jpg)

---

## 2. Otorisasi Peran Berbasis BPMN (Roles)

Untuk menjamin alur bisnis yang sesuai spesifikasi, sistem hanya mengakomodasi Entitas Peran (Roles) mutlak berikut ini:

| Role | Tanggung Jawab |
|---|---|
| **Sales Representative** | Membuka Sales Order baru |
| **Sales Manager** | Memberikan Approval pada Sales Order |
| **Inventory Manager** | Pick, Pack, Ship, Receive Item, Adjust & Transfer Inventory |
| **A/R Analyst** | Invoice, Customer Payment, Vendor Bill, Bill Payment |
| **Purchasing Manager** | Membuat Purchase Order |
| **Warehouse Staff** | Review Item, Update Inventory Receipt |

---

## 3. Order-to-Cash (O2C)

### BPMN Diagram — O2C Level 1

Diagram swimlane di bawah menunjukkan **alur lengkap O2C** per peran sesuai spesifikasi BPMN.

> **BPMN Level 1 — Order-to-Cash Process**
![TradeFlow O2C BPMN](docs/evidence/bpmn/TradeFlow_Level1_O2C_Order_To_Cash_Process.jpg)

---

### Step 1 — Creates a Sales Order
> [!IMPORTANT]
> **Role-Switching Required:** Anda harus login sebagai **Sales Representative** terlebih dahulu.
>
> **Actor:** Sales Representative  
> Menerima Purchase Order dari pelanggan (trigger: *Order Received*) dan memasukkan data pesanan ke dalam sistem sebagai *Sales Order*. Sistem mencegah *oversell* secara otomatis.

![O2C Step 1 — Create Sales Order (List)](docs/evidence/bpmn/O2C-01_create-sales-order.png)

*Order Details View:*  
![O2C Step 1 — Sales Order Detail](docs/evidence/bpmn/O2C-01_sales-order-detail.png)

---

### Step 2 — Review & Approve the Sales Order
> [!IMPORTANT]
> **Role-Switching Required:** Logout dari Sales Representative, kemudian login kembali sebagai **Sales Manager**.
>
> **Actor:** Sales Manager  
> Memvalidasi detail pesanan (stok tersedia, harga, kuantitas). Jika disetujui → lanjut ke fulfillment. Jika ditolak → *Order Rejected* (End Event).

*Order Details (Top View):*  
![O2C Step 2 — Sales Order Details (Top)](docs/evidence/bpmn/O2C-02_approve-sales-order-details.png)

*Approval Action (Bottom View):*  
![O2C Step 2 — Sales Order Details (Bottom - Approve Action)](docs/evidence/bpmn/O2C-02_approve-sales-order-bottom.png)

*After Approval (Status Updated to Pending Fulfillment):*  
![O2C Step 2 — Sales Order Details (Validation)](docs/evidence/bpmn/O2C-02_approve-sales-order-validation.png)

---

### Step 3 — Pick → Pack → Ship a Sales Order
> [!IMPORTANT]
> **Role-Switching Required:** Logout dari Sales Manager, kemudian login kembali sebagai **Inventory Manager**.
>
> **Actor:** Inventory Manager  
> Melakukan pemenuhan pesanan secara bertahap: **Pick → Pack → Ship**. Status inventori otomatis teralokasi dan berkurang saat setiap tahap diselesaikan.

![O2C Step 3 — Pick](docs/evidence/bpmn/O2C-03_fulfillment-pick.png)

*Pack Item:*
![O2C Step 3 — Pack](docs/evidence/bpmn/O2C-03_fulfillment-pack.png)

*Ship Item:*
![O2C Step 3 — Ship](docs/evidence/bpmn/O2C-03_fulfillment-ship.png)

---

### Step 4 — Invoice a Sales Order
> [!IMPORTANT]
> **Role-Switching Required:** Logout dari Inventory Manager, kemudian login kembali sebagai **A/R Analyst**.
>
> **Actor:** A/R Analyst  
> Menerbitkan *Customer Invoice* berdasarkan kuantitas yang telah di-ship. Invoice dikirim ke Customer (dokumen dashed line ke Customer lane).

*Generate Invoice Modal:*
![O2C Step 4 — Generate Invoice](docs/evidence/bpmn/O2C-04_generate-invoice-modal.png)

*Invoice Detail:*
![O2C Step 4 — Customer Invoice](docs/evidence/bpmn/O2C-04_invoice-detail.png)

---

### Step 5 — Accept Customer Payment
> [!IMPORTANT]
> **Role-Switching Required:** Masih login sebagai **A/R Analyst**.
>
> **Actor:** A/R Analyst  
> Mencatat penerimaan pembayaran dari pelanggan. Mendukung partial maupun full payment. Proses selesai: *Order Fulfilled and Paid* (End Event).

*Invoice Detail (Bottom):*
![O2C Step 5 — Invoice Bottom](docs/evidence/bpmn/O2C-05_invoice-bottom.png)

*Payment Modal:*
![O2C Step 5 — Payment Modal](docs/evidence/bpmn/O2C-05_payment-modal.png)

*Invoice Paid (Detail After Pay):*
![O2C Step 5 — Customer Payment](docs/evidence/bpmn/O2C-05_customer-payment.png)

---

## 4. Procure-to-Pay (P2P)

### BPMN Diagram — P2P Level 1

Diagram swimlane di bawah menunjukkan **alur lengkap P2P** per peran sesuai spesifikasi BPMN.

> **BPMN Level 1 — Procure-to-Pay Process**
![TradeFlow P2P BPMN](docs/evidence/bpmn/TradeFlow_Level1_P2P_Procure_To_Pay_Process.jpg)

---

### Step 1 — Creates Purchase Order
> [!IMPORTANT]
> **Role-Switching Required:** Logout dari A/R Analyst, kemudian login kembali sebagai **Purchasing Manager**.
>
> **Actor:** Purchasing Manager  
> Membuat *Purchase Order* atas dasar *Purchase Request* internal dan mengirimkannya ke vendor (dokumen Purchase dashed ke Vendor lane).

![P2P Step 1 — Procurement Workbench & Create PO](docs/evidence/bpmn/P2P-01_procurement-workbench.png)

---

### Step 2 — Review Item on Purchase Order
> [!IMPORTANT]
> **Role-Switching Required:** Logout dari Purchasing Manager, kemudian login kembali sebagai **Inventory Manager**.
>
> **Actor:** Inventory Manager  
> Menerima barang fisik di gudang (*Item Receipt / Good Receipt ASN*) dan memvalidasi item sesuai PO. Stok produk otomatis meningkat.

![P2P Step 2 — Item Receipt](docs/evidence/bpmn/P2P-03_item-receipt.png)

---

### Step 3 — Bill Purchase Order (Enter Vendor Bill)
> [!IMPORTANT]
> **Role-Switching Required:** Logout dari Inventory Manager, kemudian login kembali sebagai **A/R Analyst**.
>
> **Actor:** A/R Analyst  
> Memasukkan tagihan vendor (*Vendor Bill / Invoice*) ke dalam sistem, menghubungkannya ke PO dan Good Receipt. Dokumen Vendor Bill dikirim ke Vendor.

![P2P Step 3 — Vendor Bill](docs/evidence/bpmn/P2P-04_vendor-bill.png)

---

### Step 4 — Pay Vendor Bill
> [!IMPORTANT]
> **Role-Switching Required:** Masih login sebagai **A/R Analyst**.
>
> **Actor:** A/R Analyst  
> Melakukan pembayaran tagihan ke vendor. Mendukung pembayaran parsial maupun penuh. Proses selesai saat *Payment Received* (End Event).

![P2P Step 4 — Bill Payment](docs/evidence/bpmn/P2P-05_bill-payment.png)

---

## 5. Item Management (Inventory)

### BPMN Diagram — Inventory Management Level 1

Diagram swimlane di bawah menunjukkan **alur lengkap Inventory Management** per peran sesuai spesifikasi BPMN.

> **BPMN Level 1 — Inventory Management Process**
![TradeFlow Inventory BPMN](docs/evidence/bpmn/TradeFlow_Level1_IM_Inventory_Management_Process.jpg)

---

### Step 1 — Creates Purchase Order (Item Master)
> [!IMPORTANT]
> **Role-Switching Required:** Logout dari A/R Analyst, kemudian login kembali sebagai **Purchasing Manager**.
>
> **Actor:** Purchasing Manager  
> Membuat Purchase Order berdasarkan *Item Master Created*. Data Item Master tersimpan di sistem inventori.

![Inventory Step 1 — Warehouses Overview](docs/evidence/bpmn/INV-01_warehouses-list.png)

---

### Step 2 — Review Item & Update Inventory Receipt
> [!IMPORTANT]
> **Role-Switching Required:** Logout dari Purchasing Manager, kemudian login kembali sebagai **Warehouse Staff**.
>
> **Actor:** Warehouse Staff  
> Menerima barang, me-*review item* sesuai PO, lalu mengupdate *Inventory Receipt*. Stok sistem diperbarui secara otomatis.

![Inventory Step 2 — Warehouse Detail](docs/evidence/bpmn/INV-02_warehouse-detail.png)

---

### Step 3 — Perform Inventory Adjustment
> [!IMPORTANT]
> **Role-Switching Required:** Logout dari Warehouse Staff, kemudian login kembali sebagai **Inventory Manager**.
>
> **Actor:** Inventory Manager  
> Melakukan penyesuaian stok manual (*Inventory Adjustment*) untuk pengeluaran barang, koreksi stok, atau transfer antar gudang. Mendukung *Reverse* untuk koreksi.

![Inventory Step 3 — Products & Stock Levels](docs/evidence/bpmn/INV-03_products-stock.png)

---

### Step 4 — Review & Approved Adjustment
> [!IMPORTANT]
> **Role-Switching Required:** Masih login sebagai **Inventory Manager**.
>
> **Actor:** Inventory Manager  
> Memvalidasi dan menyetujui hasil adjustment inventori.

![Inventory Step 4 — Inventory Adjustment Review](docs/evidence/bpmn/INV-04_inventory-ledger.png)

---

### Step 5 — Monitoring & Analyze Inventory
> [!IMPORTANT]
> **Role-Switching Required:** Masih login sebagai **Inventory Manager**.
>
> **Actor:** Inventory Manager  
> Memantau seluruh pergerakan stok melalui *Inventory Ledger* dan laporan inventori. Proses selesai: *Inventory Managed Effectively* (End Event).

![Inventory Step 5 — Inventory Ledger & History](docs/evidence/bpmn/INV-05_suppliers.png)

---

## 6. Status Implementasi Teknis & E2E Testing

| Aspek | Status |
|---|---|
| **Framework** | Next.js 16, React 19, Prisma, MongoDB, Tailwind CSS |
| **Unit Testing** | ✅ Vitest — 324 tests lolos (validasi, PO limits, dll) |
| **E2E Testing** | ✅ Playwright — 12 Test Scenarios (TS-01 s.d. TS-12) |
| **BPMN Screenshots** | ✅ 15 screenshots per BPMN activity (O2C, P2P, Inventory) |
| **BPMN Diagrams** | ✅ 4 diagram JPG (Level 0, O2C, P2P, Inventory Management) |
| **TypeScript** | ✅ Bebas type error, strict mode |
| **Build** | ✅ Production build sukses |

---

## 7. Cara Menjalankan Project

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Setup Database (MongoDB):**
   Ubah `DATABASE_URL` di `.env` (atau jalankan MongoDB lokal via Docker/Homebrew).

3. **Migrate / Push Schema:**
   ```bash
   npx prisma db push
   ```

4. **Seed Demo Accounts (Generate User Roles):**
   ```bash
   npx tsx scripts/create-demo-accounts.ts
   ```

5. **Jalankan Aplikasi:**
   ```bash
   npm run dev
   ```

6. **Login Akun:**
   Gunakan email demo seperti `salesmgr@demo.com` atau `aranalyst@demo.com` dengan password `12345678` untuk menguji batasan hak akses sesuai dokumen BPMN.

7. **Regenerate BPMN Screenshots:**
   ```bash
   npx playwright test tests/e2e/bpmn-screenshots.spec.ts
   ```
