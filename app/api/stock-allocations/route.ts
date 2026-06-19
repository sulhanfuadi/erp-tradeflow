/**
 * Stock Allocations API Route Handler
 * GET /api/stock-allocations — list stock allocations
 * POST /api/stock-allocations — create/upsert stock allocation
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import {
  getStockAllocations,
  upsertStockAllocation,
  getWarehouseStockSummary,
} from "@/prisma/stock-allocation";
import { prisma } from "@/prisma/client";
import { mergeProductListWhere } from "@/lib/products/product-query";
import { getCache, setCache, cacheKeys } from "@/lib/cache";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { createStockAllocationSchema } from "@/lib/validations";
import type { StockAllocation, WarehouseStockSummary } from "@/types";
import { canAdjustInventory } from "@/lib/role-helpers";

function transform(
  r: Awaited<ReturnType<typeof getStockAllocations>>[number],
  productMap: Map<string, { name: string; sku: string }>,
  warehouseMap: Map<string, string>,
): StockAllocation {
  return {
    id: r.id,
    productId: r.productId,
    warehouseId: r.warehouseId,
    quantity: Number(r.quantity),
    reservedQuantity: Number(r.reservedQuantity),
    userId: r.userId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt?.toISOString() ?? null,
    product: productMap.has(r.productId)
      ? { id: r.productId, ...productMap.get(r.productId)! }
      : undefined,
    warehouse: warehouseMap.has(r.warehouseId)
      ? { id: r.warehouseId, name: warehouseMap.get(r.warehouseId)! }
      : undefined,
  };
}

/**
 * GET /api/stock-allocations
 * Query params:
 *   ?summary=true for warehouse summary
 *   ?warehouseId=xxx for stock in specific warehouse
 */
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
    const summary = searchParams.get("summary") === "true";
    const warehouseId = searchParams.get("warehouseId");

    if (summary) {
      // Return warehouse stock summary
      const cacheKey = cacheKeys.stockAllocation.summary("internal");
      const cached = await getCache<WarehouseStockSummary[]>(cacheKey);
      if (cached) return NextResponse.json(cached);

      const result = await getWarehouseStockSummary();
      await setCache(cacheKey, result, 300);
      return NextResponse.json(result);
    }

    // Get allocations - either by warehouse or all
    let allocations;
    let cacheKey: string;

    if (warehouseId) {
      const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId },
      });
      if (!warehouse) {
        return NextResponse.json(
          { error: "Warehouse not found" },
          { status: 404 },
        );
      }

      cacheKey = cacheKeys.stockAllocation.byWarehouse(warehouseId);
      const cached = await getCache<StockAllocation[]>(cacheKey);
      if (cached) return NextResponse.json(cached);

      allocations = await prisma.stockAllocation.findMany({
        where: { warehouseId },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Return all stock allocations
      cacheKey = cacheKeys.stockAllocation.list(session.id);
      const cached = await getCache<StockAllocation[]>(cacheKey);
      if (cached) return NextResponse.json(cached);

      allocations = await getStockAllocations();
    }

    // Fetch products and warehouses for context
    const productIds = [...new Set(allocations.map((a) => a.productId))];
    const warehouseIds = [...new Set(allocations.map((a) => a.warehouseId))];

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
      products.map((p) => [p.id, { name: p.name, sku: p.sku }]),
    );
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));

    const result = allocations.map((a) =>
      transform(a, productMap, warehouseMap),
    );
    await setCache(cacheKey, result, 300);

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error fetching stock allocations:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock allocations" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/stock-allocations
 * Create or update stock allocation
 */
export async function POST(request: NextRequest) {
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

    if (!canAdjustInventory(session.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only Inventory Manager can adjust inventory" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validation = createStockAllocationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 },
      );
    }

    const data = validation.data;

    const product = await prisma.product.findFirst({
      where: mergeProductListWhere({
        id: data.productId,
      }),
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: data.warehouseId },
    });
    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 },
      );
    }

    const allocation = await upsertStockAllocation(data, session.id);

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    const result: StockAllocation = {
      id: allocation.id,
      productId: allocation.productId,
      warehouseId: allocation.warehouseId,
      quantity: Number(allocation.quantity),
      reservedQuantity: Number(allocation.reservedQuantity),
      userId: allocation.userId,
      createdAt: allocation.createdAt.toISOString(),
      updatedAt: allocation.updatedAt?.toISOString() ?? null,
      product: { id: product.id, name: product.name, sku: product.sku },
      warehouse: { id: warehouse.id, name: warehouse.name },
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error("Error creating stock allocation:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create stock allocation",
      },
      { status: 500 },
    );
  }
}
