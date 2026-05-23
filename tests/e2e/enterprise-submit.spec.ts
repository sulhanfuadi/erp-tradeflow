import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type APIResponse,
  type Page,
} from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

type ScenarioStatus = "PASS" | "FAIL";

interface ScenarioEvidence {
  scenarioId: string;
  title: string;
  status: ScenarioStatus;
  startedAt: string;
  finishedAt?: string;
  notes?: string[];
  assertions?: Record<string, unknown>;
  ids?: Record<string, string | number | null | undefined>;
  artifactPath?: string;
  error?: string;
}

interface TestState {
  categoryId: string;
  supplierId: string;
  warehouseMainId: string;
  warehouseSecondaryId: string;
  productId: string;
  orderId: string;
  invoiceId: string;
  purchaseOrderId: string;
  purchaseOrderItemId: string;
  goodsReceiptId: string;
  apInvoiceId: string;
  transferId: string;
  transferReversalId: string;
  issueId: string;
  issueReversalId: string;
  poQuantity: number;
  poUnitCost: number;
  productQuantityAfterGoodsReceipt: number;
}

interface ApiCallResult {
  status: number;
  ok: boolean;
  body: unknown;
}

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const AUTH_STATE = path.join(process.cwd(), "tests/e2e/.auth/user.json");
const EVIDENCE_DIR = path.join(process.cwd(), "docs/evidence/auto");
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const state: TestState = {
  categoryId: "",
  supplierId: "",
  warehouseMainId: "",
  warehouseSecondaryId: "",
  productId: "",
  orderId: "",
  invoiceId: "",
  purchaseOrderId: "",
  purchaseOrderItemId: "",
  goodsReceiptId: "",
  apInvoiceId: "",
  transferId: "",
  transferReversalId: "",
  issueId: "",
  issueReversalId: "",
  poQuantity: 6,
  poUnitCost: 12000,
  productQuantityAfterGoodsReceipt: 0,
};

function asObject(value: unknown): Record<string, unknown> {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function parseResponseBody(response: APIResponse): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === "") return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

async function apiCall(
  api: APIRequestContext,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  data?: unknown,
): Promise<ApiCallResult> {
  const response =
    data === undefined
      ? await api.fetch(url, { method })
      : await api.fetch(url, { method, data });

  return {
    status: response.status(),
    ok: response.ok(),
    body: await parseResponseBody(response),
  };
}

async function writeEvidence(
  scenarioId: string,
  evidence: ScenarioEvidence,
): Promise<void> {
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });
  await fs.writeFile(
    path.join(EVIDENCE_DIR, `${scenarioId}.json`),
    JSON.stringify(evidence, null, 2),
    "utf-8",
  );
}

async function captureScreenshot(
  page: Page,
  scenarioId: string,
  route: string,
): Promise<string> {
  const relativePath = `docs/evidence/auto/${scenarioId}.png`;
  const fullPath = path.join(process.cwd(), relativePath);

  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: fullPath, fullPage: true });

  return relativePath;
}

