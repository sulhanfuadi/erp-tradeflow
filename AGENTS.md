# AGENTS.md

## Project Context

- Repo: `erp-tradeflow`
- Course: `Sistem Enterprise`
- Mandatory evaluator focus: implement and demonstrate core enterprise flow end-to-end.

## Mandatory Lecturer Requirements

This project **must** cover and demonstrate all three:

1. **O2C (Order-to-Cash)**
2. **P2P (Procure-to-Pay)**
3. **Inventory Management**

## Also Mandatory for Passing

Beyond feature existence, submission must include:

1. **Working features** (end-to-end flow runs)
2. **Test evidence** (documented scenario results)
3. **Demo readiness** (stable 5–10 minute walkthrough)

## Operational Definition (Done Criteria)

### O2C

- `Order -> Invoice -> Delivery` executes without blocker.

### P2P

- `Supplier -> Purchase Order -> Goods Receipt -> AP Invoice -> Payment Status` executes without blocker.

### Inventory

- Stock movement supports receipt/issue/transfer.
- Stock card reflects movement correctly.
- Oversell prevention (reservation/availability check) is enforced.
- Reversal/storno preserves audit trail.

### Test Evidence

- At least 8 core scenarios documented with result (`Pass/Fail`) and notes.
- Screenshots/video captured for critical scenarios.

### Demo

- Run-through rehearsed at least 2 times.
- Total duration target: 5–10 minutes.

## Delivery Priority

1. Finish core flow (P0): O2C + P2P + Inventory.
2. Then reporting/access/export (P1).
3. Polish only after P0/P1 are stable.

## Scope Guardrails

- Avoid adding non-essential features before mandatory requirements are completed.
- Every change should improve one of: required flows, testability, or demo reliability.
