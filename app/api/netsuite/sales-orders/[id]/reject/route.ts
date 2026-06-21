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
      return NextResponse.json({ error: "Forbidden: Only Sales Manager can reject orders" }, { status: 403 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "pending_approval") {
      return NextResponse.json({ error: "Order is not pending approval" }, { status: 400 });
    }

    // Reject order (moves to rejected state, doesn't cancel entirely but logic is similar)
    // Wait, updateOrder only releases reservation when cancelled. I should probably use `cancelled` or a new logic.
    // Let's set status to rejected. We need to release stock.
    const updated = await updateOrder(id, { status: "rejected" }, session.id, { bypassAuth: true });
    
    // Release stock manually because updateOrder doesn't know about "rejected" state releasing stock
    const orderWithItems = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (orderWithItems) {
      for (const item of orderWithItems.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            reservedQuantity: { decrement: item.quantity },
          },
        });
      }
    }

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error rejecting sales order:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reject sales order" },
      { status: 500 }
    );
  }
}
