import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { prisma } from "@/prisma/client";
import { invalidateAllServerCaches } from "@/lib/cache";
import { canReviewPurchaseOrder } from "@/lib/role-helpers";

export async function POST(
  request: NextRequest,
) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    if (!canReviewPurchaseOrder(session.role)) {
      return NextResponse.json({ error: "Forbidden: Only Inventory Manager can review items" }, { status: 403 });
    }

    const body = await request.json();
    const { purchaseOrderId, notes, approved } = body as { purchaseOrderId: string; notes?: string; approved: boolean };

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    if (po.status !== "draft") {
      return NextResponse.json({ error: "Only draft purchase orders can be reviewed" }, { status: 400 });
    }

    const reviewRecord = await prisma.itemReview.create({
      data: {
        purchaseOrderId,
        reviewerId: session.id,
        notes: notes || null,
        approved,
        reviewedAt: new Date(),
      },
    });

    if (approved) {
      await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: "reviewed", updatedAt: new Date(), updatedBy: session.id },
      });
    }

    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(reviewRecord, { status: 201 });
  } catch (error) {
    logger.error("Error reviewing item:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to review item" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const { searchParams } = new URL(request.url);
    const purchaseOrderId = searchParams.get("purchaseOrderId");
    if (!purchaseOrderId) {
      return NextResponse.json({ error: "Missing purchaseOrderId" }, { status: 400 });
    }

    const reviews = await prisma.itemReview.findMany({
      where: { purchaseOrderId },
      include: { reviewer: { select: { name: true, email: true } } },
      orderBy: { reviewedAt: "desc" },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    logger.error("Error fetching item reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch item reviews" },
      { status: 500 }
    );
  }
}