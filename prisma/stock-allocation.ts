/**
 * Stock Allocation, Transfer, Issue, and Movement Prisma helpers
 */

import { prisma } from "@/prisma/client";
import { mergeProductListWhere } from "@/lib/products/product-query";
import type {
  CreateStockAllocationInput,
  UpdateStockAllocationInput,
  CreateStockTransferInput,
  CreateStockIssueInput,
  ReverseStockIssueInput,
  ReverseStockTransferInput,
} from "@/types";
import type { Prisma } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

function toBigInt(value: number): bigint {
  return BigInt(Math.trunc(value));
}

async function createStockMovement(
  db: DbClient,
  data: {
    productId: string;
    warehouseId: string;
    userId: string;
    movementType: "receipt" | "issue" | "transfer_in" | "transfer_out" | "reversal";
    quantityChange: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
  },
) {
  return db.stockMovement.create({
    data: {
      productId: data.productId,
      warehouseId: data.warehouseId,
      userId: data.userId,
      movementType: data.movementType,
      quantityChange: toBigInt(data.quantityChange),
      referenceType: data.referenceType ?? null,
      referenceId: data.referenceId ?? null,
      notes: data.notes?.trim() || null,
      createdAt: new Date(),
    },
  });
}

/**
 * Get all stock allocations for a user's products
 */
