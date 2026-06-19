import { describe, expect, it } from "vitest";
import { canAccessRoute, getNavigationItemsForRole } from "./role-helpers";

describe("role route access", () => {
  it("blocks Sales Representative from procurement and warehouses", () => {
    expect(canAccessRoute("sales_representative", "/procurement")).toBe(false);
    expect(canAccessRoute("sales_representative", "/warehouses")).toBe(false);
  });

  it("allows BPMN owners to access their routes", () => {
    expect(canAccessRoute("purchasing_manager", "/procurement")).toBe(true);
    expect(canAccessRoute("inventory_manager", "/warehouses")).toBe(true);
    expect(canAccessRoute("ar_analyst", "/procurement")).toBe(true);
  });

  it("allows admin to access all protected ERP routes", () => {
    expect(canAccessRoute("admin", "/procurement")).toBe(true);
    expect(canAccessRoute("admin", "/warehouses")).toBe(true);
    expect(canAccessRoute("admin", "/admin")).toBe(true);
  });

  it("filters navigation by role", () => {
    expect(getNavigationItemsForRole("sales_representative").map((item) => item.path)).toEqual([
      "/",
      "/products",
      "/orders",
    ]);
    expect(getNavigationItemsForRole("purchasing_manager").map((item) => item.path)).toContain("/procurement");
    expect(getNavigationItemsForRole("warehouse_staff").map((item) => item.path)).not.toContain("/procurement");
  });
});
