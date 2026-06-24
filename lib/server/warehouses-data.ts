/**
 * Server-side data fetching for warehouses page SSR
 * Only import this from server code (e.g. app/warehouses/page.tsx).
 */

import { prisma } from "@/prisma/client";

/** Warehouse shape for list page (dates as ISO strings for hydration) */
export type WarehouseForPage = {
  id: string;
  name: string;
  address: string | null;
  type: string | null;
  status: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string;
  updatedBy: string | null;
};

/**
 * Fetch warehouses for the given user
 */
import { isInternalRole } from "@/lib/role-helpers";

export async function getWarehousesForUser(
  userId: string,
  role?: string | null,
): Promise<WarehouseForPage[]> {
  const isInternal = role ? isInternalRole(role) : false;
  
  const warehouses = await prisma.warehouse.findMany({
    where: isInternal ? {} : { userId },
  });

  return warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    address: w.address ?? null,
    type: w.type ?? null,
    status: w.status,
    userId: w.userId,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt?.toISOString() ?? null,
    createdBy: w.createdBy,
    updatedBy: w.updatedBy ?? null,
  }));
}
