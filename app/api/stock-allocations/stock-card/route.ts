import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { getStockMovements } from "@/prisma/stock-allocation";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await withRateLimit(
      request,
      defaultRateLimits.standard,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const productId = searchParams.get("productId") || undefined;
    const limitParam = Number(searchParams.get("limit") || "200");
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(500, Math.trunc(limitParam)))
      : 200;

    const movements = await getStockMovements(undefined, {
      warehouseId,
      productId,
      limit,
    });

    const sorted = [...movements].sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );

    const productIds = [...new Set(sorted.map((movement) => movement.productId))];
    const warehouseIds = [
      ...new Set(sorted.map((movement) => movement.warehouseId)),
    ];

    const [products, warehouses] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true },
      }),
      prisma.warehouse.findMany({
        where: { id: { in: warehouseIds } },
        select: { id: true, name: true },
      }),
    ]);

    const productMap = new Map(
      products.map((product) => [
        product.id,
        { id: product.id, name: product.name, sku: product.sku },
      ]),
    );
    const warehouseMap = new Map(
      warehouses.map((warehouse) => [warehouse.id, warehouse.name]),
    );

    const runningBalances = new Map<string, number>();

    const stockCard = sorted.map((movement) => {
      const key = `${movement.productId}:${movement.warehouseId}`;
      const previous = runningBalances.get(key) ?? 0;
      const quantityChange = Number(movement.quantityChange);
      const next = previous + quantityChange;
      runningBalances.set(key, next);

      return {
        id: movement.id,
        productId: movement.productId,
        warehouseId: movement.warehouseId,
        userId: movement.userId,
        movementType: movement.movementType,
        quantityChange,
        referenceType: movement.referenceType,
        referenceId: movement.referenceId,
        notes: movement.notes,
        createdAt: movement.createdAt.toISOString(),
        runningBalance: next,
        product: productMap.get(movement.productId),
        warehouse: warehouseMap.has(movement.warehouseId)
          ? { id: movement.warehouseId, name: warehouseMap.get(movement.warehouseId) }
          : undefined,
      };
    });

    return NextResponse.json(stockCard);
  } catch (error) {
    logger.error("Error fetching stock card:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock card" },
      { status: 500 },
    );
  }
}
