import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { createAPInvoiceSchema } from "@/lib/validations";
import { createVendorBillFromItemReceipt, getNetSuiteVendorBills } from "@/prisma/netsuite";
import { serializeP2PResult } from "@/prisma/p2p";
import { canCreateVendorBill } from "@/lib/role-helpers";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const rows = await getNetSuiteVendorBills();
    return NextResponse.json(serializeP2PResult(rows));
  } catch (error) {
    logger.error("Error fetching vendor bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor bills" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    if (!canCreateVendorBill(session.role)) {
      return NextResponse.json({ error: "Forbidden: Only A/R Analyst or A/P Analyst can create vendor bills" }, { status: 403 });
    }

    const payload = await request.json();
    const validation = createAPInvoiceSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const created = await createVendorBillFromItemReceipt(
      validation.data,
      guard.session!.id,
    );

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(serializeP2PResult(created), { status: 201 });
  } catch (error) {
    logger.error("Error creating vendor bill:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create vendor bill",
      },
      { status: 400 },
    );
  }
}
