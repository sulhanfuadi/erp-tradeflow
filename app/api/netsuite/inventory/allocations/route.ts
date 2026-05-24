import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { createStockAllocationSchema } from "@/lib/validations";
import { getStockAllocations, upsertStockAllocation } from "@/prisma/stock-allocation";

function serializeAllocation(row: {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: bigint;
  reservedQuantity: bigint;
  userId: string;
  createdAt: Date;
  updatedAt: Date | null;
}) {
  return {
    ...row,
    quantity: Number(row.quantity),
    reservedQuantity: Number(row.reservedQuantity),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId");

    const rows = await getStockAllocations(guard.session!.id);

    const filtered = warehouseId
      ? rows.filter((row) => row.warehouseId === warehouseId)
      : rows;

    return NextResponse.json(filtered.map(serializeAllocation));
  } catch (error) {
    logger.error("Error fetching inventory allocations:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory allocations" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const payload = await request.json();
    const validation = createStockAllocationSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const input = validation.data;

    const [product, warehouse] = await Promise.all([
      prisma.product.findFirst({
        where: { id: input.productId, userId: guard.session!.id, deletedAt: null },
        select: { id: true },
      }),
      prisma.warehouse.findFirst({
        where: { id: input.warehouseId, userId: guard.session!.id },
        select: { id: true },
      }),
    ]);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    const saved = await upsertStockAllocation(input, guard.session!.id);

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeAllocation(saved), { status: 201 });
  } catch (error) {
    logger.error("Error saving inventory allocation:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save inventory allocation",
      },
      { status: 400 },
    );
  }
}
