import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { reverseGoodsReceiptSchema } from "@/lib/validations";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { reverseGoodsReceipt, serializeP2PResult } from "@/prisma/p2p";
import { createAuditLog } from "@/prisma/audit-log";
import { canReceivePurchaseOrder } from "@/lib/role-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    if (!canReceivePurchaseOrder(session.role)) {
      return NextResponse.json({ error: "Forbidden: Not authorized to reverse item receipts" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const validation = reverseGoodsReceiptSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const { id } = await params;
    const reversed = await reverseGoodsReceipt(id, validation.data, session.id);

    createAuditLog({
      userId: session.id,
      action: "update",
      entityType: "warehouse",
      entityId: reversed.id,
      details: {
        module: "netsuite",
        type: "item_receipt_reverse",
        receiptNumber: reversed.receiptNumber,
        purchaseOrderId: reversed.purchaseOrderId,
        status: reversed.status,
      },
    }).catch(() => {});

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeP2PResult(reversed));
  } catch (error) {
    logger.error("Error reversing item receipt:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reverse item receipt" },
      { status: 400 },
    );
  }
}
