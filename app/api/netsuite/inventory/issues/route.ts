import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { createStockIssueSchema } from "@/lib/validations";
import { createStockIssue, getStockIssues } from "@/prisma/stock-allocation";
import { canAdjustInventory } from "@/lib/role-helpers";

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

export async function GET(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || undefined;
    const warehouseId = searchParams.get("warehouseId") || undefined;

    const rows = await getStockIssues(undefined, {
      productId,
      warehouseId,
    });

    return NextResponse.json(rows.map(serializeMovement));
  } catch (error) {
    logger.error("Error fetching inventory issues:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory issues" },
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
      return NextResponse.json({ error: "Forbidden: Only Inventory Manager can issue stock" }, { status: 403 });
    }

    const payload = await request.json();
    const validation = createStockIssueSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const saved = await createStockIssue(validation.data, guard.session!.id);

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeMovement(saved), { status: 201 });
  } catch (error) {
    logger.error("Error creating inventory issue:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create inventory issue",
      },
      { status: 400 },
    );
  }
}
