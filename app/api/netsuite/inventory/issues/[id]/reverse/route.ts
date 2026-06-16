import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { reverseStockIssueSchema } from "@/lib/validations";
import { reverseStockIssue } from "@/prisma/stock-allocation";

function serializeMovement(row: {
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
    ...row,
    quantityChange: Number(row.quantityChange),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    if (session.role !== "inventory_manager" && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Only Inventory Manager can reverse stock issue" }, { status: 403 });
    }

    const payload = await request.json().catch(() => ({}));
    const validation = reverseStockIssueSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 },
      );
    }

    const { id } = await params;
    const saved = await reverseStockIssue(id, validation.data, guard.session!.id);

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeMovement(saved));
  } catch (error) {
    logger.error("Error reversing inventory issue:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reverse inventory issue",
      },
      { status: 400 },
    );
  }
}
