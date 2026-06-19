import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createGoodsReceiptSchema } from "@/lib/validations";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { createGoodsReceipt, getGoodsReceipts, serializeP2PResult } from "@/prisma/p2p";
import { canReceivePurchaseOrder } from "@/lib/role-helpers";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const rows = await getGoodsReceipts();
    return NextResponse.json(serializeP2PResult(rows.map((row) => ({
      ...row,
      itemReceiptNumber: row.receiptNumber,
      netsuiteStatus: row.status === "received" ? "Posted" : "Reversed",
    }))));
  } catch (error) {
    logger.error("Error fetching item receipts:", error);
    return NextResponse.json(
      { error: "Failed to fetch item receipts" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    if (!canReceivePurchaseOrder(session.role)) {
      return NextResponse.json({ error: "Forbidden: Only Inventory Manager or Warehouse Staff can create item receipts" }, { status: 403 });
    }

    const payload = await request.json();
    const validation = createGoodsReceiptSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const created = await createGoodsReceipt(validation.data, guard.session!.id);

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeP2PResult(created), { status: 201 });
  } catch (error) {
    logger.error("Error creating item receipt:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create item receipt",
      },
      { status: 400 },
    );
  }
}
