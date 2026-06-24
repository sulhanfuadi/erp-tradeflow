import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { createOrder } from "@/prisma/order";
import { createOrderSchema } from "@/lib/validations";
import { mapOrderToNetSuiteStatus, getNetSuiteSalesOrders } from "@/prisma/netsuite";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const rows = await getNetSuiteSalesOrders(undefined);

    return NextResponse.json(rows);
  } catch (error) {
    logger.error("Error fetching NetSuite sales orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales orders" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    const { isSalesRep } = await import("@/lib/role-helpers");
    if (!isSalesRep(session.role)) {
      return NextResponse.json({ error: "Forbidden: Only Sales Rep can create sales orders" }, { status: 403 });
    }

    const payload = await request.json();
    const validation = createOrderSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const created = await createOrder(
      {
        ...validation.data,
        clientId: guard.session!.id,
      },
      guard.session!.id,
    );

    const invoice = await prisma.invoice.findUnique({
      where: { orderId: created.id },
      select: { id: true, invoiceNumber: true },
    });

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(
      {
        ...created,
        netsuiteStatus: mapOrderToNetSuiteStatus({
          status: created.status,
          paymentStatus: created.paymentStatus,
          items: created.items,
          invoice,
        }),
        netsuiteDocRefs: {
          salesOrderNumber: created.orderNumber,
          itemFulfillmentCount: 0,
          customerInvoiceNumber: invoice?.invoiceNumber ?? null,
          customerPaymentCount: 0,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error creating NetSuite sales order:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create sales order",
      },
      { status: 400 },
    );
  }
}
