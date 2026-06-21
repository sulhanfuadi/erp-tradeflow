import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { updateOrder } from "@/prisma/order";
import { prisma } from "@/prisma/client";
import { invalidateCache, cacheKeys } from "@/lib/cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    if (session.role !== "sales_manager" && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Only Sales Manager can approve orders" }, { status: 403 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "pending_approval") {
      return NextResponse.json({ error: "Order is not pending approval" }, { status: 400 });
    }

    const updated = await updateOrder(id, { status: "pending" }, session.id, { bypassAuth: true });
    
    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error approving sales order:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve sales order" },
      { status: 500 }
    );
  }
}
