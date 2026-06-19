import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { prisma } from "@/prisma/client";
import { invalidateAllServerCaches } from "@/lib/cache";
import { canApproveVendorBill } from "@/lib/role-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    if (!canApproveVendorBill(session.role)) {
      return NextResponse.json({ error: "Forbidden: Only A/R Analyst or A/P Analyst can approve vendor bills" }, { status: 403 });
    }

    const { id } = await params;

    const invoice = await prisma.aPInvoice.findUnique({ where: { id } });
    if (!invoice) {
      return NextResponse.json({ error: "Vendor bill not found" }, { status: 404 });
    }

    if (invoice.status !== "pending_approval") {
      return NextResponse.json({ error: "Vendor bill is not pending approval" }, { status: 400 });
    }

    const updated = await prisma.aPInvoice.update({
      where: { id },
      data: { status: "unpaid", updatedAt: new Date(), updatedBy: session.id },
    });

    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error approving vendor bill:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve vendor bill" },
      { status: 500 }
    );
  }
}
