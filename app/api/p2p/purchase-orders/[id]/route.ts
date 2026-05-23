import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { updatePurchaseOrderSchema } from "@/lib/validations";
import {
  deletePurchaseOrder,
  getPurchaseOrderById,
  serializeP2PResult,
  updatePurchaseOrder,
} from "@/prisma/p2p";
import { createAuditLog } from "@/prisma/audit-log";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error";
}

function isForbiddenRole(role: string | null | undefined): boolean {
  return role === "client" || role === "supplier";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rateLimitResponse = await withRateLimit(
      request,
      defaultRateLimits.standard,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getSessionFromRequest(request);
    if (session == null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isForbiddenRole(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    const rateLimitResponse = await withRateLimit(
      request,
      defaultRateLimits.standard,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getSessionFromRequest(request);
    if (session == null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isForbiddenRole(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        module: "p2p",
        type: "purchase_order",
        poNumber: updated.poNumber,
        status: updated.status,
      },
    }).catch(() => {});

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeP2PResult(updated));
  } catch (error) {
    const message = getErrorMessage(error);
    logger.error("Error updating purchase order:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rateLimitResponse = await withRateLimit(
      request,
      defaultRateLimits.standard,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getSessionFromRequest(request);
    if (session == null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isForbiddenRole(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const deleted = await deletePurchaseOrder(id, session.id);

    createAuditLog({
      userId: session.id,
      action: "delete",
      entityType: "order",
      entityId: deleted.id,
      details: {
        module: "p2p",
        type: "purchase_order",
        poNumber: deleted.poNumber,
      },
    }).catch(() => {});

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    logger.error("Error deleting purchase order:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
