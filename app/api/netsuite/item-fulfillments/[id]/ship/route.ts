import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { prisma } from "@/prisma/client";
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
      return NextResponse.json({ error: "Forbidden: Only Inventory Manager can ship orders" }, { status: 403 });
    }

    const { id } = await params;

    const fulfillment = await prisma.itemFulfillment.findUnique({ 
      where: { id }, 
      include: { order: { include: { items: true } } } 
    });

    if (!fulfillment) {
      return NextResponse.json({ error: "Fulfillment not found" }, { status: 404 });
    }

    if (fulfillment.status !== "packed") {
      return NextResponse.json({ error: "Fulfillment is not in packed status" }, { status: 400 });
    }

    // Update fulfillment status
    const updated = await prisma.itemFulfillment.update({
      where: { id },
      data: { status: "shipped", updatedAt: new Date(), updatedBy: session.id },
    });

    // Check if order is fully shipped now
    const order = fulfillment.order;
    const totalQty = order.items.reduce((sum, item) => sum + Number(item.quantity), 0);
    const fulfilledQty = order.items.reduce((sum, item) => sum + Number(item.fulfilledQuantity ?? 0), 0);
    
    // We update the order status to shipped if fully shipped
    const nextStatus = fulfilledQty >= totalQty ? "shipped" : "processing";
    
    await prisma.order.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          shippedAt: nextStatus === "shipped" ? new Date() : order.shippedAt,
          updatedAt: new Date(),
          updatedBy: session.id,
        },
    });

    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error shipping fulfillment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to ship fulfillment" },
      { status: 500 }
    );
  }
}
