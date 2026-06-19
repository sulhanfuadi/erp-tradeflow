import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { createStockIssueSchema } from "@/lib/validations";
import { createAuditLog } from "@/prisma/audit-log";
import { createStockIssue, getStockIssues } from "@/prisma/stock-allocation";
import { canAdjustInventory } from "@/lib/role-helpers";

function serializeMovement(movement: {
  id: string;
  productId: string;
  warehouseId: string;
  userId: string;
  movementType: string;
  quantityChange: bigint;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    ...movement,
    quantityChange: Number(movement.quantityChange),
    createdAt: movement.createdAt.toISOString(),
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
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const productId = searchParams.get("productId") || undefined;

    const issues = await getStockIssues(undefined, {
      warehouseId,
      productId,
    });

    const productIds = [...new Set(issues.map((issue) => issue.productId))];
    const warehouseIds = [...new Set(issues.map((issue) => issue.warehouseId))];

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
      issues.map((issue) => ({
        ...serializeMovement(issue),
        product: productMap.get(issue.productId),
        warehouse: warehouseMap.has(issue.warehouseId)
          ? { id: issue.warehouseId, name: warehouseMap.get(issue.warehouseId) }
          : undefined,
      })),
    );
  } catch (error) {
    logger.error("Error fetching stock issues:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock issues" },
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

    if (!canAdjustInventory(session.role)) {
      return NextResponse.json(
        { error: "Forbidden: Inventory Manager role required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validation = createStockIssueSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 },
      );
    }

    const input = validation.data;

    const [product, warehouse] = await Promise.all([
      prisma.product.findFirst({
        where: { id: input.productId, deletedAt: null },
        select: { id: true },
      }),
      prisma.warehouse.findFirst({
        where: { id: input.warehouseId },
        select: { id: true },
      }),
    ]);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    const issue = await createStockIssue(input, session.id);

    createAuditLog({
      userId: session.id,
      action: "create",
      entityType: "warehouse",
      entityId: issue.id,
      details: {
        module: "inventory",
        type: "stock_issue",
        productId: issue.productId,
        warehouseId: issue.warehouseId,
        quantity: Math.abs(Number(issue.quantityChange)),
      },
    }).catch(() => {});

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeMovement(issue), { status: 201 });
  } catch (error) {
    logger.error("Error creating stock issue:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create stock issue",
      },
      { status: 400 },
    );
  }
}
