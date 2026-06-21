import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { prisma } from "@/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    const invoices = await prisma.aPInvoice.findMany({
      where: {
        status: { in: ["unpaid", "partial", "draft"] },
        amountDue: { gt: 0 }
      },
      orderBy: { dueDate: "asc" }
    });

    const supplierIds = [...new Set(invoices.map((i) => i.supplierId))];
    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, name: true }
    });
    const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s.name]));

    const agingBySupplier: Record<string, {
      supplierId: string;
      supplierName: string;
      current: number;
      thirtyDays: number;
      sixtyDays: number;
      ninetyDays: number;
      older: number;
      total: number;
    }> = {};

    const now = new Date();

    for (const inv of invoices) {
      const supplierId = inv.supplierId;
      const supplierName = supplierMap[supplierId] || "Unknown Supplier";

      if (!agingBySupplier[supplierId]) {
        agingBySupplier[supplierId] = {
          supplierId,
          supplierName,
          current: 0,
          thirtyDays: 0,
          sixtyDays: 0,
          ninetyDays: 0,
          older: 0,
          total: 0
        };
      }

      const dueAmount = Number(inv.amountDue);
      agingBySupplier[supplierId].total += dueAmount;

      if (!inv.dueDate) {
        agingBySupplier[supplierId].current += dueAmount;
      } else {
        const diffTime = now.getTime() - inv.dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          agingBySupplier[supplierId].current += dueAmount;
        } else if (diffDays <= 30) {
          agingBySupplier[supplierId].thirtyDays += dueAmount;
        } else if (diffDays <= 60) {
          agingBySupplier[supplierId].sixtyDays += dueAmount;
        } else if (diffDays <= 90) {
          agingBySupplier[supplierId].ninetyDays += dueAmount;
        } else {
          agingBySupplier[supplierId].older += dueAmount;
        }
      }
    }

    const data = Object.values(agingBySupplier).sort((a, b) => b.total - a.total);

    return NextResponse.json({ data });
  } catch (error) {
    logger.error("Error fetching AP Aging Report:", error);
    return NextResponse.json(
      { error: "Failed to fetch AP Aging Report" },
      { status: 500 },
    );
  }
}
