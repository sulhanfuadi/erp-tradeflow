import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { createStockTransferSchema } from "@/lib/validations";
import { createStockTransfer, getStockTransfers } from "@/prisma/stock-allocation";
import { canAdjustInventory } from "@/lib/role-helpers";

function serializeTransfer(row: {
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
    ...row,
    quantity: Number(row.quantity),
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    reversedAt: row.reversedAt?.toISOString() ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || undefined;
    const warehouseId = searchParams.get("warehouseId") || undefined;

    const rows = await getStockTransfers();

    const filtered = rows.filter((row) => {
      if (productId && row.productId !== productId) return false;
      if (
        warehouseId &&
        row.fromWarehouseId !== warehouseId &&
        row.toWarehouseId !== warehouseId
      ) {
        return false;
      }
      return true;
    });

    return NextResponse.json(filtered.map(serializeTransfer));
  } catch (error) {
    logger.error("Error fetching inventory transfers:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory transfers" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    if (!canAdjustInventory(session.role)) {
      return NextResponse.json({ error: "Forbidden: Only Inventory Manager can transfer stock" }, { status: 403 });
    }

    const payload = await request.json();
    const validation = createStockTransferSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const created = await createStockTransfer(validation.data, guard.session!.id);

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeTransfer(created), { status: 201 });
  } catch (error) {
    logger.error("Error creating inventory transfer:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create inventory transfer",
      },
      { status: 400 },
    );
  }
}
