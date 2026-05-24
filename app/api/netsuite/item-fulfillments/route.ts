import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { createItemFulfillment } from "@/prisma/netsuite";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const rows = await prisma.itemFulfillment.findMany({
      where: { userId: guard.session!.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(rows);
  } catch (error) {
    logger.error("Error fetching item fulfillments:", error);
    return NextResponse.json(
      { error: "Failed to fetch item fulfillments" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const payload = (await request.json()) as {
      orderId?: string;
      notes?: string;
      items?: Array<{ orderItemId?: string; quantity?: number }>;
    };

    if (!payload.orderId || !Array.isArray(payload.items) || payload.items.length === 0) {
      return NextResponse.json(
        { error: "orderId and items are required" },
        { status: 400 },
      );
    }

    const created = await createItemFulfillment(
      {
        orderId: payload.orderId,
        notes: payload.notes,
        items: payload.items.map((item) => ({
          orderItemId: String(item.orderItemId ?? ""),
          quantity: Number(item.quantity ?? 0),
        })),
      },
      guard.session!.id,
    );

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logger.error("Error creating item fulfillment:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create item fulfillment",
      },
      { status: 400 },
    );
  }
}
