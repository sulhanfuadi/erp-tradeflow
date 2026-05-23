# 05 - Implementation Plan / Task Board

## Status Legend
- `TODO`
- `DOING`
- `DONE`
- `BLOCKED`

---

## P0 - Mandatory Flows

| ID | Task | PIC | Priority | Status | Note |
|---|---|---|---|---|---|
| P0-01 | O2C order + invoice + delivery berjalan | Saya | P0 | TODO | |
| P0-02 | P2P PO → GR → AP → Payment berjalan | Saya | P0 | TODO | |
| P0-03 | Reverse GR (storno) berjalan | Saya | P0 | TODO | |
| P0-04 | Inventory transfer + reverse berjalan | Saya | P0 | TODO | |
| P0-05 | Stock issue + reverse berjalan | Saya | P0 | TODO | |
| P0-06 | Stock card movement ledger tampil | Saya | P0 | TODO | |

---

## P1 - Evidence & Demo

| ID | Task | PIC | Priority | Status | Note |
|---|---|---|---|---|---|
| P1-01 | Isi TS-01 s/d TS-08 (Pass/Fail) | Saya | P1 | TODO | docs/02-test-scenarios.md |
| P1-02 | Ambil screenshot/video evidence | Saya | P1 | TODO | folder evidence lokal |
| P1-03 | Rehearsal demo run #1 | Saya | P1 | TODO | target ≤ 10 menit |
| P1-04 | Rehearsal demo run #2 | Saya | P1 | TODO | perbaiki bagian yang macet |

---

## Quality Gate (Wajib Hijau)
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run test:invalidate`
- [ ] Semua route write baru punya invalidation server

---

## Catatan Risiko
- Integrasi eksternal (shipping/payment) bisa flaky → siapkan fallback mode test/manual.
- Data dummy tidak konsisten bisa bikin demo macet → pakai checklist `04-dummy-data-pack.md`.
