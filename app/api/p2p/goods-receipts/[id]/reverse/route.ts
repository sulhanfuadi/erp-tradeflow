import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { reverseGoodsReceiptSchema } from "@/lib/validations";
import { reverseGoodsReceipt, serializeP2PResult } from "@/prisma/p2p";
import { createAuditLog } from "@/prisma/audit-log";

function isForbiddenRole(role: string | null | undefined): boolean {
  return role === "client" || role === "supplier";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error";
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
        module: "p2p",
        type: "goods_receipt_reverse",
        receiptNumber: reversed.receiptNumber,
        purchaseOrderId: reversed.purchaseOrderId,
        status: reversed.status,
      },
    }).catch(() => {});

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeP2PResult(reversed));
  } catch (error) {
    const message = getErrorMessage(error);
    logger.error("Error reversing goods receipt:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
