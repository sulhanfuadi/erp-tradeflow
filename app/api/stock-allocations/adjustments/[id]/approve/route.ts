import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { prisma } from "@/prisma/client";
import { canApproveInventoryAdjustment } from "@/lib/role-helpers";
import { upsertStockAllocation } from "@/prisma/stock-allocation";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!canApproveInventoryAdjustment(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestLog = await prisma.auditLog.findUnique({ where: { id } });
    if (!requestLog || requestLog.action !== "adjustment_request") {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const details = requestLog.details as any;
    if (details.status !== "pending_approval") {
      return NextResponse.json({ error: "Request is not pending" }, { status: 400 });
    }

    // Process the actual stock allocation update
    await upsertStockAllocation(
      {
        productId: details.productId,
        warehouseId: details.warehouseId,
        quantity: details.quantity,
      },
      session.id,
    );

    // Update status in AuditLog
    await prisma.auditLog.update({
      where: { id },
      data: {
        details: {
          ...details,
          status: "approved",
          approvedBy: session.id,
          approvedAt: new Date().toISOString(),
        },
      },
    });

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json({ success: true, status: "approved" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to approve adjustment" }, { status: 500 });
  }
}
