import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canApproveVendorBill,
  canCreatePurchaseOrder,
  canCreateVendorBill,
  canPayVendorBill,
  canReceivePurchaseOrder,
  isInternalRole,
} from "@/lib/role-helpers";

describe("P2P BPMN role helpers", () => {
  it("allows the BPMN P2P role sequence and preserves AP compatibility", () => {
    expect(canCreatePurchaseOrder("purchasing_manager")).toBe(true);
    expect(canReceivePurchaseOrder("inventory_manager")).toBe(true);
    expect(canCreateVendorBill("ap_analyst")).toBe(true);
    expect(canApproveVendorBill("ap_analyst")).toBe(true);
    expect(canPayVendorBill("ap_analyst")).toBe(true);

  });

  it("does not treat generic user/client/supplier as internal P2P roles", () => {
    expect(isInternalRole("user")).toBe(false);
    expect(isInternalRole("client")).toBe(false);
    expect(isInternalRole("supplier")).toBe(false);
    expect(canCreatePurchaseOrder("user")).toBe(false);
    expect(canReceivePurchaseOrder("user")).toBe(false);
    expect(canCreateVendorBill("user")).toBe(false);
    expect(canPayVendorBill("user")).toBe(false);
  });
});

describe("P2P linked data visibility and integrity", () => {
  const purchaseOrderFindMany = vi.fn();
  const aPInvoiceFindUnique = vi.fn();
  const aPInvoiceFindFirst = vi.fn();
  const aPInvoiceUpdate = vi.fn();
  const billPaymentCreate = vi.fn();
  const purchaseOrderFindFirst = vi.fn();
  const goodsReceiptFindFirst = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    vi.doMock("@/prisma/client", () => ({
      prisma: {
        purchaseOrder: {
          findMany: purchaseOrderFindMany,
          findFirst: purchaseOrderFindFirst,
        },
        aPInvoice: {
          findUnique: aPInvoiceFindUnique,
          findFirst: aPInvoiceFindFirst,
          update: aPInvoiceUpdate,
        },
        goodsReceipt: {
          findFirst: goodsReceiptFindFirst,
        },
        billPayment: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: billPaymentCreate,
        },
        $transaction: async <T>(callback: (tx: unknown) => Promise<T>) =>
          callback({
            aPInvoice: { findUnique: aPInvoiceFindUnique, update: aPInvoiceUpdate },
            billPayment: { create: billPaymentCreate },
          }),
      },
    }));
  });

  it("lists purchase orders without a userId filter for role-switch visibility", async () => {
    purchaseOrderFindMany.mockResolvedValueOnce([]);

    const { getPurchaseOrders } = await import("@/prisma/p2p");
    await getPurchaseOrders();

    expect(purchaseOrderFindMany).toHaveBeenCalledWith({
      where: {},
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
  });

  it("blocks vendor bills above received unbilled PO value", async () => {
    purchaseOrderFindFirst.mockResolvedValueOnce({
      id: "po-1",
      items: [
        {
          receivedQuantity: BigInt(2),
          billedQuantity: BigInt(0),
          unitCost: 50,
        },
      ],
    });

    const { createVendorBillFromItemReceipt } = await import("@/prisma/netsuite");

    await expect(
      createVendorBillFromItemReceipt(
        {
          supplierId: "supplier-1",
          purchaseOrderId: "po-1",
          subtotal: 150,
        },
        "ar-user",
      ),
    ).rejects.toThrow("Vendor bill amount exceeds received unbilled value");
  });

  it("requires vendor bill approval before payment", async () => {
    aPInvoiceFindUnique.mockResolvedValueOnce({
      id: "bill-1",
      status: "pending_approval",
      amountDue: 100,
    });

    const { recordBillPayment } = await import("@/prisma/netsuite");

    await expect(
      recordBillPayment(
        { apInvoiceId: "bill-1", paymentAmount: 25 },
        "ar-user",
      ),
    ).rejects.toThrow("Vendor bill must be approved before payment");
  });

  it("applies bill payment only up to current amount due", async () => {
    aPInvoiceFindUnique.mockResolvedValueOnce({
      id: "bill-1",
      status: "unpaid",
      amountDue: 40,
    });
    aPInvoiceFindFirst.mockResolvedValueOnce({
      id: "bill-1",
      status: "unpaid",
      amountPaid: 0,
      amountDue: 40,
      total: 100,
      paidAt: null,
      notes: null,
    });
    aPInvoiceFindUnique.mockResolvedValueOnce(null);
    aPInvoiceUpdate.mockResolvedValueOnce({
      id: "bill-1",
      purchaseOrderId: "po-1",
      status: "partially_paid",
      amountPaid: 40,
      amountDue: 0,
      total: 100,
      paidAt: null,
      notes: null,
    });
    billPaymentCreate.mockResolvedValueOnce({ id: "payment-1" });

    const { recordBillPayment } = await import("@/prisma/netsuite");
    await recordBillPayment({ apInvoiceId: "bill-1", paymentAmount: 75 }, "ar-user");

    expect(billPaymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountApplied: 40,
          amountRemaining: 35,
        }),
      }),
    );
  });
});
