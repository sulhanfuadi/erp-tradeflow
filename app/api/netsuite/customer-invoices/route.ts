import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { createCustomerInvoiceFromFulfillment } from "@/prisma/netsuite";
import { createInvoiceSchema } from "@/lib/validations";

function toNetSuiteInvoiceStatus(status: string): string {
  if (status === "paid") return "Paid In Full";
  if (status === "overdue") return "Overdue";
  if (status === "sent") return "Open";
  if (status === "cancelled") return "Voided";
  return "Draft";
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const rows = await prisma.invoice.findMany({
      where: { userId: guard.session!.id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            itemFulfillments: {
              select: { id: true },
            },
            customerPayments: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      rows.map((row) => ({
        ...row,
        netsuiteStatus: toNetSuiteInvoiceStatus(row.status),
        netsuiteDocRefs: {
          salesOrderNumber: row.order?.orderNumber ?? null,
          itemFulfillmentCount: row.order?.itemFulfillments?.length ?? 0,
          customerInvoiceNumber: row.invoiceNumber,
          customerPaymentCount: row.order?.customerPayments?.length ?? 0,
        },
      })),
    );
  } catch (error) {
    logger.error("Error fetching customer invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer invoices" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    const { isArAnalyst } = await import("@/lib/role-helpers");
    if (!isArAnalyst(session.role)) {
      return NextResponse.json({ error: "Forbidden: Only A/R Analyst can create customer invoices" }, { status: 403 });
    }

    const payload = await request.json();
    const validation = createInvoiceSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const created = await createCustomerInvoiceFromFulfillment(
      validation.data,
      guard.session!.id,
    );

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(
      {
        ...created,
        netsuiteStatus: toNetSuiteInvoiceStatus(created.status),
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error creating customer invoice:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create customer invoice",
      },
      { status: 400 },
    );
  }
}
