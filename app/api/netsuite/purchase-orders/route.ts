import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createPurchaseOrderSchema } from "@/lib/validations";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import {
  createPurchaseOrder,
  getPurchaseOrders,
  serializeP2PResult,
} from "@/prisma/p2p";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const rows = await getPurchaseOrders(guard.session!.id);
    return NextResponse.json(
      serializeP2PResult(
        rows.map((row) => ({
          ...row,
          netsuiteDocType: "Purchase Order",
        })),
      ),
    );
  } catch (error) {
    logger.error("Error fetching purchase orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    if (session.role !== "purchasing_manager" && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Only Purchasing Manager can create purchase orders" }, { status: 403 });
    }

    const payload = await request.json();
    const validation = createPurchaseOrderSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const created = await createPurchaseOrder(validation.data, guard.session!.id);

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeP2PResult(created), { status: 201 });
  } catch (error) {
    logger.error("Error creating purchase order:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create purchase order",
      },
      { status: 400 },
    );
  }
}
