import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { getStockMovements } from "@/prisma/stock-allocation";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const productId = searchParams.get("productId") || undefined;
    const limit = Number(searchParams.get("limit") || "200");

    const rows = await getStockMovements(undefined, {
      warehouseId,
      productId,
      limit,
    });

    const sorted = [...rows].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    const running = new Map<string, number>();

    const ledger = sorted.map((row) => {
      const key = `${row.productId}:${row.warehouseId}`;
      const prev = running.get(key) ?? 0;
      const change = Number(row.quantityChange);
      const next = prev + change;
      running.set(key, next);

      return {
        ...row,
        quantityChange: change,
        createdAt: row.createdAt.toISOString(),
        runningBalance: next,
      };
    });

    return NextResponse.json(ledger);
  } catch (error) {
    logger.error("Error fetching inventory ledger:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory ledger" },
      { status: 500 },
    );
  }
}
