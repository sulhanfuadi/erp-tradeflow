import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { recordAPInvoicePaymentSchema } from "@/lib/validations";
import { recordAPInvoicePayment, serializeP2PResult } from "@/prisma/p2p";
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

export async function POST(
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
    const validation = recordAPInvoicePaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const updated = await recordAPInvoicePayment(id, validation.data, session.id);

    createAuditLog({
      userId: session.id,
      action: "update",
      entityType: "invoice",
      entityId: updated.id,
      details: {
        module: "p2p",
        type: "ap_invoice_payment",
        invoiceNumber: updated.invoiceNumber,
        amountPaid: updated.amountPaid,
        amountDue: updated.amountDue,
        status: updated.status,
      },
    }).catch(() => {});

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeP2PResult(updated));
  } catch (error) {
    const message = getErrorMessage(error);
    logger.error("Error recording AP invoice payment:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
