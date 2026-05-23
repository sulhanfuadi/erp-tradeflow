import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { createStockTransferSchema } from "@/lib/validations";
import { createAuditLog } from "@/prisma/audit-log";
import { createStockTransfer, getStockTransfers } from "@/prisma/stock-allocation";

function serializeTransfer(transfer: {
  id: string;
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: bigint;
  status: string;
  notes: string | null;
  userId: string;
  reversalOfId: string | null;
  reversalTransferId: string | null;
  createdAt: Date;
  completedAt: Date | null;
  reversedAt: Date | null;
  reversedBy: string | null;
}) {
  return {
    ...transfer,
    quantity: Number(transfer.quantity),
    createdAt: transfer.createdAt.toISOString(),
    completedAt: transfer.completedAt?.toISOString() ?? null,
    reversedAt: transfer.reversedAt?.toISOString() ?? null,
  };
}

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
    const productId = searchParams.get("productId") || undefined;
    const warehouseId = searchParams.get("warehouseId") || undefined;

    const transfers = await getStockTransfers(session.id);

    const filtered = transfers.filter((transfer) => {
      if (productId && transfer.productId !== productId) return false;
      if (
        warehouseId &&
        transfer.fromWarehouseId !== warehouseId &&
        transfer.toWarehouseId !== warehouseId
      ) {
        return false;
      }
      return true;
    });

    const productIds = [...new Set(filtered.map((transfer) => transfer.productId))];
    const warehouseIds = [
      ...new Set(
        filtered.flatMap((transfer) => [
          transfer.fromWarehouseId,
          transfer.toWarehouseId,
        ]),
      ),
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

    return NextResponse.json(
      filtered.map((transfer) => ({
        ...serializeTransfer(transfer),
        product: productMap.get(transfer.productId),
        fromWarehouse: warehouseMap.has(transfer.fromWarehouseId)
          ? {
              id: transfer.fromWarehouseId,
              name: warehouseMap.get(transfer.fromWarehouseId),
            }
          : undefined,
        toWarehouse: warehouseMap.has(transfer.toWarehouseId)
          ? { id: transfer.toWarehouseId, name: warehouseMap.get(transfer.toWarehouseId) }
          : undefined,
      })),
    );
  } catch (error) {
    logger.error("Error fetching stock transfers:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock transfers" },
      { status: 500 },
    );
  }
}

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

    const body = await request.json();
    const validation = createStockTransferSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 },
      );
    }

    const input = validation.data;

    const [product, sourceWarehouse, destinationWarehouse] = await Promise.all([
      prisma.product.findFirst({
        where: { id: input.productId, userId: session.id, deletedAt: null },
        select: { id: true },
      }),
      prisma.warehouse.findFirst({
        where: { id: input.fromWarehouseId, userId: session.id },
        select: { id: true },
      }),
      prisma.warehouse.findFirst({
        where: { id: input.toWarehouseId, userId: session.id },
        select: { id: true },
      }),
    ]);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!sourceWarehouse || !destinationWarehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 },
      );
    }

    const transfer = await createStockTransfer(input, session.id);

    createAuditLog({
      userId: session.id,
      action: "create",
      entityType: "warehouse",
      entityId: transfer.id,
      details: {
        module: "inventory",
        type: "stock_transfer",
        productId: transfer.productId,
        fromWarehouseId: transfer.fromWarehouseId,
        toWarehouseId: transfer.toWarehouseId,
        quantity: Number(transfer.quantity),
        status: transfer.status,
      },
    }).catch(() => {});

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeTransfer(transfer), { status: 201 });
  } catch (error) {
    logger.error("Error creating stock transfer:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create stock transfer",
      },
      { status: 400 },
    );
  }
}
