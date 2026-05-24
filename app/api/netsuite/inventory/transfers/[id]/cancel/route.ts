import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { cancelStockTransfer } from "@/prisma/stock-allocation";

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const { id } = await params;
    const saved = await cancelStockTransfer(id, guard.session!.id);

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeTransfer(saved));
  } catch (error) {
    logger.error("Error cancelling inventory transfer:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to cancel inventory transfer",
      },
      { status: 400 },
    );
  }
}
