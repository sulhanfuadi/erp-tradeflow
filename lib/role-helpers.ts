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
