# ROLE_ACCESS_MATRIX.md — Role and Permission Matrix
> Source of truth for role-based access. Last verified: 2026-06-16.
> Based on direct inspection of `contexts/auth-context.tsx`, `app/api/netsuite/_shared.ts`, and all `app/api/` routes.

---

## ⚠️ Critical Warning

> UI guards (hiding buttons) are NOT sufficient. API guards must also enforce authorization.
> An attacker can call any API endpoint directly without going through the UI.
> Always verify that the backend route file performs role checks, not just the frontend component.

---

## 1. Actual Role Values in System

```typescript
// User.role field (nullable String in Prisma — null treated as "user")
type UserRole = "user" | "admin" | "supplier" | "client" | "retailer"
```

**Verified from**: `types/auth.ts`, `contexts/auth-context.tsx`, `app/api/*/route.ts`

---

## 2. Current Role Access Matrix (Verified)

| Action | `admin` | `user` | `client` | `supplier` | `retailer` | Notes |
|---|---|---|---|---|---|---|
| Login / Logout | ✅ | ✅ | ✅ | ✅ | ✅ | All roles |
| View Sales Orders | ✅ | ✅ | ✅ (own only) | ✅ (supplier products only) | ✅ | Filtered by role |
| Create Sales Order | ✅ | ✅ | ✅ | ❌ | ✅ | No role guard beyond session |
| Create Item Fulfillment | ✅ | ✅ | ❌ | ❌ | ✅ | isForbiddenRole blocks client/supplier |
| Create Customer Invoice | ✅ | ✅ | ❌ | ❌ | ✅ | isForbiddenRole |
| Record Customer Payment | ✅ | ✅ | ❌ | ❌ | ✅ | isForbiddenRole |
| Create Purchase Order | ✅ | ✅ | ❌ | ❌ | ✅ | isForbiddenRole |
| Post Purchase Order | ✅ | ✅ | ❌ | ❌ | ✅ | isForbiddenRole |
| Create Item Receipt | ✅ | ✅ | ❌ | ❌ | ✅ | isForbiddenRole |
| Reverse Item Receipt | ✅ | ✅ | ❌ | ❌ | ✅ | isForbiddenRole |
| Create Vendor Bill | ✅ | ✅ | ❌ | ❌ | ✅ | isForbiddenRole |
| Record Bill Payment | ✅ | ✅ | ❌ | ❌ | ✅ | isForbiddenRole |
| Manage Stock Allocations | ✅ | ✅ | ❌ | ❌ | ✅ | Session required |
| Create/Complete/Reverse Transfer | ✅ | ✅ | ❌ | ❌ | ✅ | isForbiddenRole |
| Create/Reverse Stock Issue | ✅ | ✅ | ❌ | ❌ | ✅ | isForbiddenRole |
| View Inventory Ledger | ✅ | ✅ | ❌ | ❌ | ✅ | isForbiddenRole |
| Manage Products | ✅ | ✅ | ❌ (read via portal) | ✅ (own only) | ✅ | Mixed guards |
| Manage Warehouses | ✅ | ✅ | ❌ | ❌ | ✅ | No specific role guard verified |
| Manage Users | ✅ only | ❌ | ❌ | ❌ | ❌ | `session.role === "admin"` enforced |
| Manage System Config | ✅ only | ❌ | ❌ | ❌ | ❌ | `session.role === "admin"` enforced |
| View Audit Logs | ✅ only | ❌ | ❌ | ❌ | ❌ | Admin panel |
| Client Portal | ❌ | ❌ | ✅ | ❌ | ❌ | `session.role === "client"` required |
| Supplier Portal | ❌ | ❌ | ❌ | ✅ | ❌ | `session.role === "supplier"` required |

---

## 3. `isForbiddenRole()` Definition

```typescript
// app/api/netsuite/_shared.ts
export function isForbiddenRole(role: string | null | undefined): boolean {
  return role === "client" || role === "supplier";
}
```

This is the only granular role check used by NetSuite and P2P endpoints. It does NOT distinguish between `admin`, `user`, or `retailer`.

---

## 4. Expected ERP Role Matrix (Target State — P1 Implementation Task)

> ⚠️ These roles DO NOT EXIST in the current system. This is the recommended target after P0 gaps are fixed.

| Action | Sales Rep | Sales Mgr | Purchasing Mgr | Inventory Mgr | A/P Analyst | A/R Analyst | WH Staff | Admin |
|---|---|---|---|---|---|---|---|---|
| Create Sales Order | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve Sales Order | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Create Item Fulfillment | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Create Customer Invoice | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Record Customer Payment | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Create Purchase Order | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Post Purchase Order | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Create Item Receipt | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Reverse Item Receipt | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Create Vendor Bill | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Record Bill Payment | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Manage Transfers | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Manage Stock Issues | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| View Ledger | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| User/System Management | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 5. Current Mismatch Table

| Mismatch | Type | Impact | Recommended Fix |
|---|---|---|---|
| A/R Analyst vs A/P Analyst for vendor bills/payments | Terminology | Demo confusion | ✅ **FIXED**: Terminology updated to A/P Analyst in P1 |
| No Purchasing Manager role | Missing | Cannot demonstrate role separation | ✅ **FIXED**: `purchasing_manager` role guards added in UI and API (P1/P2) |
| No Inventory Manager role | Missing | Cannot demonstrate role separation | ✅ **FIXED**: `inventory_manager` role guards added to issue, transfer, and receipt endpoints & UI |
| No A/P Analyst role | Missing | Cannot demonstrate AP role separation | ✅ **FIXED**: `ap_analyst` role guards added to vendor bill and payment endpoints & UI |
| No Sales Manager role | Missing | No approval workflow | ✅ **FIXED**: `sales_manager` role added for Sales Order approval in UI |
| `retailer` role has no specific guards | Undefined | Behaves as internal user | Define scope or remove |

---

## 6. Authorization Enforcement Checklist

Before adding any new operation, verify both:

- [ ] **API guard**: Does the route file check `session.role` or call `isForbiddenRole()`?
- [ ] **UI guard**: Does the component hide the action button for unauthorized roles?
- [ ] **Test coverage**: Is there a negative test (TS-15) that confirms unauthorized role gets 403?

---

## 7. Demo Accounts (for Presentation)

| Account | Role | Password | Purpose |
|---|---|---|---|
| Your registered account | `admin` | (your password) | Full ERP internal access |
| `test@client.com` | `client` | `12345678` | Client portal demo |
| `test@supplier.com` | `supplier` | `12345678` | Supplier portal demo |

> Create demo accounts with: `npx tsx scripts/create-demo-accounts.ts`