test.describe("Submission E2E TS-01..TS-08", () => {
  test.describe.configure({ mode: "serial" });

  let api: APIRequestContext;

  test.beforeAll(async () => {
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
    api = await playwrightRequest.newContext({
      baseURL: BASE_URL,
      storageState: AUTH_STATE,
    });
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test("TS-01 O2C: order + reservation + oversell prevention", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-01",
      title: "O2C order create + reservation + oversell prevention",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      const categoryRes = await apiCall(api, "POST", "/api/categories", {
        name: `E2E Category ${RUN_ID}`,
        status: true,
        description: "Kategori untuk automation test",
      });
      expect(categoryRes.status).toBe(201);
      state.categoryId = asString(asObject(categoryRes.body).id);
      expect(state.categoryId).not.toBe("");

      const supplierRes = await apiCall(api, "POST", "/api/suppliers", {
        name: `E2E Supplier ${RUN_ID}`,
        status: true,
        description: "Supplier untuk automation test",
      });
      expect(supplierRes.status).toBe(201);
      state.supplierId = asString(asObject(supplierRes.body).id);
      expect(state.supplierId).not.toBe("");

      const warehouseMainRes = await apiCall(api, "POST", "/api/warehouses", {
        name: `WH-Main-${RUN_ID}`,
        address: "Jakarta",
        type: "main",
        status: true,
      });
      expect(warehouseMainRes.status).toBe(201);
      state.warehouseMainId = asString(asObject(warehouseMainRes.body).id);
      expect(state.warehouseMainId).not.toBe("");

      const warehouseSecondaryRes = await apiCall(
        api,
        "POST",
        "/api/warehouses",
        {
          name: `WH-Secondary-${RUN_ID}`,
          address: "Bandung",
          type: "secondary",
          status: true,
        },
      );
      expect(warehouseSecondaryRes.status).toBe(201);
      state.warehouseSecondaryId = asString(
        asObject(warehouseSecondaryRes.body).id,
      );
      expect(state.warehouseSecondaryId).not.toBe("");

      const productRes = await apiCall(api, "POST", "/api/products", {
        name: `E2E Product ${RUN_ID}`,
        sku: `E2E-SKU-${RUN_ID}`,
        price: 15000,
        quantity: 30,
        status: "active",
        categoryId: state.categoryId,
        supplierId: state.supplierId,
      });
      expect(productRes.status).toBe(201);
      state.productId = asString(asObject(productRes.body).id);
      expect(state.productId).not.toBe("");

      const allocationRes = await apiCall(api, "POST", "/api/stock-allocations", {
        productId: state.productId,
        warehouseId: state.warehouseMainId,
        quantity: 20,
      });
      expect(allocationRes.status).toBe(201);

      const productBeforeOrder = await apiCall(
        api,
        "GET",
        `/api/products/${state.productId}`,
      );
      expect(productBeforeOrder.status).toBe(200);
      const reservedBefore = asNumber(
        asObject(productBeforeOrder.body).reservedQuantity,
      );

      const orderRes = await apiCall(api, "POST", "/api/orders", {
        items: [{ productId: state.productId, quantity: 3 }],
        shippingAddress: {
          street: "Jalan Mawar 1",
          city: "Jakarta",
          state: "DKI Jakarta",
          zipCode: "10110",
          country: "Indonesia",
        },
        billingAddress: {
          street: "Jalan Melati 2",
          city: "Jakarta",
          state: "DKI Jakarta",
          zipCode: "10120",
          country: "Indonesia",
        },
        tax: 3000,
        shipping: 12000,
        notes: "TS-01 order creation",
      });
      expect(orderRes.status).toBe(201);
      state.orderId = asString(asObject(orderRes.body).id);
      expect(state.orderId).not.toBe("");

      const productAfterOrder = await apiCall(
        api,
        "GET",
        `/api/products/${state.productId}`,
      );
      expect(productAfterOrder.status).toBe(200);
      const reservedAfter = asNumber(asObject(productAfterOrder.body).reservedQuantity);
      expect(reservedAfter).toBe(reservedBefore + 3);

      const oversellRes = await apiCall(api, "POST", "/api/orders", {
        items: [{ productId: state.productId, quantity: 9999 }],
        shippingAddress: {
          street: "Jalan Gagal 1",
          city: "Jakarta",
          state: "DKI Jakarta",
          zipCode: "10130",
          country: "Indonesia",
        },
        billingAddress: {
          street: "Jalan Gagal 2",
          city: "Jakarta",
          state: "DKI Jakarta",
          zipCode: "10140",
          country: "Indonesia",
        },
      });

      expect(oversellRes.status).toBeGreaterThanOrEqual(400);
      const oversellError = asString(asObject(oversellRes.body).error).toLowerCase();
      expect(
        oversellError.includes("insufficient") ||
          oversellError.includes("stock") ||
          oversellError.includes("available"),
      ).toBeTruthy();

      evidence.assertions = {
        categoryCreated: state.categoryId !== "",
        supplierCreated: state.supplierId !== "",
        warehousesCreated: state.warehouseMainId !== "" && state.warehouseSecondaryId !== "",
        productCreated: state.productId !== "",
        orderCreated: state.orderId !== "",
        reservedBefore,
        reservedAfter,
        oversellStatus: oversellRes.status,
      };
      evidence.ids = {
        categoryId: state.categoryId,
        supplierId: state.supplierId,
        warehouseMainId: state.warehouseMainId,
        warehouseSecondaryId: state.warehouseSecondaryId,
        productId: state.productId,
        orderId: state.orderId,
      };
      evidence.notes = [
        "Master data berhasil dibuat via API.",
        "Reserved quantity naik setelah order.",
        "Oversell prevention aktif.",
      ];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        const route = state.orderId ? `/orders/${state.orderId}` : "/orders";
        evidence.artifactPath = await captureScreenshot(page, "TS-01", route);
      } catch (error) {
        evidence.notes = [...(evidence.notes ?? []), `Screenshot error: ${toErrorMessage(error)}`];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-01", evidence);
    }
  });

  test("TS-02 O2C: create invoice", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-02",
      title: "O2C invoice creation",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      expect(state.orderId).not.toBe("");

      const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const invoiceRes = await apiCall(api, "POST", "/api/invoices", {
        orderId: state.orderId,
        dueDate,
        tax: 3000,
        shipping: 12000,
        notes: "TS-02 invoice creation",
      });

      expect(invoiceRes.status).toBe(201);
      const invoiceBody = asObject(invoiceRes.body);
      state.invoiceId = asString(invoiceBody.id);
      expect(state.invoiceId).not.toBe("");
      expect(asString(invoiceBody.orderId)).toBe(state.orderId);

      evidence.assertions = {
        invoiceCreated: state.invoiceId !== "",
        linkedOrderId: asString(invoiceBody.orderId),
        invoiceStatus: asString(invoiceBody.status),
      };
      evidence.ids = {
        orderId: state.orderId,
        invoiceId: state.invoiceId,
      };
      evidence.notes = ["Invoice berhasil dibuat untuk order TS-01."];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        const route = state.invoiceId ? `/invoices/${state.invoiceId}` : "/invoices";
        evidence.artifactPath = await captureScreenshot(page, "TS-02", route);
      } catch (error) {
        evidence.notes = [...(evidence.notes ?? []), `Screenshot error: ${toErrorMessage(error)}`];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-02", evidence);
    }
  });

  test("TS-03 O2C: shipping and delivery status update", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-03",
      title: "O2C shipping and delivery update",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      expect(state.orderId).not.toBe("");

      const shippedAt = new Date().toISOString();
      const estimatedDelivery = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        .toISOString();
      const deliveredAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString();

      const shipRes = await apiCall(api, "PUT", `/api/orders/${state.orderId}`, {
        status: "shipped",
        trackingNumber: `TRK-${RUN_ID}`,
        trackingUrl: "https://tracking.example.com/shipments/demo",
        shippedAt,
        estimatedDelivery,
      });
      expect(shipRes.status).toBe(200);
      expect(asString(asObject(shipRes.body).status)).toBe("shipped");

      const deliverRes = await apiCall(api, "PUT", `/api/orders/${state.orderId}`, {
        status: "delivered",
        deliveredAt,
      });
      expect(deliverRes.status).toBe(200);

      const deliveredBody = asObject(deliverRes.body);
      expect(asString(deliveredBody.status)).toBe("delivered");
      expect(asString(deliveredBody.trackingNumber)).toContain(`TRK-${RUN_ID}`);

      evidence.assertions = {
        shippedStatus: asString(asObject(shipRes.body).status),
        deliveredStatus: asString(deliveredBody.status),
        trackingNumber: asString(deliveredBody.trackingNumber),
      };
      evidence.ids = {
        orderId: state.orderId,
      };
      evidence.notes = [
        "Order berhasil berubah ke shipped.",
        "Order berhasil berubah ke delivered.",
      ];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(
          page,
          "TS-03",
          `/orders/${state.orderId}`,
        );
      } catch (error) {
        evidence.notes = [...(evidence.notes ?? []), `Screenshot error: ${toErrorMessage(error)}`];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-03", evidence);
    }
  });

  test("TS-04 P2P: create and post purchase order", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-04",
      title: "P2P create PO then post",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      expect(state.supplierId).not.toBe("");
      expect(state.warehouseMainId).not.toBe("");
      expect(state.productId).not.toBe("");

      const poRes = await apiCall(api, "POST", "/api/p2p/purchase-orders", {
        supplierId: state.supplierId,
        warehouseId: state.warehouseMainId,
        tax: 1000,
        notes: "TS-04 PO create",
        items: [
          {
            productId: state.productId,
            quantity: state.poQuantity,
            unitCost: state.poUnitCost,
          },
        ],
      });

      expect(poRes.status).toBe(201);
      const poBody = asObject(poRes.body);
      state.purchaseOrderId = asString(poBody.id);
      expect(state.purchaseOrderId).not.toBe("");

      const poItems = asArray(poBody.items);
      expect(poItems.length).toBeGreaterThan(0);
      state.purchaseOrderItemId = asString(asObject(poItems[0]).id);
      expect(state.purchaseOrderItemId).not.toBe("");

      const poPostRes = await apiCall(
        api,
        "PATCH",
        `/api/p2p/purchase-orders/${state.purchaseOrderId}`,
        {
          status: "posted",
          notes: "TS-04 PO posted",
        },
      );

      expect(poPostRes.status).toBe(200);
      const poPostedBody = asObject(poPostRes.body);
      expect(asString(poPostedBody.status)).toBe("posted");

      evidence.assertions = {
        poCreated: state.purchaseOrderId !== "",
        poItemCaptured: state.purchaseOrderItemId !== "",
        poStatusAfterPatch: asString(poPostedBody.status),
      };
      evidence.ids = {
        purchaseOrderId: state.purchaseOrderId,
        purchaseOrderItemId: state.purchaseOrderItemId,
      };
      evidence.notes = ["PO berhasil dibuat lalu diposting."];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(page, "TS-04", "/procurement");
      } catch (error) {
        evidence.notes = [...(evidence.notes ?? []), `Screenshot error: ${toErrorMessage(error)}`];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-04", evidence);
    }
  });

  test("TS-05 P2P: goods receipt increases stock", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-05",
      title: "P2P goods receipt and stock increment",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      expect(state.purchaseOrderId).not.toBe("");
      expect(state.purchaseOrderItemId).not.toBe("");

      const productBeforeRes = await apiCall(
        api,
        "GET",
        `/api/products/${state.productId}`,
      );
      expect(productBeforeRes.status).toBe(200);
      const qtyBefore = asNumber(asObject(productBeforeRes.body).quantity);

      const goodsReceiptRes = await apiCall(api, "POST", "/api/p2p/goods-receipts", {
        purchaseOrderId: state.purchaseOrderId,
        notes: "TS-05 receive items",
        items: [
          {
            purchaseOrderItemId: state.purchaseOrderItemId,
            quantity: state.poQuantity,
          },
        ],
      });

      expect(goodsReceiptRes.status).toBe(201);
      const goodsReceiptBody = asObject(goodsReceiptRes.body);
      state.goodsReceiptId = asString(goodsReceiptBody.id);
      expect(state.goodsReceiptId).not.toBe("");
      expect(asString(goodsReceiptBody.status)).toBe("received");

      const productAfterRes = await apiCall(
        api,
        "GET",
        `/api/products/${state.productId}`,
      );
      expect(productAfterRes.status).toBe(200);
      const qtyAfter = asNumber(asObject(productAfterRes.body).quantity);
      state.productQuantityAfterGoodsReceipt = qtyAfter;

      expect(qtyAfter).toBe(qtyBefore + state.poQuantity);

      const poDetailRes = await apiCall(
        api,
        "GET",
        `/api/p2p/purchase-orders/${state.purchaseOrderId}`,
      );
      expect(poDetailRes.status).toBe(200);
      const poDetailBody = asObject(poDetailRes.body);

      evidence.assertions = {
        goodsReceiptCreated: state.goodsReceiptId !== "",
        goodsReceiptStatus: asString(goodsReceiptBody.status),
        productQtyBefore: qtyBefore,
        productQtyAfter: qtyAfter,
        poStatusAfterReceipt: asString(poDetailBody.status),
      };
      evidence.ids = {
        purchaseOrderId: state.purchaseOrderId,
        goodsReceiptId: state.goodsReceiptId,
      };
      evidence.notes = [
        "Goods receipt berhasil dibuat.",
        "Kuantitas produk bertambah sesuai quantity GR.",
      ];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(page, "TS-05", "/procurement");
      } catch (error) {
        evidence.notes = [...(evidence.notes ?? []), `Screenshot error: ${toErrorMessage(error)}`];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-05", evidence);
    }
  });

  test("TS-06 P2P: AP invoice payment flow + GR reversal", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-06",
      title: "P2P AP invoice unpaid->partial->paid and reverse GR",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      expect(state.goodsReceiptId).not.toBe("");

      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const apSubtotal = state.poQuantity * state.poUnitCost;
      const apTax = 500;
      const apTotal = apSubtotal + apTax;

      const apInvoiceRes = await apiCall(api, "POST", "/api/p2p/ap-invoices", {
        supplierId: state.supplierId,
        purchaseOrderId: state.purchaseOrderId,
        goodsReceiptId: state.goodsReceiptId,
        subtotal: apSubtotal,
        tax: apTax,
        dueDate,
        notes: "TS-06 AP invoice",
      });

      expect(apInvoiceRes.status).toBe(201);
      const apInvoiceBody = asObject(apInvoiceRes.body);
      state.apInvoiceId = asString(apInvoiceBody.id);
      expect(state.apInvoiceId).not.toBe("");
      expect(asString(apInvoiceBody.status)).toBe("unpaid");

      const partialPayment = Math.max(1, Math.floor(apTotal / 2));

      const partialPayRes = await apiCall(
        api,
        "POST",
        `/api/p2p/ap-invoices/${state.apInvoiceId}/payment`,
        {
          paymentAmount: partialPayment,
          notes: "TS-06 partial payment",
        },
      );
      expect(partialPayRes.status).toBe(200);
      const partialBody = asObject(partialPayRes.body);
      expect(asString(partialBody.status)).toBe("partial");

      const remainingAmount = asNumber(partialBody.amountDue);
      expect(remainingAmount).toBeGreaterThan(0);

      const finalPayRes = await apiCall(
        api,
        "POST",
        `/api/p2p/ap-invoices/${state.apInvoiceId}/payment`,
        {
          paymentAmount: remainingAmount,
          notes: "TS-06 final payment",
        },
      );
      expect(finalPayRes.status).toBe(200);
      const finalBody = asObject(finalPayRes.body);
      expect(asString(finalBody.status)).toBe("paid");
      expect(asNumber(finalBody.amountDue)).toBe(0);

      const productBeforeReverseRes = await apiCall(
        api,
        "GET",
        `/api/products/${state.productId}`,
      );
      expect(productBeforeReverseRes.status).toBe(200);
      const productQtyBeforeReverse = asNumber(
        asObject(productBeforeReverseRes.body).quantity,
      );

      const reverseGoodsReceiptRes = await apiCall(
        api,
        "POST",
        `/api/p2p/goods-receipts/${state.goodsReceiptId}/reverse`,
        {
          notes: "TS-06 reverse goods receipt",
        },
      );
      expect(reverseGoodsReceiptRes.status).toBe(200);
      const reversedGrBody = asObject(reverseGoodsReceiptRes.body);
      expect(asString(reversedGrBody.status)).toBe("reversed");

      const productAfterReverseRes = await apiCall(
        api,
        "GET",
        `/api/products/${state.productId}`,
      );
      expect(productAfterReverseRes.status).toBe(200);
      const productQtyAfterReverse = asNumber(
        asObject(productAfterReverseRes.body).quantity,
      );

      expect(productQtyAfterReverse).toBe(productQtyBeforeReverse - state.poQuantity);

      evidence.assertions = {
        apInvoiceId: state.apInvoiceId,
        apStatusAfterCreate: asString(apInvoiceBody.status),
        apStatusAfterPartial: asString(partialBody.status),
        apStatusAfterFinal: asString(finalBody.status),
        amountDueAfterFinal: asNumber(finalBody.amountDue),
        goodsReceiptStatusAfterReverse: asString(reversedGrBody.status),
        productQtyBeforeReverse,
        productQtyAfterReverse,
      };
      evidence.ids = {
        apInvoiceId: state.apInvoiceId,
        goodsReceiptId: state.goodsReceiptId,
      };
      evidence.notes = [
        "AP Invoice berhasil unpaid -> partial -> paid.",
        "Goods receipt berhasil direverse (storno).",
      ];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(page, "TS-06", "/procurement");
      } catch (error) {
        evidence.notes = [...(evidence.notes ?? []), `Screenshot error: ${toErrorMessage(error)}`];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-06", evidence);
    }
  });

  test("TS-07 Inventory: transfer pending->completed->reverse", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-07",
      title: "Inventory transfer lifecycle",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      const transferQty = 2;

      const transferCreateRes = await apiCall(
        api,
        "POST",
        "/api/stock-allocations/transfers",
        {
          productId: state.productId,
          fromWarehouseId: state.warehouseMainId,
          toWarehouseId: state.warehouseSecondaryId,
          quantity: transferQty,
          notes: "TS-07 create transfer",
        },
      );
      expect(transferCreateRes.status).toBe(201);
      const transferCreateBody = asObject(transferCreateRes.body);
      state.transferId = asString(transferCreateBody.id);
      expect(state.transferId).not.toBe("");
      expect(asString(transferCreateBody.status)).toBe("pending");

      const transferCompleteRes = await apiCall(
        api,
        "POST",
        `/api/stock-allocations/transfers/${state.transferId}/complete`,
      );
      expect(transferCompleteRes.status).toBe(200);
      const transferCompleteBody = asObject(transferCompleteRes.body);
      expect(asString(transferCompleteBody.status)).toBe("completed");

      const transferReverseRes = await apiCall(
        api,
        "POST",
        `/api/stock-allocations/transfers/${state.transferId}/reverse`,
        {
          notes: "TS-07 reverse transfer",
        },
      );
      expect(transferReverseRes.status).toBe(200);
      const transferReverseBody = asObject(transferReverseRes.body);
      state.transferReversalId = asString(transferReverseBody.id);
      expect(state.transferReversalId).not.toBe("");
      expect(asString(transferReverseBody.reversalOfId)).toBe(state.transferId);

      const transfersListRes = await apiCall(
        api,
        "GET",
        `/api/stock-allocations/transfers?productId=${state.productId}`,
      );
      expect(transfersListRes.status).toBe(200);
      const transferRows = asArray(transfersListRes.body);
      const originalRow = transferRows
        .map((row) => asObject(row))
        .find((row) => asString(row.id) === state.transferId);

      expect(originalRow).toBeDefined();
      expect(asString(asObject(originalRow).reversalTransferId)).toBe(
        state.transferReversalId,
      );

      evidence.assertions = {
        transferCreatedStatus: asString(transferCreateBody.status),
        transferCompletedStatus: asString(transferCompleteBody.status),
        reversalTransferId: state.transferReversalId,
        originalHasReversalTransferId: asString(asObject(originalRow).reversalTransferId),
      };
      evidence.ids = {
        transferId: state.transferId,
        transferReversalId: state.transferReversalId,
      };
      evidence.notes = ["Transfer berhasil pending -> completed -> reversed."];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(
          page,
          "TS-07",
          `/warehouses/${state.warehouseMainId}`,
        );
      } catch (error) {
        evidence.notes = [...(evidence.notes ?? []), `Screenshot error: ${toErrorMessage(error)}`];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-07", evidence);
    }
  });

  test("TS-08 Inventory: issue + reverse + stock card log", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-08",
      title: "Inventory issue, reversal, and stock card",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      const issueRes = await apiCall(api, "POST", "/api/stock-allocations/issues", {
        productId: state.productId,
        warehouseId: state.warehouseMainId,
        quantity: 1,
        notes: "TS-08 issue stock",
      });
      expect(issueRes.status).toBe(201);
      const issueBody = asObject(issueRes.body);
      state.issueId = asString(issueBody.id);
      expect(state.issueId).not.toBe("");
      expect(asString(issueBody.movementType)).toBe("issue");
      expect(asNumber(issueBody.quantityChange)).toBe(-1);

      const reverseIssueRes = await apiCall(
        api,
        "POST",
        `/api/stock-allocations/issues/${state.issueId}/reverse`,
        {
          notes: "TS-08 reverse issue",
        },
      );
      expect(reverseIssueRes.status).toBe(200);
      const reverseIssueBody = asObject(reverseIssueRes.body);
      state.issueReversalId = asString(reverseIssueBody.id);
      expect(state.issueReversalId).not.toBe("");
      expect(asString(reverseIssueBody.movementType)).toBe("reversal");
      expect(asString(reverseIssueBody.referenceId)).toBe(state.issueId);
      expect(asNumber(reverseIssueBody.quantityChange)).toBe(1);

      const stockCardRes = await apiCall(
        api,
        "GET",
        `/api/stock-allocations/stock-card?warehouseId=${state.warehouseMainId}&productId=${state.productId}&limit=300`,
      );
      expect(stockCardRes.status).toBe(200);
      const stockCardRows = asArray(stockCardRes.body).map((row) => asObject(row));
      expect(stockCardRows.length).toBeGreaterThan(0);

      const issueMovement = stockCardRows.find((row) => asString(row.id) === state.issueId);
      const issueReversalMovement = stockCardRows.find(
        (row) => asString(row.id) === state.issueReversalId,
      );

      expect(issueMovement).toBeDefined();
      expect(issueReversalMovement).toBeDefined();

      const movementTypes = new Set(
        stockCardRows.map((row) => asString(row.movementType)).filter(Boolean),
      );
      expect(movementTypes.has("issue")).toBeTruthy();
      expect(movementTypes.has("reversal")).toBeTruthy();
      expect(
        movementTypes.has("transfer_out") || movementTypes.has("transfer_in"),
      ).toBeTruthy();

      const latestRunningBalance = asNumber(
        stockCardRows[stockCardRows.length - 1]?.runningBalance,
      );

      evidence.assertions = {
        issueId: state.issueId,
        issueReversalId: state.issueReversalId,
        stockCardRows: stockCardRows.length,
        movementTypes: [...movementTypes],
        latestRunningBalance,
      };
      evidence.ids = {
        issueId: state.issueId,
        issueReversalId: state.issueReversalId,
        warehouseId: state.warehouseMainId,
        productId: state.productId,
      };
      evidence.notes = [
        "Issue stock berhasil.",
        "Reverse issue berhasil.",
        "Stock card mencatat movement inventory.",
      ];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(
          page,
          "TS-08",
          `/warehouses/${state.warehouseMainId}`,
        );
      } catch (error) {
        evidence.notes = [...(evidence.notes ?? []), `Screenshot error: ${toErrorMessage(error)}`];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-08", evidence);
    }
  });
});
