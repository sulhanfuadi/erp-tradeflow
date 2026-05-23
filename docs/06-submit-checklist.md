# 06 - Submit Checklist Final

Checklist final sebelum submit tugas mata kuliah Sistem Enterprise.

## A. Requirement Dosen (Wajib)
- [x] O2C tersedia end-to-end (`Order -> Invoice -> Delivery`)
- [x] P2P tersedia end-to-end (`PO -> Goods Receipt -> AP Invoice -> Payment`)
- [x] Inventory management tersedia (allocation, transfer, issue, reversal, stock card)

## B. Fitur Berjalan
- [x] Flow utama berjalan pada environment lokal
- [x] Anti-oversell tervalidasi
- [x] Reversal/storno tercatat sebagai audit trail

## C. Bukti Test
- [x] `docs/02-test-scenarios.md` terisi status `Pass`
- [x] Evidence TS-01..TS-08 tersedia di `docs/evidence/auto/`
- [x] Screenshot bukti tiap skenario tersedia

## D. Demo Readiness
- [x] Script demo 5–10 menit tersedia di `docs/03-demo-script.md`
- [ ] Rekam video demo 5–10 menit (manual oleh mahasiswa)
- [ ] Rehearsal minimal 2 kali sebelum presentasi

## E. Smoke Check Teknis (Pre-submit)
- [x] `npm test` lulus
- [x] `npm run test:invalidate` lulus
- [x] `npm run test:e2e` lulus (opsional rerun terakhir)

Hasil verifikasi terakhir:
- Tanggal: **Minggu, 24 Mei 2026**
- Jalankan melalui: `npm run submit:smoke`
- Ringkasan:
  - Unit test: 255 passed
  - Invalidation coverage: 238 passed
  - E2E Playwright: 8 passed

## F. Repo Hygiene
- [ ] Branch utama sudah berisi commit final
- [ ] Push ke remote sukses
- [ ] README menjelaskan scope project final
- [ ] Tidak ada file sensitif (`.env`, secret key) yang ikut ter-commit

## G. Paket Pengumpulan
- [ ] Link repository
- [ ] Dokumen skenario test (`docs/02-test-scenarios.md`)
- [ ] Bukti test (`docs/evidence/auto/`)
- [ ] Script demo (`docs/03-demo-script.md`)
- [ ] Video demo (jika diminta dosen)
