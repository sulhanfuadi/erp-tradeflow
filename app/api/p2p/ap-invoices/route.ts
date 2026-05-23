import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { createAPInvoiceSchema } from "@/lib/validations";
import {
  createAPInvoice,
  getAPInvoices,
  serializeP2PResult,
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

export async function GET(request: NextRequest) {
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

    const apInvoices = await getAPInvoices(session.id);
    return NextResponse.json(serializeP2PResult(apInvoices));
  } catch (error) {
    logger.error("Error fetching AP invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch AP invoices" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validation = createAPInvoiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const apInvoice = await createAPInvoice(validation.data, session.id);

    createAuditLog({
      userId: session.id,
      action: "create",
      entityType: "invoice",
      entityId: apInvoice.id,
      details: {
        module: "p2p",
        type: "ap_invoice",
        invoiceNumber: apInvoice.invoiceNumber,
      },
    }).catch(() => {});

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeP2PResult(apInvoice), { status: 201 });
  } catch (error) {
    const message = getErrorMessage(error);
    logger.error("Error creating AP invoice:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
