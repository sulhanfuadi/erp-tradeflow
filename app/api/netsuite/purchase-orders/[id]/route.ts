import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { updatePurchaseOrderSchema } from "@/lib/validations";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import {
  deletePurchaseOrder,
  getPurchaseOrderById,
  serializeP2PResult,
  updatePurchaseOrder,
} from "@/prisma/p2p";
import { createAuditLog } from "@/prisma/audit-log";
import { canCreatePurchaseOrder, canReviewPurchaseOrder } from "@/lib/role-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    const { id } = await params;
    const purchaseOrder = await getPurchaseOrderById(id, session.id);

    if (purchaseOrder == null) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(serializeP2PResult(purchaseOrder));
  } catch (error) {
    logger.error("Error fetching purchase order detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase order" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    // Using canCreatePurchaseOrder as the gate for updating, though realistically might need more granular logic
    if (!canCreatePurchaseOrder(session.role) && !canReviewPurchaseOrder(session.role)) {
      return NextResponse.json({ error: "Forbidden: Not authorized to update purchase orders" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updatePurchaseOrderSchema.safeParse({ id, ...body });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const updated = await updatePurchaseOrder(id, validation.data, session.id);

    createAuditLog({
      userId: session.id,
      action: "update",
      entityType: "order",
      entityId: updated.id,
      details: {
        module: "netsuite",
        type: "purchase_order",
        poNumber: updated.poNumber,
        status: updated.status,
      },
    }).catch(() => {});

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeP2PResult(updated));
  } catch (error) {
    logger.error("Error updating purchase order:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update purchase order",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    if (!canCreatePurchaseOrder(session.role)) {
      return NextResponse.json({ error: "Forbidden: Not authorized to delete purchase orders" }, { status: 403 });
    }

    const { id } = await params;
    const deleted = await deletePurchaseOrder(id, session.id);

    createAuditLog({
      userId: session.id,
      action: "delete",
      entityType: "order",
      entityId: deleted.id,
      details: {
        module: "netsuite",
        type: "purchase_order",
        poNumber: deleted.poNumber,
      },
    }).catch(() => {});

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting purchase order:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete purchase order",
      },
      { status: 400 },
    );
  }
}
