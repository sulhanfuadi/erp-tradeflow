import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { prisma } from "@/prisma/client";
import { canAdjustInventory } from "@/lib/role-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const requests = await prisma.auditLog.findMany({
      where: {
        action: "adjustment_request",
        entityType: "stock_allocation",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch adjustment requests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { productId, warehouseId, quantity, notes } = body;

    if (!productId || !warehouseId || quantity === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create a pending adjustment request in AuditLog
    const requestLog = await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "adjustment_request",
        entityType: "stock_allocation",
        details: {
          productId,
          warehouseId,
          quantity,
          notes,
          status: "pending_approval",
        },
      },
    });

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json({ id: requestLog.id, status: "pending_approval" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create adjustment request" }, { status: 500 });
  }
}
