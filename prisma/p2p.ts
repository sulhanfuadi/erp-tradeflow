/**
 * Procure-to-Pay (P2P) Prisma utilities
 */

import { prisma } from "@/prisma/client";
import { logger } from "@/lib/logger";
import type {
  CreateAPInvoiceInput,
  CreateGoodsReceiptInput,
  CreatePurchaseOrderInput,
  RecordAPInvoicePaymentInput,
  ReverseGoodsReceiptInput,
  UpdatePurchaseOrderInput,
} from "@/types/p2p";
import type { Prisma } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

function toBigInt(value: number): bigint {
  return BigInt(Math.trunc(value));
}

function createDocNumber(prefix: string): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${datePart}-${timePart}-${randomPart}`;
}

async function generateUniqueNumber(
  prefix: "PO" | "GR" | "AP",
  db: DbClient,
): Promise<string> {
  let candidate = createDocNumber(prefix);

  while (true) {
    if (prefix === "PO") {
      const existing = await db.purchaseOrder.findUnique({
        where: { poNumber: candidate },
        select: { id: true },
      });
      if (existing == null) return candidate;
    }

    if (prefix === "GR") {
      const existing = await db.goodsReceipt.findUnique({
        where: { receiptNumber: candidate },
        select: { id: true },
      });
      if (existing == null) return candidate;
    }

    if (prefix === "AP") {
      const existing = await db.aPInvoice.findUnique({
        where: { invoiceNumber: candidate },
        select: { id: true },
      });
      if (existing == null) return candidate;
    }

    candidate = createDocNumber(prefix);
  }
}

export async function getPurchaseOrders(userId: string) {
  return prisma.purchaseOrder.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPurchaseOrderById(id: string, userId: string) {
  return prisma.purchaseOrder.findFirst({
    where: { id, userId },
    include: { items: true, goodsReceipts: true, apInvoices: true },
  });
}

export async function createPurchaseOrder(
  data: CreatePurchaseOrderInput,
  userId: string,
) {
  const supplier = await prisma.supplier.findFirst({
    where: { id: data.supplierId, status: true },
    select: { id: true },
  });

  if (supplier == null) {
    throw new Error("Supplier not found or inactive");
  }

  const warehouse = await prisma.warehouse.findFirst({
    where: { id: data.warehouseId, status: true },
    select: { id: true },
  });

  if (warehouse == null) {
    throw new Error("Warehouse not found or inactive");
  }

  const productIds = [...new Set(data.items.map((item) => item.productId))];

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      supplierId: true,
    },
  });

  if (products.length !== productIds.length) {
    throw new Error("One or more products are invalid");
  }

  const productMap = new Map(products.map((product) => [product.id, product]));

  let subtotal = 0;
  const itemPayload = data.items.map((item) => {
    const product = productMap.get(item.productId);
    if (product == null) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    if (product.supplierId !== data.supplierId) {
      throw new Error(
        `Product ${product.name} does not belong to selected supplier`,
      );
    }

    const unitCost = item.unitCost ?? Number(product.price);
    const lineSubtotal = unitCost * item.quantity;
    subtotal += lineSubtotal;

    return {
      productId: item.productId,
      productName: product.name,
      sku: product.sku,
      quantity: toBigInt(item.quantity),
      unitCost,
      subtotal: lineSubtotal,
    };
  });

  const tax = data.tax ?? 0;
  const total = subtotal + tax;

  return prisma.$transaction(async (tx) => {
    const poNumber = await generateUniqueNumber("PO", tx);

    const purchaseOrder = await tx.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        warehouseId: data.warehouseId,
        userId,
        status: "draft",
        subtotal,
        tax: tax > 0 ? tax : null,
        total,
        expectedDate:
          data.expectedDate != null && data.expectedDate !== ""
            ? new Date(data.expectedDate)
            : null,
        notes: data.notes?.trim() || null,
        createdBy: userId,
        createdAt: new Date(),
        items: {
          create: itemPayload,
        },
      },
      include: { items: true },
    });

    return purchaseOrder;
  });
}

export async function updatePurchaseOrder(
  id: string,
  data: UpdatePurchaseOrderInput,
  userId: string,
) {
  const existing = await prisma.purchaseOrder.findFirst({
    where: { id, userId },
    select: { id: true, status: true },
  });

  if (existing == null) {
    throw new Error("Purchase order not found");
  }

  if (existing.status === "completed" || existing.status === "cancelled") {
    throw new Error("Completed or cancelled purchase order cannot be edited");
  }

  const updateData: Prisma.PurchaseOrderUpdateInput = {
    updatedAt: new Date(),
    updatedBy: userId,
  };

  if (data.status != null) {
    updateData.status = data.status;
  }

  if (data.notes !== undefined) {
    updateData.notes = data.notes.trim() || null;
  }

  if (data.expectedDate !== undefined) {
    updateData.expectedDate =
      data.expectedDate !== "" ? new Date(data.expectedDate) : null;
  }

  if (data.tax !== undefined) {
    const current = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: { subtotal: true },
    });
    const subtotal = current?.subtotal ?? 0;
    updateData.tax = data.tax > 0 ? data.tax : null;
    updateData.total = subtotal + data.tax;
  }

  return prisma.purchaseOrder.update({
    where: { id },
    data: updateData,
    include: { items: true },
  });
}

export async function deletePurchaseOrder(id: string, userId: string) {
  const existing = await prisma.purchaseOrder.findFirst({
    where: { id, userId },
    select: { id: true, status: true },
  });

  if (existing == null) {
    throw new Error("Purchase order not found");
  }

  if (existing.status !== "draft") {
    throw new Error("Only draft purchase order can be deleted");
  }

  return prisma.purchaseOrder.delete({ where: { id } });
}

export async function getGoodsReceipts(userId: string) {
  return prisma.goodsReceipt.findMany({
    where: { userId },
    include: { items: true, purchaseOrder: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createGoodsReceipt(
  data: CreateGoodsReceiptInput,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const purchaseOrder = await tx.purchaseOrder.findFirst({
      where: { id: data.purchaseOrderId, userId },
      include: { items: true },
    });

    if (purchaseOrder == null) {
      throw new Error("Purchase order not found");
    }

    if (purchaseOrder.status === "cancelled") {
      throw new Error("Cancelled purchase order cannot be received");
    }

    const poItemMap = new Map(purchaseOrder.items.map((item) => [item.id, item]));
    const receiptItemsPayload: Array<{
      purchaseOrderItemId: string;
      productId: string;
      productName: string;
      sku: string | null;
      quantity: bigint;
      unitCost: number;
      subtotal: number;
    }> = [];

    const incrementByPoItem = new Map<string, number>();

    for (const item of data.items) {
      const poItem = poItemMap.get(item.purchaseOrderItemId);
      if (poItem == null) {
        throw new Error(`Purchase order item not found: ${item.purchaseOrderItemId}`);
      }

      const remainingQty = Number(poItem.quantity) - Number(poItem.receivedQuantity);
      if (item.quantity > remainingQty) {
        throw new Error(
          `Received quantity exceeds remaining quantity for ${poItem.productName}. Remaining: ${remainingQty}`,
        );
      }

      const lineSubtotal = item.quantity * Number(poItem.unitCost);

      receiptItemsPayload.push({
        purchaseOrderItemId: poItem.id,
        productId: poItem.productId,
        productName: poItem.productName,
        sku: poItem.sku,
        quantity: toBigInt(item.quantity),
        unitCost: Number(poItem.unitCost),
        subtotal: lineSubtotal,
      });

      incrementByPoItem.set(
        poItem.id,
        (incrementByPoItem.get(poItem.id) ?? 0) + item.quantity,
      );
    }

    const receiptNumber = await generateUniqueNumber("GR", tx);

    const goodsReceipt = await tx.goodsReceipt.create({
      data: {
        receiptNumber,
        purchaseOrderId: purchaseOrder.id,
        supplierId: purchaseOrder.supplierId,
        warehouseId: purchaseOrder.warehouseId,
        userId,
        status: "received",
        receivedAt: new Date(),
        notes: data.notes?.trim() || null,
        createdBy: userId,
        createdAt: new Date(),
        items: {
          create: receiptItemsPayload,
        },
      },
      include: { items: true, purchaseOrder: true },
    });

    // Update received qty in PO items and update stock levels.
    for (const [poItemId, qty] of incrementByPoItem.entries()) {
      const poItem = poItemMap.get(poItemId);
      if (poItem == null) continue;

      await tx.purchaseOrderItem.update({
        where: { id: poItemId },
        data: {
          receivedQuantity: {
            increment: qty,
          },
        },
      });

      await tx.product.update({
        where: { id: poItem.productId },
        data: {
          quantity: {
            increment: qty,
          },
          updatedAt: new Date(),
          updatedBy: userId,
        },
      });

      const existingAllocation = await tx.stockAllocation.findUnique({
        where: {
          productId_warehouseId: {
            productId: poItem.productId,
            warehouseId: purchaseOrder.warehouseId,
          },
        },
      });

      if (existingAllocation == null) {
        await tx.stockAllocation.create({
          data: {
            productId: poItem.productId,
            warehouseId: purchaseOrder.warehouseId,
            quantity: toBigInt(qty),
            reservedQuantity: BigInt(0),
            userId,
            createdAt: new Date(),
          },
        });
      } else {
        await tx.stockAllocation.update({
          where: { id: existingAllocation.id },
          data: {
            quantity: { increment: qty },
            updatedAt: new Date(),
          },
        });
      }

      await tx.stockMovement.create({
        data: {
          productId: poItem.productId,
          warehouseId: purchaseOrder.warehouseId,
          userId,
          movementType: "receipt",
          quantityChange: toBigInt(qty),
          referenceType: "goods_receipt",
          referenceId: goodsReceipt.id,
          notes: `Receipt ${goodsReceipt.receiptNumber}`,
          createdAt: new Date(),
        },
      });
    }

    const refreshedItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: purchaseOrder.id },
      select: { quantity: true, receivedQuantity: true },
    });

    const isCompleted = refreshedItems.every(
      (item) => Number(item.receivedQuantity) >= Number(item.quantity),
    );

    await tx.purchaseOrder.update({
      where: { id: purchaseOrder.id },
      data: {
        status: isCompleted ? "completed" : "posted",
        updatedAt: new Date(),
        updatedBy: userId,
      },
    });

    return goodsReceipt;
  });
}

export async function reverseGoodsReceipt(
  id: string,
  data: ReverseGoodsReceiptInput,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const receipt = await tx.goodsReceipt.findFirst({
      where: { id, userId },
      include: {
        items: true,
        purchaseOrder: {
          include: { items: true },
        },
      },
    });

    if (receipt == null) {
      throw new Error("Goods receipt not found");
    }

    if (receipt.status !== "received") {
      throw new Error("Only received goods receipt can be reversed");
    }

    for (const item of receipt.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { id: true, quantity: true },
      });

      if (product == null) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (Number(product.quantity) < Number(item.quantity)) {
        throw new Error(
          `Cannot reverse receipt: insufficient current stock for product ${item.productName}`,
        );
      }

      const allocation = await tx.stockAllocation.findUnique({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: receipt.warehouseId,
          },
        },
      });

      if (allocation == null || Number(allocation.quantity) < Number(item.quantity)) {
        throw new Error(
          `Cannot reverse receipt: warehouse allocation stock is insufficient for ${item.productName}`,
        );
      }
    }

    for (const item of receipt.items) {
      const quantity = Number(item.quantity);

      await tx.product.update({
        where: { id: item.productId },
        data: {
          quantity: { decrement: quantity },
          updatedAt: new Date(),
          updatedBy: userId,
        },
      });

      await tx.stockAllocation.update({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: receipt.warehouseId,
          },
        },
        data: {
          quantity: { decrement: quantity },
          updatedAt: new Date(),
        },
      });

      if (item.purchaseOrderItemId != null && item.purchaseOrderItemId !== "") {
        await tx.purchaseOrderItem.update({
          where: { id: item.purchaseOrderItemId },
          data: {
            receivedQuantity: { decrement: quantity },
          },
        });
      } else {
        let remainingToRollback = quantity;
        const candidateItems = await tx.purchaseOrderItem.findMany({
          where: {
            purchaseOrderId: receipt.purchaseOrderId,
            productId: item.productId,
          },
          orderBy: { createdAt: "desc" },
        });

        for (const candidate of candidateItems) {
          if (remainingToRollback <= 0) break;

          const rollbackQty = Math.min(
            remainingToRollback,
            Number(candidate.receivedQuantity),
          );

          if (rollbackQty <= 0) continue;

          await tx.purchaseOrderItem.update({
            where: { id: candidate.id },
            data: {
              receivedQuantity: { decrement: rollbackQty },
            },
          });

          remainingToRollback -= rollbackQty;
        }

        if (remainingToRollback > 0) {
          throw new Error(
            `Cannot reverse receipt: failed to map PO item for ${item.productName}`,
          );
        }
      }

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          warehouseId: receipt.warehouseId,
          userId,
          movementType: "reversal",
          quantityChange: toBigInt(-quantity),
          referenceType: "goods_receipt",
          referenceId: receipt.id,
          notes: `Reverse receipt ${receipt.receiptNumber}`,
          createdAt: new Date(),
        },
      });
    }

    const refreshedItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: receipt.purchaseOrderId },
      select: { quantity: true, receivedQuantity: true },
    });

    const hasAnyReceipt = refreshedItems.some(
      (item) => Number(item.receivedQuantity) > 0,
    );
    const isCompleted = refreshedItems.length > 0 && refreshedItems.every(
      (item) => Number(item.receivedQuantity) >= Number(item.quantity),
    );

    await tx.purchaseOrder.update({
      where: { id: receipt.purchaseOrderId },
      data: {
        status: isCompleted ? "completed" : hasAnyReceipt ? "posted" : "posted",
        updatedAt: new Date(),
        updatedBy: userId,
      },
    });

    const mergedNotes = [receipt.notes, data.notes]
      .filter((text): text is string => text != null && text.trim() !== "")
      .join("\n");

    return tx.goodsReceipt.update({
      where: { id: receipt.id },
      data: {
        status: "reversed",
        reversedAt: new Date(),
        reversedBy: userId,
        updatedAt: new Date(),
        updatedBy: userId,
        notes: mergedNotes || receipt.notes,
      },
      include: { items: true, purchaseOrder: true },
    });
  });
}

export async function getAPInvoices(userId: string) {
  return prisma.aPInvoice.findMany({
    where: { userId },
    include: {
      purchaseOrder: true,
      goodsReceipt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAPInvoice(
  data: CreateAPInvoiceInput,
  userId: string,
) {
  const supplier = await prisma.supplier.findFirst({
    where: { id: data.supplierId, status: true },
    select: { id: true },
  });

  if (supplier == null) {
    throw new Error("Supplier not found or inactive");
  }

  if (data.purchaseOrderId != null && data.purchaseOrderId !== "") {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: data.purchaseOrderId, userId },
      select: { id: true, supplierId: true },
    });
    if (po == null) {
      throw new Error("Purchase order not found");
    }
    if (po.supplierId !== data.supplierId) {
      throw new Error("Supplier mismatch with purchase order");
    }
  }

  if (data.goodsReceiptId != null && data.goodsReceiptId !== "") {
    const gr = await prisma.goodsReceipt.findFirst({
      where: { id: data.goodsReceiptId, userId },
      select: { id: true, supplierId: true },
    });
    if (gr == null) {
      throw new Error("Goods receipt not found");
    }
    if (gr.supplierId !== data.supplierId) {
      throw new Error("Supplier mismatch with goods receipt");
    }
  }

  const tax = data.tax ?? 0;
  const total = data.subtotal + tax;

  return prisma.$transaction(async (tx) => {
    const invoiceNumber = await generateUniqueNumber("AP", tx);

    return tx.aPInvoice.create({
      data: {
        invoiceNumber,
        purchaseOrderId: data.purchaseOrderId?.trim() || null,
        goodsReceiptId: data.goodsReceiptId?.trim() || null,
        supplierId: data.supplierId,
        userId,
        status: "pending_approval",
        subtotal: data.subtotal,
        tax: tax > 0 ? tax : null,
        total,
        amountPaid: 0,
        amountDue: total,
        dueDate:
          data.dueDate != null && data.dueDate !== ""
            ? new Date(data.dueDate)
            : null,
        issuedAt: new Date(),
        notes: data.notes?.trim() || null,
        createdBy: userId,
        createdAt: new Date(),
      },
      include: {
        purchaseOrder: true,
        goodsReceipt: true,
      },
    });
  });
}

export async function recordAPInvoicePayment(
  id: string,
  data: RecordAPInvoicePaymentInput,
  userId: string,
) {
  const invoice = await prisma.aPInvoice.findFirst({
    where: { id, userId },
  });

  if (invoice == null) {
    throw new Error("AP invoice not found");
  }

  if (invoice.status === "cancelled") {
    throw new Error("Cancelled AP invoice cannot receive payment");
  }

  const nextAmountPaid = Number(invoice.amountPaid) + data.paymentAmount;
  const cappedAmountPaid = Math.min(nextAmountPaid, Number(invoice.total));
  const nextAmountDue = Math.max(0, Number(invoice.total) - cappedAmountPaid);

  let nextStatus: "unpaid" | "partial" | "paid";
  if (cappedAmountPaid <= 0) {
    nextStatus = "unpaid";
  } else if (nextAmountDue <= 0) {
    nextStatus = "paid";
  } else {
    nextStatus = "partial";
  }

  const mergedNotes = [invoice.notes, data.notes]
    .filter((text): text is string => text != null && text.trim() !== "")
    .join("\n");

  return prisma.aPInvoice.update({
    where: { id: invoice.id },
    data: {
      amountPaid: cappedAmountPaid,
      amountDue: nextAmountDue,
      status: nextStatus,
      paidAt: nextStatus === "paid" ? new Date() : invoice.paidAt,
      notes: mergedNotes || null,
      updatedAt: new Date(),
      updatedBy: userId,
    },
    include: {
      purchaseOrder: true,
      goodsReceipt: true,
    },
  });
}

export function normalizeBigInt<T>(value: T): T {
  if (value == null) {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeBigInt(entry)) as T;
  }

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = normalizeBigInt(entry);
    }
    return output as T;
  }

  return value;
}

export function toIsoDates<T>(value: T): T {
  if (value == null) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toIsoDates(entry)) as T;
  }

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = toIsoDates(entry);
    }
    return output as T;
  }

  return value;
}

export function serializeP2PResult<T>(value: T): T {
  try {
    return toIsoDates(normalizeBigInt(value));
  } catch (error) {
    logger.error("Failed to serialize P2P result", error);
    throw error;
  }
}
