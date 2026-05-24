import { prisma } from "@/prisma/client";
import type {
  CreateAPInvoiceInput,
  CreateInvoiceInput,
  RecordAPInvoicePaymentInput,
  UpdateInvoiceInput,
} from "@/types";
import type {
  CreateItemFulfillmentInput,
  RecordCustomerPaymentInput,
  RecordBillPaymentInput,
  NetSuiteSalesOrderStatus,
  NetSuiteVendorBillStatus,
} from "@/types/netsuite";
import { createInvoice, updateInvoice } from "@/prisma/invoice";
import { createAPInvoice, recordAPInvoicePayment } from "@/prisma/p2p";

function createDocNumber(prefix: string): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${datePart}-${timePart}-${randomPart}`;
}

async function generateUniqueFieldValue(
  model:
    | "itemFulfillment"
    | "customerPayment"
    | "billPayment",
  field: "fulfillmentNumber" | "paymentNumber",
  prefix: string,
): Promise<string> {
  let value = createDocNumber(prefix);
  while (true) {
    const existing = await (prisma[model] as any).findFirst({
      where: { [field]: value },
      select: { id: true },
    });
    if (!existing) return value;
    value = createDocNumber(prefix);
  }
}

export function mapOrderToNetSuiteStatus(order: {
  status: string;
  paymentStatus: string;
  items?: Array<{ quantity: number; fulfilledQuantity?: number | null }>;
  invoice?: { id: string } | null;
}): NetSuiteSalesOrderStatus {
  if (order.status === "cancelled") return "Cancelled";

  const totalQty = (order.items ?? []).reduce(
    (sum, item) => sum + Number(item.quantity ?? 0),
    0,
  );
  const fulfilledQty = (order.items ?? []).reduce(
    (sum, item) => sum + Number(item.fulfilledQuantity ?? 0),
    0,
  );

  if (totalQty > 0 && fulfilledQty === 0) return "Pending Fulfillment";
  if (fulfilledQty > 0 && fulfilledQty < totalQty) return "Partially Fulfilled";
  if (fulfilledQty >= totalQty && !order.invoice) return "Pending Billing";
  if (order.invoice && (order.paymentStatus === "paid" || order.paymentStatus === "partial")) {
    return "Billed";
  }
  if (order.status === "delivered") return "Closed";
  return "Pending Billing";
}

export function mapAPInvoiceToNetSuiteStatus(invoice: {
  status: string;
  amountDue: number;
}): NetSuiteVendorBillStatus {
  if (invoice.status === "cancelled") return "Voided";
  if (invoice.amountDue <= 0 || invoice.status === "paid") return "Paid In Full";
  if (invoice.status === "partial") return "Partially Paid";
  return "Open";
}

export async function getNetSuiteSalesOrders(userId: string) {
  const rows = await prisma.order.findMany({
    where: { userId },
    include: {
      items: true,
      invoice: { select: { id: true, invoiceNumber: true } },
      itemFulfillments: {
        select: { id: true, fulfillmentNumber: true, status: true },
        orderBy: { createdAt: "desc" },
      },
      customerPayments: {
        select: { id: true, paymentNumber: true, paymentAmount: true, paidAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    ...row,
    netsuiteStatus: mapOrderToNetSuiteStatus(row),
    netsuiteDocRefs: {
      salesOrderNumber: row.orderNumber,
      itemFulfillmentCount: row.itemFulfillments.length,
      customerInvoiceNumber: row.invoice?.invoiceNumber ?? null,
      customerPaymentCount: row.customerPayments.length,
    },
  }));
}

export async function createItemFulfillment(
  input: CreateItemFulfillmentInput,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: input.orderId, userId },
      include: { items: true },
    });

    if (!order) throw new Error("Sales order not found");
    if (order.status === "cancelled") throw new Error("Cancelled sales order cannot be fulfilled");

    const orderItemMap = new Map(order.items.map((item) => [item.id, item]));

    const fulfillmentItems = input.items.map((item) => {
      const orderItem = orderItemMap.get(item.orderItemId);
      if (!orderItem) throw new Error(`Order item not found: ${item.orderItemId}`);

      const remaining = Number(orderItem.quantity) - Number(orderItem.fulfilledQuantity ?? 0);
      if (item.quantity <= 0 || item.quantity > remaining) {
        throw new Error(
          `Invalid fulfillment quantity for item ${orderItem.productName}. Remaining: ${remaining}`,
        );
      }

      return { item, orderItem };
    });

    for (const { item, orderItem } of fulfillmentItems) {
      const allocation = await tx.stockAllocation.findFirst({
        where: {
          productId: orderItem.productId,
          userId,
        },
        orderBy: { quantity: "desc" },
      });

      if (!allocation) {
        throw new Error(`Stock allocation not found for product ${orderItem.productName}`);
      }

      const available = Number(allocation.quantity) - Number(allocation.reservedQuantity);
      if (available < item.quantity) {
        throw new Error(
          `Insufficient reserved stock for ${orderItem.productName}. Available: ${available}`,
        );
      }

      await tx.stockAllocation.update({
        where: { id: allocation.id },
        data: {
          quantity: { decrement: item.quantity },
          reservedQuantity: { decrement: item.quantity },
          updatedAt: new Date(),
        },
      });

      await tx.product.update({
        where: { id: orderItem.productId },
        data: {
          quantity: { decrement: item.quantity },
          reservedQuantity: { decrement: item.quantity },
          updatedAt: new Date(),
          updatedBy: userId,
        },
      });

      await tx.orderItem.update({
        where: { id: orderItem.id },
        data: {
          fulfilledQuantity: { increment: item.quantity },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: orderItem.productId,
          warehouseId: allocation.warehouseId,
          userId,
          movementType: "issue",
          quantityChange: BigInt(-item.quantity),
          referenceType: "item_fulfillment",
          notes: `Item fulfillment for sales order ${order.orderNumber}`,
          createdAt: new Date(),
        },
      });
    }

    const fulfillmentNumber = await generateUniqueFieldValue(
      "itemFulfillment",
      "fulfillmentNumber",
      "IF",
    );

    const created = await tx.itemFulfillment.create({
      data: {
        fulfillmentNumber,
        orderId: order.id,
        userId,
        status: "fulfilled",
        fulfilledAt: new Date(),
        notes: input.notes?.trim() || null,
        createdAt: new Date(),
        createdBy: userId,
        items: {
          create: fulfillmentItems.map(({ item, orderItem }) => ({
            orderItemId: orderItem.id,
            productId: orderItem.productId,
            productName: orderItem.productName,
            sku: orderItem.sku,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    const refreshedItems = await tx.orderItem.findMany({
      where: { orderId: order.id },
      select: { quantity: true, fulfilledQuantity: true },
    });

    const totalQty = refreshedItems.reduce((sum, item) => sum + Number(item.quantity), 0);
    const fulfilledQty = refreshedItems.reduce(
      (sum, item) => sum + Number(item.fulfilledQuantity ?? 0),
      0,
    );

    const nextStatus = fulfilledQty >= totalQty ? "shipped" : "processing";

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        shippedAt: nextStatus === "shipped" ? new Date() : order.shippedAt,
        updatedAt: new Date(),
        updatedBy: userId,
      },
    });

    return created;
  });
}

export async function createCustomerInvoiceFromFulfillment(
  input: CreateInvoiceInput,
  userId: string,
) {
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId },
    include: { items: true, invoice: true },
  });

  if (!order) throw new Error("Sales order not found");
  if (order.invoice) throw new Error("Customer invoice already exists for this sales order");

  const hasUnfulfilledItems = order.items.some(
    (item) => Number(item.fulfilledQuantity ?? 0) < Number(item.quantity),
  );

  if (hasUnfulfilledItems) {
    throw new Error("Cannot generate customer invoice before full item fulfillment");
  }

  const invoice = await createInvoice(input, userId);

  await prisma.orderItem.updateMany({
    where: { orderId: order.id },
    data: {
      billedQuantity: 0,
    },
  });

  for (const item of order.items) {
    await prisma.orderItem.update({
      where: { id: item.id },
      data: {
        billedQuantity: Number(item.quantity),
      },
    });
  }

  return invoice;
}

export async function recordCustomerPayment(
  input: RecordCustomerPaymentInput,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: input.invoiceId },
      include: { order: true },
    });

    if (!invoice) throw new Error("Customer invoice not found");
    if (invoice.userId !== userId) throw new Error("Unauthorized");
    if (invoice.status === "cancelled") throw new Error("Cancelled invoice cannot receive payment");

    const paymentAmount = input.paymentAmount;
    if (!(paymentAmount > 0)) throw new Error("Payment amount must be greater than 0");

    const nextAmountPaid = Number(invoice.amountPaid) + paymentAmount;
    const cappedAmountPaid = Math.min(nextAmountPaid, Number(invoice.total));
    const nextAmountDue = Math.max(0, Number(invoice.total) - cappedAmountPaid);

    const nextStatus =
      nextAmountDue <= 0 ? "paid" : cappedAmountPaid > 0 ? "partial" : "draft";

    const updatedInvoice = await updateInvoice(
      invoice.id,
      {
        id: invoice.id,
        amountPaid: cappedAmountPaid,
        amountDue: nextAmountDue,
        status: nextStatus,
        paidAt: nextStatus === "paid" ? new Date().toISOString() : undefined,
        notes: input.notes,
      } as UpdateInvoiceInput,
      userId,
    );

    if (invoice.orderId) {
      await tx.order.update({
        where: { id: invoice.orderId },
        data: {
          paymentStatus: nextAmountDue <= 0 ? "paid" : "partial",
          status:
            invoice.order?.status === "pending"
              ? "confirmed"
              : invoice.order?.status ?? undefined,
          updatedAt: new Date(),
          updatedBy: userId,
        },
      });
    }

    const paymentNumber = await generateUniqueFieldValue(
      "customerPayment",
      "paymentNumber",
      "CP",
    );

    const paymentDoc = await tx.customerPayment.create({
      data: {
        paymentNumber,
        invoiceId: invoice.id,
        orderId: invoice.orderId,
        userId,
        paymentAmount,
        amountApplied: Math.min(paymentAmount, Number(invoice.amountDue)),
        amountRemaining: Math.max(0, paymentAmount - Number(invoice.amountDue)),
        status: "posted",
        paidAt: new Date(),
        notes: input.notes?.trim() || null,
        createdBy: userId,
      },
    });

    return { paymentDoc, invoice: updatedInvoice };
  });
}

export async function createVendorBillFromItemReceipt(
  input: CreateAPInvoiceInput,
  userId: string,
) {
  if (!input.purchaseOrderId && !input.goodsReceiptId) {
    throw new Error("Vendor bill requires purchaseOrderId or goodsReceiptId");
  }

  if (input.purchaseOrderId) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: input.purchaseOrderId, userId },
      include: { items: true },
    });

    if (!po) throw new Error("Purchase order not found");

    const hasReceivableLine = po.items.some(
      (item) => Number(item.receivedQuantity) > Number(item.billedQuantity ?? 0),
    );

    if (!hasReceivableLine) {
      throw new Error("No received quantity available to bill for this purchase order");
    }
  }

  const vendorBill = await createAPInvoice(input, userId);

  if (vendorBill.purchaseOrderId) {
    const poItems = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: vendorBill.purchaseOrderId },
    });

    for (const item of poItems) {
      const received = Number(item.receivedQuantity);
      const billed = Number(item.billedQuantity ?? 0);
      const increment = Math.max(0, received - billed);

      if (increment > 0) {
        await prisma.purchaseOrderItem.update({
          where: { id: item.id },
          data: {
            billedQuantity: { increment },
          },
        });
      }
    }
  }

  return vendorBill;
}

export async function recordBillPayment(
  input: RecordBillPaymentInput,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const paymentPayload: RecordAPInvoicePaymentInput = {
      paymentAmount: input.paymentAmount,
      notes: input.notes,
    };

    const updatedVendorBill = await recordAPInvoicePayment(
      input.apInvoiceId,
      paymentPayload,
      userId,
    );

    const paymentNumber = await generateUniqueFieldValue(
      "billPayment",
      "paymentNumber",
      "BP",
    );

    const applied = Math.min(input.paymentAmount, Number(updatedVendorBill.total));

    const paymentDoc = await tx.billPayment.create({
      data: {
        paymentNumber,
        apInvoiceId: updatedVendorBill.id,
        purchaseOrderId: updatedVendorBill.purchaseOrderId,
        userId,
        paymentAmount: input.paymentAmount,
        amountApplied: applied,
        amountRemaining: Math.max(0, input.paymentAmount - applied),
        status: "posted",
        paidAt: new Date(),
        notes: input.notes?.trim() || null,
        createdBy: userId,
      },
    });

    return { paymentDoc, vendorBill: updatedVendorBill };
  });
}

export async function getNetSuiteItemReceipts(userId: string) {
  const rows = await prisma.goodsReceipt.findMany({
    where: { userId },
    include: { items: true, purchaseOrder: true },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    ...row,
    itemReceiptNumber: row.receiptNumber,
    netsuiteStatus: row.status === "received" ? "Posted" : "Reversed",
  }));
}

export async function getNetSuiteVendorBills(userId: string) {
  const rows = await prisma.aPInvoice.findMany({
    where: { userId },
    include: { purchaseOrder: true, goodsReceipt: true, billPayments: true },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    ...row,
    vendorBillNumber: row.invoiceNumber,
    netsuiteStatus: mapAPInvoiceToNetSuiteStatus({
      status: row.status,
      amountDue: Number(row.amountDue),
    }),
  }));
}

export async function listCustomerPayments(userId: string) {
  return prisma.customerPayment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function listBillPayments(userId: string) {
  return prisma.billPayment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
