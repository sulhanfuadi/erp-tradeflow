import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { prisma } from "@/prisma/client";
import { invalidateAllServerCaches } from "@/lib/cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;
    const session = guard.session!;

    if (session.role !== "inventory_manager" && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Only Inventory Manager can pack orders" }, { status: 403 });
    }

    const { id } = await params;

    const fulfillment = await prisma.itemFulfillment.findUnique({ where: { id } });
    if (!fulfillment) {
      return NextResponse.json({ error: "Fulfillment not found" }, { status: 404 });
    }

    if (fulfillment.status !== "picked") {
      return NextResponse.json({ error: "Fulfillment is not in picked status" }, { status: 400 });
    }

    const updated = await prisma.itemFulfillment.update({
      where: { id },
      data: { status: "packed", updatedAt: new Date(), updatedBy: session.id },
    });

    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error packing fulfillment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to pack fulfillment" },
      { status: 500 }
    );
  }
}
