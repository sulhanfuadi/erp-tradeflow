import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { listCustomerPayments, recordCustomerPayment } from "@/prisma/netsuite";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const rows = await listCustomerPayments(undefined);
    return NextResponse.json(rows);
  } catch (error) {
    logger.error("Error fetching customer payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer payments" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const payload = (await request.json()) as {
      invoiceId?: string;
      paymentAmount?: number;
      notes?: string;
    };

    if (!payload.invoiceId || !(Number(payload.paymentAmount) > 0)) {
      return NextResponse.json(
        { error: "invoiceId and paymentAmount are required" },
        { status: 400 },
      );
    }

    const result = await recordCustomerPayment(
      {
        invoiceId: payload.invoiceId,
        paymentAmount: Number(payload.paymentAmount),
        notes: payload.notes,
      },
      guard.session!.id,
    );

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error("Error recording customer payment:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to record customer payment",
      },
      { status: 400 },
    );
  }
}
