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
| P0-01 | O2C NetSuite sequence berjalan (SO→IF→CI→CP) | Saya | P0 | DONE | Endpoint NetSuite aktif + tested |
| P0-02 | P2P NetSuite sequence berjalan (PO→IR→VB→BP) | Saya | P0 | DONE | Terminology dan flow aligned |
| P0-03 | Reverse Item Receipt (storno) berjalan | Saya | P0 | DONE | Audit trail tersedia |
| P0-04 | Inventory transfer + reverse berjalan | Saya | P0 | DONE | Pending→completed→reverse pass |
| P0-05 | Stock issue + reverse berjalan | Saya | P0 | DONE | Pass di E2E TS-10 |
| P0-06 | Stock ledger movement tampil | Saya | P0 | DONE | Pass di E2E TS-11 |

---

## P1 - Evidence & Demo

| ID | Task | PIC | Priority | Status | Note |
|---|---|---|---|---|---|
| P1-01 | Isi TS-01 s/d TS-12 (Pass/Fail) | Saya | P1 | DONE | `docs/02-test-scenarios.md` |
| P1-02 | Generate evidence JSON + screenshot | Saya | P1 | DONE | `docs/evidence/auto/` |
| P1-03 | Demo script 5–10 menit | Saya | P1 | DONE | `docs/03-demo-script.md` |
| P1-04 | Rehearsal demo run #1 | Saya | P1 | TODO | Manual oleh mahasiswa |
| P1-05 | Rehearsal demo run #2 | Saya | P1 | TODO | Manual oleh mahasiswa |

---

## Quality Gate
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run test:invalidate`
- [x] `npm run test:e2e`
- [x] Route write NetSuite mengikuti invalidation contract

---

## Catatan Risiko
- Integrasi eksternal (ImageKit/Redis/QStash) bisa memberi warning saat local run.
- Warning tersebut non-blocking untuk flow inti O2C/P2P/Inventory.
