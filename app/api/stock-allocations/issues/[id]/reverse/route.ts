import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { reverseStockIssueSchema } from "@/lib/validations";
import { reverseStockIssue } from "@/prisma/stock-allocation";
import { createAuditLog } from "@/prisma/audit-log";

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
    const validation = reverseStockIssueSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 },
      );
    }

    const { id } = await params;
    const reversed = await reverseStockIssue(id, validation.data, session.id);

    createAuditLog({
      userId: session.id,
      action: "update",
      entityType: "warehouse",
      entityId: reversed.id,
      details: {
        module: "inventory",
        type: "stock_issue_reverse",
        productId: reversed.productId,
        warehouseId: reversed.warehouseId,
        quantity: Number(reversed.quantityChange),
        referenceId: reversed.referenceId,
      },
    }).catch(() => {});

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeMovement(reversed));
  } catch (error) {
    logger.error("Error reversing stock issue:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reverse stock issue",
      },
      { status: 400 },
    );
  }
}
