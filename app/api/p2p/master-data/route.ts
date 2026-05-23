import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { getSuppliersForAdminIncludingDemo } from "@/prisma/supplier";

function isForbiddenRole(role: string | null | undefined): boolean {
  return role === "client" || role === "supplier";
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await withRateLimit(
      request,
      defaultRateLimits.standard,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getSessionFromRequest(request);
    if (session == null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isForbiddenRole(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [suppliers, warehouses, products] = await Promise.all([
      getSuppliersForAdminIncludingDemo(session.id),
      prisma.warehouse.findMany({
        where: { userId: session.id, status: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        where: { userId: session.id, deletedAt: null },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          quantity: true,
          supplierId: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      suppliers: suppliers.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
      })),
      warehouses,
      products: products.map((product) => ({
        ...product,
        quantity: Number(product.quantity),
      })),
    });
  } catch (error) {
    logger.error("Error fetching P2P master data:", error);
    return NextResponse.json(
      { error: "Failed to fetch P2P master data" },
      { status: 500 },
    );
  }
}