export async function getStockAllocations(userId?: string) {
  const productWhere = userId != null ? mergeProductListWhere({ userId }) : mergeProductListWhere({});
  const products = await prisma.product.findMany({
    where: productWhere,
    select: { id: true },
  });
  const productIds = products.map((product) => product.id);

  return prisma.stockAllocation.findMany({
    where: { productId: { in: productIds } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get stock allocations for a specific product
 */
export async function getStockAllocationsByProduct(productId: string) {
  return prisma.stockAllocation.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get stock allocations for a specific warehouse
 */
export async function getStockAllocationsByWarehouse(warehouseId: string) {
  return prisma.stockAllocation.findMany({
    where: { warehouseId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a single stock allocation
 */
export async function getStockAllocationById(id: string) {
  return prisma.stockAllocation.findUnique({
    where: { id },
  });
}

/**
 * Create or update stock allocation (upsert)
 */
export async function upsertStockAllocation(
  data: CreateStockAllocationInput,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.stockAllocation.findUnique({
      where: {
        productId_warehouseId: {
          productId: data.productId,
          warehouseId: data.warehouseId,
        },
      },
    });

    if (existing) {
      const currentQuantity = Number(existing.quantity);
      const nextQuantity = data.quantity;
      const delta = nextQuantity - currentQuantity;

      const updated = await tx.stockAllocation.update({
        where: { id: existing.id },
        data: {
          quantity: toBigInt(nextQuantity),
          updatedAt: new Date(),
        },
      });

      if (delta !== 0) {
        await createStockMovement(tx, {
          productId: data.productId,
          warehouseId: data.warehouseId,
          userId,
          movementType: delta > 0 ? "receipt" : "issue",
          quantityChange: delta,
          referenceType: "stock_allocation_adjustment",
          referenceId: updated.id,
          notes: `Manual allocation adjustment (${delta > 0 ? "+" : ""}${delta})`,
        });

        await tx.product.update({
          where: { id: data.productId },
          data: {
            quantity: { increment: delta },
            updatedAt: new Date(),
            updatedBy: userId,
          },
        });
      }

      return updated;
    }

    const created = await tx.stockAllocation.create({
      data: {
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: toBigInt(data.quantity),
        userId,
        createdAt: new Date(),
      },
    });

    if (data.quantity !== 0) {
      await createStockMovement(tx, {
        productId: data.productId,
        warehouseId: data.warehouseId,
        userId,
        movementType: "receipt",
        quantityChange: data.quantity,
        referenceType: "stock_allocation_adjustment",
        referenceId: created.id,
        notes: `Initial allocation (${data.quantity})`,
      });

      await tx.product.update({
        where: { id: data.productId },
        data: {
          quantity: { increment: data.quantity },
          updatedAt: new Date(),
          updatedBy: userId,
        },
      });
    }

    return created;
  });
}

/**
 * Update stock allocation
 */
export async function updateStockAllocation(
  id: string,
  data: UpdateStockAllocationInput,
) {
  return prisma.stockAllocation.update({
    where: { id },
    data: {
      ...data,
      quantity:
        typeof data.quantity === "number" ? toBigInt(data.quantity) : undefined,
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete stock allocation
 */
export async function deleteStockAllocation(id: string) {
  return prisma.stockAllocation.delete({
    where: { id },
  });
}

/**
 * Get all stock transfers for a user
 */
export async function getStockTransfers(userId?: string) {
  return prisma.stockTransfer.findMany({
    where: userId != null ? { userId } : {},
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get one transfer
 */
export async function getStockTransferById(id: string, userId?: string) {
  return prisma.stockTransfer.findFirst({
    where: userId ? { id, userId } : { id },
  });
}

/**
 * Create transfer (pending)
 */
export async function createStockTransfer(
  data: CreateStockTransferInput,
  userId: string,
) {
  if (data.fromWarehouseId === data.toWarehouseId) {
    throw new Error("Source and destination warehouse must be different");
  }

  const sourceAllocation = await prisma.stockAllocation.findUnique({
    where: {
      productId_warehouseId: {
        productId: data.productId,
        warehouseId: data.fromWarehouseId,
      },
    },
  });

  if (!sourceAllocation) {
    throw new Error("Source warehouse has no stock allocation for this product");
  }

  const availableStock =
    Number(sourceAllocation.quantity) - Number(sourceAllocation.reservedQuantity);
  if (availableStock < data.quantity) {
    throw new Error(
      `Insufficient stock in source warehouse. Available: ${availableStock}, Requested: ${data.quantity}`,
    );
  }

  return prisma.stockTransfer.create({
    data: {
      productId: data.productId,
      fromWarehouseId: data.fromWarehouseId,
      toWarehouseId: data.toWarehouseId,
      quantity: toBigInt(data.quantity),
      status: "pending",
      notes: data.notes?.trim() || null,
      userId,
      createdAt: new Date(),
    },
  });
}

/**
 * Complete transfer
 */
export async function completeStockTransfer(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.findFirst({
      where: { id },
    });

    if (!transfer) {
      throw new Error("Transfer not found");
    }

    if (transfer.status !== "pending") {
      throw new Error("Transfer is not pending");
    }

    const quantity = Number(transfer.quantity);

    const sourceAllocation = await tx.stockAllocation.findUnique({
      where: {
        productId_warehouseId: {
          productId: transfer.productId,
          warehouseId: transfer.fromWarehouseId,
        },
      },
    });

    if (!sourceAllocation) {
      throw new Error("Source allocation not found");
    }

    const availableStock =
      Number(sourceAllocation.quantity) - Number(sourceAllocation.reservedQuantity);
    if (availableStock < quantity) {
      throw new Error("Insufficient source stock to complete transfer");
    }

    await tx.stockAllocation.update({
      where: {
        productId_warehouseId: {
          productId: transfer.productId,
          warehouseId: transfer.fromWarehouseId,
        },
      },
      data: {
        quantity: { decrement: quantity },
        updatedAt: new Date(),
      },
    });

    const destinationAllocation = await tx.stockAllocation.findUnique({
      where: {
        productId_warehouseId: {
          productId: transfer.productId,
          warehouseId: transfer.toWarehouseId,
        },
      },
    });

    if (destinationAllocation) {
      await tx.stockAllocation.update({
        where: { id: destinationAllocation.id },
        data: {
          quantity: { increment: quantity },
          updatedAt: new Date(),
        },
      });
    } else {
      await tx.stockAllocation.create({
        data: {
          productId: transfer.productId,
          warehouseId: transfer.toWarehouseId,
          quantity: toBigInt(quantity),
          userId,
          createdAt: new Date(),
        },
      });
    }

    const completed = await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    await createStockMovement(tx, {
      productId: transfer.productId,
      warehouseId: transfer.fromWarehouseId,
      userId,
      movementType: "transfer_out",
      quantityChange: -quantity,
      referenceType: "stock_transfer",
      referenceId: completed.id,
      notes: `Transfer out to warehouse ${transfer.toWarehouseId}`,
    });

    await createStockMovement(tx, {
      productId: transfer.productId,
      warehouseId: transfer.toWarehouseId,
      userId,
      movementType: "transfer_in",
      quantityChange: quantity,
      referenceType: "stock_transfer",
      referenceId: completed.id,
      notes: `Transfer in from warehouse ${transfer.fromWarehouseId}`,
    });

    return completed;
  });
}

/**
 * Cancel transfer
 */
export async function cancelStockTransfer(id: string, userId: string) {
  const transfer = await prisma.stockTransfer.findFirst({
    where: { id },
  });

  if (!transfer) {
    throw new Error("Transfer not found");
  }

  if (transfer.status !== "pending") {
    throw new Error("Transfer is not pending");
  }

  return prisma.stockTransfer.update({
    where: { id: transfer.id },
    data: {
      status: "cancelled",
    },
  });
}

/**
 * Reverse completed transfer by creating compensating completed transfer.
 */
export async function reverseStockTransfer(
  id: string,
  data: ReverseStockTransferInput,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.stockTransfer.findFirst({
      where: { id },
    });

    if (!original) {
      throw new Error("Transfer not found");
    }

    if (original.status !== "completed") {
      throw new Error("Only completed transfer can be reversed");
    }

    if (original.reversalTransferId) {
      throw new Error("Transfer has already been reversed");
    }

    const quantity = Number(original.quantity);

    const destinationAllocation = await tx.stockAllocation.findUnique({
      where: {
        productId_warehouseId: {
          productId: original.productId,
          warehouseId: original.toWarehouseId,
        },
      },
    });

    if (!destinationAllocation) {
      throw new Error("Destination allocation not found for reversal");
    }

    const destinationAvailable =
      Number(destinationAllocation.quantity) -
      Number(destinationAllocation.reservedQuantity);
    if (destinationAvailable < quantity) {
      throw new Error("Insufficient destination stock to reverse transfer");
    }

    await tx.stockAllocation.update({
      where: {
        productId_warehouseId: {
          productId: original.productId,
          warehouseId: original.toWarehouseId,
        },
      },
      data: {
        quantity: { decrement: quantity },
        updatedAt: new Date(),
      },
    });

    const sourceAllocation = await tx.stockAllocation.findUnique({
      where: {
        productId_warehouseId: {
          productId: original.productId,
          warehouseId: original.fromWarehouseId,
        },
      },
    });

    if (sourceAllocation) {
      await tx.stockAllocation.update({
        where: { id: sourceAllocation.id },
        data: {
          quantity: { increment: quantity },
          updatedAt: new Date(),
        },
      });
    } else {
      await tx.stockAllocation.create({
        data: {
          productId: original.productId,
          warehouseId: original.fromWarehouseId,
          quantity: toBigInt(quantity),
          userId,
          createdAt: new Date(),
        },
      });
    }

    const reversal = await tx.stockTransfer.create({
      data: {
        productId: original.productId,
        fromWarehouseId: original.toWarehouseId,
        toWarehouseId: original.fromWarehouseId,
        quantity: original.quantity,
        status: "completed",
        notes:
          data.notes?.trim() || `Reversal transfer for ${original.id}`,
        userId,
        reversalOfId: original.id,
        createdAt: new Date(),
        completedAt: new Date(),
      },
    });

    await tx.stockTransfer.update({
      where: { id: original.id },
      data: {
        reversalTransferId: reversal.id,
        reversedAt: new Date(),
        reversedBy: userId,
      },
    });

    await createStockMovement(tx, {
      productId: original.productId,
      warehouseId: original.toWarehouseId,
      userId,
      movementType: "reversal",
      quantityChange: -quantity,
      referenceType: "stock_transfer",
      referenceId: original.id,
      notes: `Reverse transfer ${original.id} (out from destination)`,
    });

    await createStockMovement(tx, {
      productId: original.productId,
      warehouseId: original.fromWarehouseId,
      userId,
      movementType: "reversal",
      quantityChange: quantity,
      referenceType: "stock_transfer",
      referenceId: original.id,
      notes: `Reverse transfer ${original.id} (back to source)`,
    });

    return reversal;
  });
}

/**
 * Get stock movement log for stock card.
 */
export async function getStockMovements(
  userId?: string,
  filters?: { warehouseId?: string; productId?: string; limit?: number },
) {
  const where: Record<string, unknown> = userId != null ? { userId } : {};

  if (filters?.warehouseId) {
    where.warehouseId = filters.warehouseId;
  }

  if (filters?.productId) {
    where.productId = filters.productId;
  }

  const take = Math.min(filters?.limit ?? 200, 500);

  return prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
  });
}

/**
 * Get issue movements.
 */
export async function getStockIssues(
  userId?: string,
  filters?: { warehouseId?: string; productId?: string; limit?: number },
) {
  const where: Record<string, unknown> = {
    ...(userId != null ? { userId } : {}),
    referenceType: "stock_issue",
    movementType: "issue",
  };

  if (filters?.warehouseId) {
    where.warehouseId = filters.warehouseId;
  }

  if (filters?.productId) {
    where.productId = filters.productId;
  }

  const take = Math.min(filters?.limit ?? 200, 500);

  return prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
  });
}

/**
 * Issue stock from a warehouse.
 */
export async function createStockIssue(
  data: CreateStockIssueInput,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const allocation = await tx.stockAllocation.findUnique({
      where: {
        productId_warehouseId: {
          productId: data.productId,
          warehouseId: data.warehouseId,
        },
      },
    });

    if (!allocation) {
      throw new Error("Stock allocation not found for product and warehouse");
    }

    const availableStock =
      Number(allocation.quantity) - Number(allocation.reservedQuantity);

    if (availableStock < data.quantity) {
      throw new Error(
        `Insufficient available stock. Available: ${availableStock}, Requested: ${data.quantity}`,
      );
    }

    await tx.stockAllocation.update({
      where: { id: allocation.id },
      data: {
        quantity: { decrement: data.quantity },
        updatedAt: new Date(),
      },
    });

    await tx.product.update({
      where: { id: data.productId },
      data: {
        quantity: { decrement: data.quantity },
        updatedAt: new Date(),
        updatedBy: userId,
      },
    });

    return createStockMovement(tx, {
      productId: data.productId,
      warehouseId: data.warehouseId,
      userId,
      movementType: "issue",
      quantityChange: -data.quantity,
      referenceType: "stock_issue",
      notes: data.notes ?? "Stock issue",
    });
  });
}

/**
 * Reverse stock issue by issue movement id.
 */
export async function reverseStockIssue(
  issueMovementId: string,
  data: ReverseStockIssueInput,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const issueMovement = await tx.stockMovement.findFirst({
      where: {
        id: issueMovementId,
        referenceType: "stock_issue",
        movementType: "issue",
      },
    });

    if (!issueMovement) {
      throw new Error("Issue movement not found");
    }

    const existingReversal = await tx.stockMovement.findFirst({
      where: {
        referenceType: "reversal",
        referenceId: issueMovement.id,
      },
      select: { id: true },
    });

    if (existingReversal) {
      throw new Error("Issue movement has already been reversed");
    }

    const quantity = Math.abs(Number(issueMovement.quantityChange));

    const allocation = await tx.stockAllocation.findUnique({
      where: {
        productId_warehouseId: {
          productId: issueMovement.productId,
          warehouseId: issueMovement.warehouseId,
        },
      },
    });

    if (allocation) {
      await tx.stockAllocation.update({
        where: { id: allocation.id },
        data: {
          quantity: { increment: quantity },
          updatedAt: new Date(),
        },
      });
    } else {
      await tx.stockAllocation.create({
        data: {
          productId: issueMovement.productId,
          warehouseId: issueMovement.warehouseId,
          quantity: toBigInt(quantity),
          userId,
          createdAt: new Date(),
        },
      });
    }

    await tx.product.update({
      where: { id: issueMovement.productId },
      data: {
        quantity: { increment: quantity },
        updatedAt: new Date(),
        updatedBy: userId,
      },
    });

    return createStockMovement(tx, {
      productId: issueMovement.productId,
      warehouseId: issueMovement.warehouseId,
      userId,
      movementType: "reversal",
      quantityChange: quantity,
      referenceType: "reversal",
      referenceId: issueMovement.id,
      notes: data.notes ?? `Reverse issue ${issueMovement.id}`,
    });
  });
}

/**
 * Get warehouse stock summary (for analytics)
 */
export async function getWarehouseStockSummary(userId?: string) {
  const productWhere = userId != null ? mergeProductListWhere({ userId }) : mergeProductListWhere({});
  const products = await prisma.product.findMany({
    where: productWhere,
    select: { id: true, price: true },
  });
  const productIds = products.map((product) => product.id);
  const priceMap = new Map(products.map((product) => [product.id, Number(product.price)]));

  const warehouses = await prisma.warehouse.findMany({
    where: userId != null ? { userId } : {},
    select: { id: true, name: true },
  });

  const allocations = await prisma.stockAllocation.findMany({
    where: { productId: { in: productIds } },
  });

  return warehouses.map((warehouse) => {
    const warehouseAllocations = allocations.filter(
      (allocation) => allocation.warehouseId === warehouse.id,
    );

    const totalProducts = warehouseAllocations.length;
    const totalQuantity = warehouseAllocations.reduce(
      (sum, allocation) => sum + Number(allocation.quantity),
      0,
    );
    const totalReserved = warehouseAllocations.reduce(
      (sum, allocation) => sum + Number(allocation.reservedQuantity),
      0,
    );
    const totalValue = warehouseAllocations.reduce((sum, allocation) => {
      const price = priceMap.get(allocation.productId) ?? 0;
      return sum + Number(allocation.quantity) * price;
    }, 0);

    return {
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      totalProducts,
      totalQuantity,
      totalReserved,
      totalValue,
    };
  });
}
