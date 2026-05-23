# 07 - Local Runbook (One Command)

Dokumen ini untuk menjalankan environment validasi submit secara konsisten.

## Prasyarat
- Docker aktif
- Node.js + npm terpasang
- Dependensi repo sudah ter-install (`npm install`)

## One Command (disarankan sebelum submit)
Jalankan perintah ini dari root repo:

```bash
npm run submit:smoke
```

Perintah di atas akan:
1. Menyalakan MongoDB container dengan replica set (`rs0`) jika belum aktif
2. Inisialisasi replica set bila perlu
3. `prisma db push`
4. Menjalankan `npm test`
5. Menjalankan `npm run test:invalidate`
6. Menjalankan `npm run test:e2e`

## Jika Hanya Ingin Demo App Manual
```bash
DATABASE_URL='mongodb://127.0.0.1:27017/erp_tradeflow?replicaSet=rs0' npm run dev -- --port 3100
```

Lalu buka:
- `http://127.0.0.1:3100/orders`
- `http://127.0.0.1:3100/procurement`
- `http://127.0.0.1:3100/warehouses`

## Cleanup (opsional)
```bash
docker rm -f erp-tradeflow-mongo
```
