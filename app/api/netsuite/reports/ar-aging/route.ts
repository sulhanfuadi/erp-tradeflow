import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireNetSuiteSession } from "@/app/api/netsuite/_shared";
import { prisma } from "@/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireNetSuiteSession(request);
    if (guard.errorResponse) return guard.errorResponse;

    // We fetch all invoices that have an outstanding amount
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["sent", "overdue"] },
        amountDue: { gt: 0 }
      },
      include: {
        order: { select: { clientId: true } },
      },
      orderBy: { dueDate: "asc" }
    });

    const clientIds = [...new Set(invoices.map((i) => i.order?.clientId).filter(Boolean))] as string[];
    const clients = await prisma.user.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true }
    });
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

    const agingByCustomer: Record<string, {
      clientId: string;
      clientName: string;
      current: number;
      thirtyDays: number;
      sixtyDays: number;
      ninetyDays: number;
      older: number;
      total: number;
    }> = {};

    const now = new Date();

    for (const inv of invoices) {
      const clientId = inv.order?.clientId || "unknown";
      const clientName = clientMap[clientId] || "Unknown Customer";

      if (!agingByCustomer[clientId]) {
        agingByCustomer[clientId] = {
          clientId,
          clientName,
          current: 0,
          thirtyDays: 0,
          sixtyDays: 0,
          ninetyDays: 0,
          older: 0,
          total: 0
        };
      }

      const dueAmount = Number(inv.amountDue);
      agingByCustomer[clientId].total += dueAmount;

      if (!inv.dueDate) {
        agingByCustomer[clientId].current += dueAmount;
      } else {
        const diffTime = now.getTime() - inv.dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          agingByCustomer[clientId].current += dueAmount;
        } else if (diffDays <= 30) {
          agingByCustomer[clientId].thirtyDays += dueAmount;
        } else if (diffDays <= 60) {
          agingByCustomer[clientId].sixtyDays += dueAmount;
        } else if (diffDays <= 90) {
          agingByCustomer[clientId].ninetyDays += dueAmount;
        } else {
          agingByCustomer[clientId].older += dueAmount;
        }
      }
    }

    const data = Object.values(agingByCustomer).sort((a, b) => b.total - a.total);

    return NextResponse.json({ data });
  } catch (error) {
    logger.error("Error fetching AR Aging Report:", error);
    return NextResponse.json(
      { error: "Failed to fetch AR Aging Report" },
      { status: 500 },
    );
  }
}
