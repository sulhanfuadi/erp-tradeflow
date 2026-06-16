import type { User } from "@/types";

export const isAdmin = (user: User | null | undefined): boolean => {
  return user?.role === "admin";
};

export const isSalesManager = (user: User | null | undefined): boolean => {
  return user?.role === "sales_manager" || isAdmin(user);
};

export const isSalesRep = (user: User | null | undefined): boolean => {
  return user?.role === "sales_rep" || isAdmin(user);
};

export const isPurchasingManager = (user: User | null | undefined): boolean => {
  return user?.role === "purchasing_manager" || isAdmin(user);
};

export const isInventoryManager = (user: User | null | undefined): boolean => {
  return user?.role === "inventory_manager" || isAdmin(user);
};

export const isApAnalyst = (user: User | null | undefined): boolean => {
  return user?.role === "ap_analyst" || isAdmin(user);
};

export const isArAnalyst = (user: User | null | undefined): boolean => {
  return user?.role === "ar_analyst" || isAdmin(user);
};

export const isClient = (user: User | null | undefined): boolean => {
  return user?.role === "client";
};

export const isSupplier = (user: User | null | undefined): boolean => {
  return user?.role === "supplier";
};
