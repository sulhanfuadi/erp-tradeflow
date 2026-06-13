import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { prisma } from "@/prisma/client";
import { serializeP2PResult } from "@/prisma/p2p";
import { invalidateAllServerCaches } from "@/lib/cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    if (session.role !== "inventory_manager" && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Only Inventory Manager can review purchase orders" }, { status: 403 });
    }

    const { id } = await params;

    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    if (po.status !== "draft") {
      return NextResponse.json({ error: "Only draft purchase orders can be reviewed" }, { status: 400 });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "reviewed", updatedAt: new Date(), updatedBy: session.id },
    });

    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeP2PResult(updated));
  } catch (error) {
    logger.error("Error reviewing purchase order:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to review purchase order" },
      { status: 500 }
    );
  }
}
