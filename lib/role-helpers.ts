import type { User } from "@/types";

type RoleCarrier = User | string | null | undefined;

function normalizeRole(roleOrUser: RoleCarrier): string | undefined {
  if (typeof roleOrUser === "string") return roleOrUser;
  return roleOrUser?.role;
}

export const isAdmin = (roleOrUser: RoleCarrier): boolean => {
  return normalizeRole(roleOrUser) === "admin";
};

export const isInternalRole = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return (
    role === "admin" ||
    role === "sales_representative" ||
    role === "sales_rep" ||
    role === "sales_manager" ||
    role === "purchasing_manager" ||
    role === "inventory_manager" ||
    role === "warehouse_staff" ||
    role === "ap_analyst" ||
    role === "ar_analyst"
  );
};

export const canCreatePurchaseOrder = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return role === "purchasing_manager" || role === "admin";
};

export const canReviewPurchaseOrder = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return role === "inventory_manager" || role === "admin";
};

export const canReceivePurchaseOrder = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return role === "inventory_manager" || role === "warehouse_staff" || role === "admin";
};

export const canCreateVendorBill = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return role === "ar_analyst" || role === "ap_analyst" || role === "admin";
};

export const canApproveVendorBill = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return role === "ar_analyst" || role === "ap_analyst" || role === "admin";
};

export const canPayVendorBill = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return role === "ar_analyst" || role === "ap_analyst" || role === "admin";
};

export const canManageItemMaster = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return role === "purchasing_manager" || role === "admin";
};

export const canUpdateInventoryReceipt = (roleOrUser: RoleCarrier): boolean => {
  return canReceivePurchaseOrder(roleOrUser);
};

export const canAdjustInventory = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return role === "inventory_manager" || role === "admin";
};

export const canApproveInventoryAdjustment = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return role === "inventory_manager" || role === "admin";
};

export const canMonitorInventory = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return role === "inventory_manager" || role === "warehouse_staff" || role === "admin";
};

export const isSalesManager = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return role === "sales_manager" || role === "admin";
};

export const isSalesRep = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return role === "sales_rep" || role === "sales_representative" || role === "admin";
};

export const isPurchasingManager = canCreatePurchaseOrder;

export const isInventoryManager = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return role === "inventory_manager" || role === "admin";
};

export const isApAnalyst = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return role === "ap_analyst" || role === "admin";
};

export const isArAnalyst = (roleOrUser: RoleCarrier): boolean => {
  const role = normalizeRole(roleOrUser);
  return role === "ar_analyst" || role === "admin";
};

export const isClient = (roleOrUser: RoleCarrier): boolean => {
  return normalizeRole(roleOrUser) === "client";
};

export const isSupplier = (roleOrUser: RoleCarrier): boolean => {
  return normalizeRole(roleOrUser) === "supplier";
};


export type NavigationItem = { label: string; path: string; hasDropdown: false };

export function getNavigationItemsForRole(roleOrUser: RoleCarrier): NavigationItem[] {
  const role = normalizeRole(roleOrUser) ?? "user";
  const all: NavigationItem[] = [
    { label: "Dashboard", path: "/", hasDropdown: false },
    { label: "Products", path: "/products", hasDropdown: false },
    { label: "Sales Orders", path: "/orders", hasDropdown: false },
    { label: "Customer Invoices", path: "/invoices", hasDropdown: false },
    { label: "Procure-to-Pay", path: "/procurement", hasDropdown: false },
    { label: "Categories", path: "/categories", hasDropdown: false },
    { label: "Suppliers", path: "/suppliers", hasDropdown: false },
    { label: "Warehouses", path: "/warehouses", hasDropdown: false },
    { label: "Business Insights", path: "/business-insights", hasDropdown: false },
    { label: "Admin Panel", path: "/admin", hasDropdown: false },
  ];
  if (role === "admin") return all;
  if (role === "client") return [
    { label: "Client Portal", path: "/client", hasDropdown: false },
    { label: "Browse Products", path: "/products", hasDropdown: false },
    { label: "My Sales Orders", path: "/orders", hasDropdown: false },
    { label: "My Customer Invoices", path: "/invoices", hasDropdown: false },
  ];
  if (role === "supplier") return [
    { label: "Supplier Portal", path: "/supplier", hasDropdown: false },
    { label: "My Products", path: "/products", hasDropdown: false },
    { label: "View Sales Orders", path: "/orders", hasDropdown: false },
  ];
  if (role === "sales_representative" || role === "sales_rep") return all.filter((i) => ["/", "/products", "/orders"].includes(i.path));
  if (role === "sales_manager") return all.filter((i) => ["/", "/orders", "/invoices"].includes(i.path));
  if (role === "inventory_manager") return all.filter((i) => ["/", "/products", "/orders", "/warehouses", "/procurement"].includes(i.path));
  if (role === "purchasing_manager") return all.filter((i) => ["/", "/products", "/suppliers", "/procurement"].includes(i.path));
  if (role === "warehouse_staff") return all.filter((i) => ["/", "/products", "/warehouses"].includes(i.path));
  if (role === "ar_analyst") return all.filter((i) => ["/", "/invoices", "/procurement"].includes(i.path));
  if (role === "ap_analyst") return all.filter((i) => ["/", "/procurement"].includes(i.path));
  return all.filter((i) => ["/", "/products", "/orders"].includes(i.path));
}

export function canAccessRoute(roleOrUser: RoleCarrier, pathname: string): boolean {
  const role = normalizeRole(roleOrUser) ?? "user";
  if (pathname === "/login" || pathname === "/register") return true;
  if (role === "admin") return true;
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/client")) return role === "client";
  if (pathname.startsWith("/supplier")) return role === "supplier";
  if (pathname.startsWith("/business-insights")) return false;
  if (pathname.startsWith("/procurement")) return role === "purchasing_manager" || role === "ar_analyst" || role === "ap_analyst" || role === "inventory_manager";
  if (pathname.startsWith("/warehouses")) return role === "inventory_manager" || role === "warehouse_staff";
  if (pathname.startsWith("/suppliers")) return role === "purchasing_manager";
  if (pathname.startsWith("/invoices")) return role === "sales_manager" || role === "ar_analyst" || role === "client";
  if (pathname.startsWith("/orders")) return role === "sales_representative" || role === "sales_rep" || role === "sales_manager" || role === "inventory_manager" || role === "client" || role === "supplier";
  if (pathname.startsWith("/products")) return role !== "ar_analyst" && role !== "ap_analyst";
  if (pathname.startsWith("/categories")) return isInternalRole(roleOrUser);
  if (pathname.startsWith("/support-tickets")) return true;
  if (pathname.startsWith("/settings")) return true;
  return true;
}
