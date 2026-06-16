import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { listBillPayments, recordBillPayment } from "@/prisma/netsuite";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const rows = await listBillPayments(guard.session!.id);
    return NextResponse.json(rows);
  } catch (error) {
    logger.error("Error fetching bill payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch bill payments" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    if (session.role !== "ap_analyst" && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Only A/P Analyst can record bill payments" }, { status: 403 });
    }

    const payload = (await request.json()) as {
      apInvoiceId?: string;
      paymentAmount?: number;
      notes?: string;
    };

    if (!payload.apInvoiceId || !(Number(payload.paymentAmount) > 0)) {
      return NextResponse.json(
        { error: "apInvoiceId and paymentAmount are required" },
        { status: 400 },
      );
    }

    const result = await recordBillPayment(
      {
        apInvoiceId: payload.apInvoiceId,
        paymentAmount: Number(payload.paymentAmount),
        notes: payload.notes,
      },
      guard.session!.id,
    );

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error("Error recording bill payment:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to record bill payment",
      },
      { status: 400 },
    );
  }
}
