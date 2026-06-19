import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canAdjustInventory,
  canManageItemMaster,
  canMonitorInventory,
  canReceivePurchaseOrder,
  isInternalRole,
} from "@/lib/role-helpers";

describe("Inventory role helpers", () => {
  it("keeps Warehouse Staff scoped to receipt/monitoring, not adjustment approval", () => {
    expect(canReceivePurchaseOrder("warehouse_staff")).toBe(true);
    expect(canMonitorInventory("warehouse_staff")).toBe(true);
    expect(canAdjustInventory("warehouse_staff")).toBe(false);
  });

  it("allows Inventory Manager to adjust, transfer, reverse, and monitor inventory", () => {
    expect(canAdjustInventory("inventory_manager")).toBe(true);
    expect(canMonitorInventory("inventory_manager")).toBe(true);
  });

  it("allows Purchasing Manager item master work without making generic user internal", () => {
    expect(canManageItemMaster("purchasing_manager")).toBe(true);
    expect(isInternalRole("user")).toBe(false);
    expect(canManageItemMaster("user")).toBe(false);
    expect(canAdjustInventory("user")).toBe(false);
    expect(canMonitorInventory("user")).toBe(false);
  });
});

describe("Inventory role-switch visibility and ledger integrity", () => {
  const productFindMany = vi.fn();
  const stockAllocationFindMany = vi.fn();
  const stockTransferFindMany = vi.fn();
  const stockMovementFindMany = vi.fn();
  const stockTransferFindFirst = vi.fn();
  const stockMovementFindFirst = vi.fn();
  const stockMovementCreate = vi.fn();
  const stockMovementDelete = vi.fn();
  const stockAllocationFindUnique = vi.fn();
  const stockAllocationUpdate = vi.fn();
  const stockAllocationCreate = vi.fn();
  const productUpdate = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    vi.doMock("@/prisma/client", () => ({
      prisma: {
        product: {
          findMany: productFindMany,
          update: productUpdate,
        },
        stockAllocation: {
          findMany: stockAllocationFindMany,
          findUnique: stockAllocationFindUnique,
          update: stockAllocationUpdate,
          create: stockAllocationCreate,
        },
        stockTransfer: {
          findMany: stockTransferFindMany,
          findFirst: stockTransferFindFirst,
        },
        stockMovement: {
          findMany: stockMovementFindMany,
          findFirst: stockMovementFindFirst,
          create: stockMovementCreate,
          delete: stockMovementDelete,
        },
        $transaction: async <T>(callback: (tx: unknown) => Promise<T>) =>
          callback({
            stockMovement: {
              findFirst: stockMovementFindFirst,
              create: stockMovementCreate,
              delete: stockMovementDelete,
            },
            stockAllocation: {
              findUnique: stockAllocationFindUnique,
              update: stockAllocationUpdate,
              create: stockAllocationCreate,
            },
            product: { update: productUpdate },
          }),
      },
    }));
  });

  it("lists products/allocations without a userId-only product filter for internal inventory visibility", async () => {
    productFindMany.mockResolvedValueOnce([{ id: "product-1" }]);
    stockAllocationFindMany.mockResolvedValueOnce([]);

    const { getStockAllocations } = await import("@/prisma/stock-allocation");
    await getStockAllocations();

    const productQuery = productFindMany.mock.calls[0]?.[0];
    expect(JSON.stringify(productQuery.where)).not.toContain("userId");
    expect(productQuery).toEqual(
      expect.objectContaining({
        select: { id: true },
      }),
    );
    expect(stockAllocationFindMany).toHaveBeenCalledWith({
      where: { productId: { in: ["product-1"] } },
      orderBy: { createdAt: "desc" },
    });
  });

  it("lists transfers and stock movements without current user ownership filters", async () => {
    stockTransferFindMany.mockResolvedValueOnce([]);
    stockMovementFindMany.mockResolvedValueOnce([]);

    const { getStockTransfers, getStockMovements } = await import("@/prisma/stock-allocation");
    await getStockTransfers();
    await getStockMovements(undefined, { warehouseId: "wh-1", productId: "p-1" });

    expect(stockTransferFindMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: "desc" },
    });
    expect(stockMovementFindMany).toHaveBeenCalledWith({
      where: { warehouseId: "wh-1", productId: "p-1" },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  });

  it("reverses stock issue through compensating movement and never deletes the original movement", async () => {
    stockMovementFindFirst
      .mockResolvedValueOnce({
        id: "issue-1",
        productId: "product-1",
        warehouseId: "warehouse-1",
        quantityChange: BigInt(-4),
      })
      .mockResolvedValueOnce(null);
    stockAllocationFindUnique.mockResolvedValueOnce({ id: "alloc-1" });
    stockAllocationUpdate.mockResolvedValueOnce({});
    productUpdate.mockResolvedValueOnce({});
    stockMovementCreate.mockResolvedValueOnce({ id: "reversal-1" });

    const { reverseStockIssue } = await import("@/prisma/stock-allocation");
    await reverseStockIssue("issue-1", { notes: "storno" }, "inventory-user");

    expect(stockMovementDelete).not.toHaveBeenCalled();
    expect(stockMovementCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          movementType: "reversal",
          quantityChange: BigInt(4),
          referenceType: "reversal",
          referenceId: "issue-1",
        }),
      }),
    );
  });
});
