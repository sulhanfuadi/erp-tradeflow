import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { reverseStockTransfer } from "@/prisma/stock-allocation";
import { reverseStockTransferSchema } from "@/lib/validations";
import { createAuditLog } from "@/prisma/audit-log";

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const body = await request.json().catch(() => ({}));
    const validation = reverseStockTransferSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 },
      );
    }

    const { id } = await params;
    const transfer = await reverseStockTransfer(id, validation.data, session.id);

    createAuditLog({
      userId: session.id,
      action: "update",
      entityType: "warehouse",
      entityId: transfer.id,
      details: {
        module: "inventory",
        type: "stock_transfer_reverse",
        productId: transfer.productId,
        fromWarehouseId: transfer.fromWarehouseId,
        toWarehouseId: transfer.toWarehouseId,
        quantity: Number(transfer.quantity),
        status: transfer.status,
        reversalOfId: transfer.reversalOfId,
      },
    }).catch(() => {});

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeTransfer(transfer));
  } catch (error) {
    logger.error("Error reversing stock transfer:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reverse stock transfer",
      },
      { status: 400 },
    );
  }
}
