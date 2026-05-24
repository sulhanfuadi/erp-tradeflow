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
  salesOrderId: string;
  salesOrderItemId: string;
  customerInvoiceId: string;
  purchaseOrderId: string;
  purchaseOrderItemId: string;
  itemReceiptId: string;
  vendorBillId: string;
  transferId: string;
  transferReversalId: string;
  issueId: string;
  issueReversalId: string;
  poQuantity: number;
  poUnitCost: number;
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
  salesOrderId: "",
  salesOrderItemId: "",
  customerInvoiceId: "",
  purchaseOrderId: "",
  purchaseOrderItemId: "",
  itemReceiptId: "",
  vendorBillId: "",
  transferId: "",
  transferReversalId: "",
  issueId: "",
  issueReversalId: "",
  poQuantity: 6,
  poUnitCost: 12000,
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

test.describe("Submission E2E TS-01..TS-12 (NetSuite Alignment)", () => {
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

  test("TS-01 Sales Order create + reservation + oversell prevention", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-01",
      title: "Sales Order create + reservation + oversell prevention",
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
        description: "Category for NetSuite-aligned automation",
      });
      expect(categoryRes.status).toBe(201);
      state.categoryId = asString(asObject(categoryRes.body).id);
      expect(state.categoryId).not.toBe("");

      const supplierRes = await apiCall(api, "POST", "/api/suppliers", {
        name: `E2E Supplier ${RUN_ID}`,
        status: true,
        description: "Supplier for NetSuite-aligned automation",
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

      const warehouseSecondaryRes = await apiCall(api, "POST", "/api/warehouses", {
        name: `WH-Secondary-${RUN_ID}`,
        address: "Bandung",
        type: "secondary",
        status: true,
      });
      expect(warehouseSecondaryRes.status).toBe(201);
      state.warehouseSecondaryId = asString(asObject(warehouseSecondaryRes.body).id);
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

      const beforeProductRes = await apiCall(api, "GET", `/api/products/${state.productId}`);
      expect(beforeProductRes.status).toBe(200);
      const reservedBefore = asNumber(asObject(beforeProductRes.body).reservedQuantity);

      const salesOrderRes = await apiCall(api, "POST", "/api/netsuite/sales-orders", {
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
          zipCode: "10110",
          country: "Indonesia",
        },
        notes: "TS-01 sales order",
      });
      expect(salesOrderRes.status).toBe(201);

      const salesOrderBody = asObject(salesOrderRes.body);
      state.salesOrderId = asString(salesOrderBody.id);
      expect(state.salesOrderId).not.toBe("");

      const salesOrderItems = asArray(salesOrderBody.items).map((item) => asObject(item));
      expect(salesOrderItems.length).toBeGreaterThan(0);
      state.salesOrderItemId = asString(salesOrderItems[0]?.id);
      expect(state.salesOrderItemId).not.toBe("");

      const afterProductRes = await apiCall(api, "GET", `/api/products/${state.productId}`);
      expect(afterProductRes.status).toBe(200);
      const reservedAfter = asNumber(asObject(afterProductRes.body).reservedQuantity);
      expect(reservedAfter).toBe(reservedBefore + 3);

      const oversellRes = await apiCall(api, "POST", "/api/netsuite/sales-orders", {
        items: [{ productId: state.productId, quantity: 1000 }],
      });
      expect(oversellRes.ok).toBeFalsy();

      evidence.assertions = {
        salesOrderId: state.salesOrderId,
        salesOrderItemId: state.salesOrderItemId,
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
        salesOrderId: state.salesOrderId,
      };
      evidence.notes = [
        "Sales Order berhasil dibuat.",
        "Reservation naik sesuai kuantitas order.",
        "Oversell prevention aktif.",
      ];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(page, "TS-01", "/orders");
      } catch (error) {
        evidence.notes = [
          ...(evidence.notes ?? []),
          `Screenshot error: ${toErrorMessage(error)}`,
        ];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-01", evidence);
    }
  });

  test("TS-02 Item Fulfillment partial/full + status transition", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-02",
      title: "Item Fulfillment partial/full + status transition",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      expect(state.salesOrderId).not.toBe("");
      expect(state.salesOrderItemId).not.toBe("");

      const partialRes = await apiCall(api, "POST", "/api/netsuite/item-fulfillments", {
        orderId: state.salesOrderId,
        notes: "TS-02 partial fulfillment",
        items: [
          {
            orderItemId: state.salesOrderItemId,
            quantity: 1,
          },
        ],
      });
      expect(partialRes.status).toBe(201);
      const partialBody = asObject(partialRes.body);
      expect(asString(partialBody.status)).toBe("fulfilled");

      const fullRes = await apiCall(api, "POST", "/api/netsuite/item-fulfillments", {
        orderId: state.salesOrderId,
        notes: "TS-02 final fulfillment",
        items: [
          {
            orderItemId: state.salesOrderItemId,
            quantity: 2,
          },
        ],
      });
      expect(fullRes.status).toBe(201);

      const salesOrdersRes = await apiCall(api, "GET", "/api/netsuite/sales-orders");
      expect(salesOrdersRes.status).toBe(200);
      const salesOrders = asArray(salesOrdersRes.body).map((entry) => asObject(entry));
      const currentSalesOrder = salesOrders.find(
        (entry) => asString(entry.id) === state.salesOrderId,
      );
      expect(currentSalesOrder).toBeDefined();
      expect(asString(asObject(currentSalesOrder).netsuiteStatus)).toBe("Pending Billing");

      evidence.assertions = {
        partialFulfillmentStatus: asString(partialBody.status),
        finalSalesOrderNetSuiteStatus: asString(
          asObject(currentSalesOrder).netsuiteStatus,
        ),
      };
      evidence.ids = {
        salesOrderId: state.salesOrderId,
      };
      evidence.notes = [
        "Item Fulfillment partial berhasil.",
        "Item Fulfillment final berhasil.",
        "Status Sales Order menjadi Pending Billing.",
      ];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(
          page,
          "TS-02",
          `/orders/${state.salesOrderId}`,
        );
      } catch (error) {
        evidence.notes = [
          ...(evidence.notes ?? []),
          `Screenshot error: ${toErrorMessage(error)}`,
        ];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-02", evidence);
    }
  });

  test("TS-03 Customer Invoice generated from fulfilled quantity", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-03",
      title: "Customer Invoice generation from fulfilled quantity",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      expect(state.salesOrderId).not.toBe("");

      const dueDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
        .toISOString()
        .slice(0, 10);

      const invoiceRes = await apiCall(api, "POST", "/api/netsuite/customer-invoices", {
        orderId: state.salesOrderId,
        dueDate,
        notes: "TS-03 customer invoice",
      });
      expect(invoiceRes.status).toBe(201);

      const invoiceBody = asObject(invoiceRes.body);
      state.customerInvoiceId = asString(invoiceBody.id);
      expect(state.customerInvoiceId).not.toBe("");

      const invoiceListRes = await apiCall(api, "GET", "/api/netsuite/customer-invoices");
      expect(invoiceListRes.status).toBe(200);
      const invoices = asArray(invoiceListRes.body).map((entry) => asObject(entry));
      const createdInvoice = invoices.find(
        (entry) => asString(entry.id) === state.customerInvoiceId,
      );
      expect(createdInvoice).toBeDefined();

      evidence.assertions = {
        customerInvoiceId: state.customerInvoiceId,
        customerInvoiceStatus: asString(invoiceBody.status),
        netsuiteStatus: asString(invoiceBody.netsuiteStatus),
      };
      evidence.ids = {
        salesOrderId: state.salesOrderId,
        customerInvoiceId: state.customerInvoiceId,
      };
      evidence.notes = [
        "Customer Invoice berhasil dibuat setelah fulfillment selesai.",
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
          `/invoices/${state.customerInvoiceId}`,
        );
      } catch (error) {
        evidence.notes = [
          ...(evidence.notes ?? []),
          `Screenshot error: ${toErrorMessage(error)}`,
        ];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-03", evidence);
    }
  });

  test("TS-04 Customer Payment partial to paid + payment document", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-04",
      title: "Customer Payment partial to paid + payment doc",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      expect(state.customerInvoiceId).not.toBe("");

      const firstPaymentRes = await apiCall(
        api,
        "POST",
        "/api/netsuite/customer-payments",
        {
          invoiceId: state.customerInvoiceId,
          paymentAmount: 20000,
          notes: "TS-04 partial customer payment",
        },
      );
      expect(firstPaymentRes.status).toBe(201);
      const firstPaymentBody = asObject(firstPaymentRes.body);
      expect(asString(asObject(firstPaymentBody.invoice).status)).toBe("partial");

      const remainingDue = asNumber(asObject(firstPaymentBody.invoice).amountDue);
      expect(remainingDue).toBeGreaterThan(0);

      const secondPaymentRes = await apiCall(
        api,
        "POST",
        "/api/netsuite/customer-payments",
        {
          invoiceId: state.customerInvoiceId,
          paymentAmount: remainingDue,
          notes: "TS-04 final customer payment",
        },
      );
      expect(secondPaymentRes.status).toBe(201);
      const secondPaymentBody = asObject(secondPaymentRes.body);
      expect(asString(asObject(secondPaymentBody.invoice).status)).toBe("paid");

      const paymentListRes = await apiCall(api, "GET", "/api/netsuite/customer-payments");
      expect(paymentListRes.status).toBe(200);
      const paymentRows = asArray(paymentListRes.body);
      expect(paymentRows.length).toBeGreaterThan(0);

      evidence.assertions = {
        partialPaymentStatus: asString(asObject(firstPaymentBody.invoice).status),
        finalPaymentStatus: asString(asObject(secondPaymentBody.invoice).status),
        customerPaymentDocs: paymentRows.length,
      };
      evidence.ids = {
        customerInvoiceId: state.customerInvoiceId,
      };
      evidence.notes = [
        "Customer Payment partial berhasil.",
        "Customer Payment final berhasil dan invoice paid.",
      ];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(
          page,
          "TS-04",
          `/invoices/${state.customerInvoiceId}`,
        );
      } catch (error) {
        evidence.notes = [
          ...(evidence.notes ?? []),
          `Screenshot error: ${toErrorMessage(error)}`,
        ];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-04", evidence);
    }
  });

  test("TS-05 Purchase Order create and post", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-05",
      title: "Purchase Order create and post",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      const poRes = await apiCall(api, "POST", "/api/netsuite/purchase-orders", {
        supplierId: state.supplierId,
        warehouseId: state.warehouseMainId,
        tax: 1000,
        notes: "TS-05 purchase order",
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

      const poItems = asArray(poBody.items).map((item) => asObject(item));
      state.purchaseOrderItemId = asString(poItems[0]?.id);
      expect(state.purchaseOrderItemId).not.toBe("");

      const poPostRes = await apiCall(
        api,
        "PATCH",
        `/api/p2p/purchase-orders/${state.purchaseOrderId}`,
        {
          status: "posted",
          notes: "TS-05 posted",
        },
      );
      expect(poPostRes.status).toBe(200);
      const poPostedBody = asObject(poPostRes.body);
      expect(asString(poPostedBody.status)).toBe("posted");

      evidence.assertions = {
        purchaseOrderId: state.purchaseOrderId,
        purchaseOrderItemId: state.purchaseOrderItemId,
        postedStatus: asString(poPostedBody.status),
      };
      evidence.ids = {
        purchaseOrderId: state.purchaseOrderId,
        purchaseOrderItemId: state.purchaseOrderItemId,
      };
      evidence.notes = ["Purchase Order berhasil dibuat dan diposting."];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(page, "TS-05", "/procurement");
      } catch (error) {
        evidence.notes = [
          ...(evidence.notes ?? []),
          `Screenshot error: ${toErrorMessage(error)}`,
        ];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-05", evidence);
    }
  });

  test("TS-06 Item Receipt increases stock", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-06",
      title: "Item Receipt + stock increment",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      const productBeforeRes = await apiCall(api, "GET", `/api/products/${state.productId}`);
      expect(productBeforeRes.status).toBe(200);
      const qtyBefore = asNumber(asObject(productBeforeRes.body).quantity);

      const itemReceiptRes = await apiCall(api, "POST", "/api/netsuite/item-receipts", {
        purchaseOrderId: state.purchaseOrderId,
        notes: "TS-06 item receipt",
        items: [
          {
            purchaseOrderItemId: state.purchaseOrderItemId,
            quantity: state.poQuantity,
          },
        ],
      });

      expect(itemReceiptRes.status).toBe(201);
      const itemReceiptBody = asObject(itemReceiptRes.body);
      state.itemReceiptId = asString(itemReceiptBody.id);
      expect(state.itemReceiptId).not.toBe("");
      expect(asString(itemReceiptBody.status)).toBe("received");

      const productAfterRes = await apiCall(api, "GET", `/api/products/${state.productId}`);
      expect(productAfterRes.status).toBe(200);
      const qtyAfter = asNumber(asObject(productAfterRes.body).quantity);
      expect(qtyAfter).toBe(qtyBefore + state.poQuantity);

      evidence.assertions = {
        itemReceiptId: state.itemReceiptId,
        itemReceiptStatus: asString(itemReceiptBody.status),
        quantityBefore: qtyBefore,
        quantityAfter: qtyAfter,
      };
      evidence.ids = {
        itemReceiptId: state.itemReceiptId,
        purchaseOrderId: state.purchaseOrderId,
      };
      evidence.notes = ["Item Receipt berhasil, stok bertambah."];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(page, "TS-06", "/procurement");
      } catch (error) {
        evidence.notes = [
          ...(evidence.notes ?? []),
          `Screenshot error: ${toErrorMessage(error)}`,
        ];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-06", evidence);
    }
  });

  test("TS-07 Vendor Bill creation from PO/Item Receipt", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-07",
      title: "Vendor Bill creation from PO/Item Receipt",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      const subtotal = state.poQuantity * state.poUnitCost;

      const vendorBillRes = await apiCall(api, "POST", "/api/netsuite/vendor-bills", {
        supplierId: state.supplierId,
        purchaseOrderId: state.purchaseOrderId,
        goodsReceiptId: state.itemReceiptId,
        subtotal,
        tax: 1000,
        notes: "TS-07 vendor bill",
      });

      expect(vendorBillRes.status).toBe(201);
      const vendorBillBody = asObject(vendorBillRes.body);
      state.vendorBillId = asString(vendorBillBody.id);
      expect(state.vendorBillId).not.toBe("");
      expect(asString(vendorBillBody.status)).toBe("unpaid");

      const vendorBillListRes = await apiCall(api, "GET", "/api/netsuite/vendor-bills");
      expect(vendorBillListRes.status).toBe(200);
      const billRows = asArray(vendorBillListRes.body).map((row) => asObject(row));
      const createdBill = billRows.find((row) => asString(row.id) === state.vendorBillId);
      expect(createdBill).toBeDefined();

      evidence.assertions = {
        vendorBillId: state.vendorBillId,
        vendorBillStatus: asString(vendorBillBody.status),
      };
      evidence.ids = {
        vendorBillId: state.vendorBillId,
        purchaseOrderId: state.purchaseOrderId,
        itemReceiptId: state.itemReceiptId,
      };
      evidence.notes = ["Vendor Bill berhasil dibuat dari PO + Item Receipt."];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(page, "TS-07", "/procurement");
      } catch (error) {
        evidence.notes = [
          ...(evidence.notes ?? []),
          `Screenshot error: ${toErrorMessage(error)}`,
        ];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-07", evidence);
    }
  });

  test("TS-08 Bill Payment partial to paid + payment document", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-08",
      title: "Bill Payment partial to paid + payment doc",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      const partialPaymentRes = await apiCall(api, "POST", "/api/netsuite/bill-payments", {
        apInvoiceId: state.vendorBillId,
        paymentAmount: 15000,
        notes: "TS-08 partial bill payment",
      });
      expect(partialPaymentRes.status).toBe(201);

      const partialPayload = asObject(partialPaymentRes.body);
      const partialVendorBill = asObject(partialPayload.vendorBill);
      expect(asString(partialVendorBill.status)).toBe("partial");

      const amountDue = asNumber(partialVendorBill.amountDue);
      expect(amountDue).toBeGreaterThan(0);

      const finalPaymentRes = await apiCall(api, "POST", "/api/netsuite/bill-payments", {
        apInvoiceId: state.vendorBillId,
        paymentAmount: amountDue,
        notes: "TS-08 final bill payment",
      });
      expect(finalPaymentRes.status).toBe(201);
      const finalPayload = asObject(finalPaymentRes.body);
      const finalVendorBill = asObject(finalPayload.vendorBill);
      expect(asString(finalVendorBill.status)).toBe("paid");

      const billPaymentsRes = await apiCall(api, "GET", "/api/netsuite/bill-payments");
      expect(billPaymentsRes.status).toBe(200);
      const billPaymentRows = asArray(billPaymentsRes.body);
      expect(billPaymentRows.length).toBeGreaterThan(0);

      evidence.assertions = {
        partialVendorBillStatus: asString(partialVendorBill.status),
        finalVendorBillStatus: asString(finalVendorBill.status),
        billPaymentDocs: billPaymentRows.length,
      };
      evidence.ids = {
        vendorBillId: state.vendorBillId,
      };
      evidence.notes = [
        "Bill Payment partial berhasil.",
        "Bill Payment final berhasil dan Vendor Bill paid.",
      ];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(page, "TS-08", "/procurement");
      } catch (error) {
        evidence.notes = [
          ...(evidence.notes ?? []),
          `Screenshot error: ${toErrorMessage(error)}`,
        ];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-08", evidence);
    }
  });

  test("TS-09 Inventory transfer pending to completed to reverse", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-09",
      title: "Inventory transfer pending to completed to reverse",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      const transferCreateRes = await apiCall(api, "POST", "/api/netsuite/inventory/transfers", {
        productId: state.productId,
        fromWarehouseId: state.warehouseMainId,
        toWarehouseId: state.warehouseSecondaryId,
        quantity: 2,
        notes: "TS-09 transfer",
      });
      expect(transferCreateRes.status).toBe(201);
      const transferCreateBody = asObject(transferCreateRes.body);

      state.transferId = asString(transferCreateBody.id);
      expect(state.transferId).not.toBe("");
      expect(asString(transferCreateBody.status)).toBe("pending");

      const transferCompleteRes = await apiCall(
        api,
        "POST",
        `/api/netsuite/inventory/transfers/${state.transferId}/complete`,
      );
      expect(transferCompleteRes.status).toBe(200);
      const transferCompleteBody = asObject(transferCompleteRes.body);
      expect(asString(transferCompleteBody.status)).toBe("completed");

      const transferReverseRes = await apiCall(
        api,
        "POST",
        `/api/netsuite/inventory/transfers/${state.transferId}/reverse`,
        {
          notes: "TS-09 reverse transfer",
        },
      );
      expect(transferReverseRes.status).toBe(200);
      const transferReverseBody = asObject(transferReverseRes.body);

      const transferStatusAfterReverse = asString(transferReverseBody.status);
      expect(["completed", "reversed"]).toContain(transferStatusAfterReverse);

      expect(asString(transferReverseBody.reversalOfId)).toBe(state.transferId);

      state.transferReversalId = asString(transferReverseBody.id);
      expect(state.transferReversalId).not.toBe("");

      const transferListRes = await apiCall(
        api,
        "GET",
        `/api/netsuite/inventory/transfers?warehouseId=${state.warehouseMainId}&productId=${state.productId}`,
      );
      expect(transferListRes.status).toBe(200);
      const transferRows = asArray(transferListRes.body).map((row) => asObject(row));
      const original = transferRows.find((row) => asString(row.id) === state.transferId);
      expect(original).toBeDefined();
      expect(asString(asObject(original).reversalTransferId)).toBe(state.transferReversalId);

      evidence.assertions = {
        transferPendingStatus: asString(transferCreateBody.status),
        transferCompletedStatus: asString(transferCompleteBody.status),
        transferStatusAfterReverse,
      };
      evidence.ids = {
        transferId: state.transferId,
        transferReversalId: state.transferReversalId,
      };
      evidence.notes = ["Transfer berhasil pending → completed → reversed."];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(
          page,
          "TS-09",
          `/warehouses/${state.warehouseMainId}`,
        );
      } catch (error) {
        evidence.notes = [
          ...(evidence.notes ?? []),
          `Screenshot error: ${toErrorMessage(error)}`,
        ];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-09", evidence);
    }
  });

  test("TS-10 Inventory issue to reverse issue", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-10",
      title: "Inventory issue to reverse issue",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      const issueRes = await apiCall(api, "POST", "/api/netsuite/inventory/issues", {
        productId: state.productId,
        warehouseId: state.warehouseMainId,
        quantity: 1,
        notes: "TS-10 issue stock",
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
        `/api/netsuite/inventory/issues/${state.issueId}/reverse`,
        {
          notes: "TS-10 reverse issue",
        },
      );
      expect(reverseIssueRes.status).toBe(200);
      const reverseIssueBody = asObject(reverseIssueRes.body);

      state.issueReversalId = asString(reverseIssueBody.id);
      expect(state.issueReversalId).not.toBe("");
      expect(asString(reverseIssueBody.movementType)).toBe("reversal");
      expect(asString(reverseIssueBody.referenceId)).toBe(state.issueId);
      expect(asNumber(reverseIssueBody.quantityChange)).toBe(1);

      evidence.assertions = {
        issueMovementType: asString(issueBody.movementType),
        reverseMovementType: asString(reverseIssueBody.movementType),
      };
      evidence.ids = {
        issueId: state.issueId,
        issueReversalId: state.issueReversalId,
      };
      evidence.notes = ["Issue stock dan reverse issue berhasil."];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(
          page,
          "TS-10",
          `/warehouses/${state.warehouseMainId}`,
        );
      } catch (error) {
        evidence.notes = [
          ...(evidence.notes ?? []),
          `Screenshot error: ${toErrorMessage(error)}`,
        ];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-10", evidence);
    }
  });

  test("TS-11 Inventory ledger integrity", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-11",
      title: "Inventory ledger integrity (order + running balance)",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      const ledgerRes = await apiCall(
        api,
        "GET",
        `/api/netsuite/inventory/ledger?warehouseId=${state.warehouseMainId}&productId=${state.productId}&limit=500`,
      );
      expect(ledgerRes.status).toBe(200);

      const rows = asArray(ledgerRes.body).map((row) => asObject(row));
      expect(rows.length).toBeGreaterThan(0);

      const movementTypes = new Set(
        rows.map((row) => asString(row.movementType)).filter(Boolean),
      );

      expect(movementTypes.has("receipt") || movementTypes.has("transfer_in")).toBeTruthy();
      expect(movementTypes.has("issue") || movementTypes.has("transfer_out")).toBeTruthy();
      expect(movementTypes.has("reversal")).toBeTruthy();

      const chronologyIsNonDecreasing = rows.every((row, index) => {
        if (index === 0) return true;
        const previous = rows[index - 1];
        if (!previous) return true;
        return (
          new Date(asString(previous.createdAt)).getTime() <=
          new Date(asString(row.createdAt)).getTime()
        );
      });
      expect(chronologyIsNonDecreasing).toBeTruthy();

      const runningBalanceIsNumeric = rows.every((row) =>
        Number.isFinite(asNumber(row.runningBalance)),
      );
      expect(runningBalanceIsNumeric).toBeTruthy();

      evidence.assertions = {
        rowCount: rows.length,
        movementTypes: [...movementTypes],
        chronologyIsNonDecreasing,
        runningBalanceIsNumeric,
      };
      evidence.ids = {
        warehouseId: state.warehouseMainId,
        productId: state.productId,
      };
      evidence.notes = [
        "Ledger berisi movement utama receipt/issue/transfer/reversal.",
        "Urutan timestamp terjaga.",
        "Running balance tersedia di setiap baris.",
      ];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(
          page,
          "TS-11",
          `/warehouses/${state.warehouseMainId}`,
        );
      } catch (error) {
        evidence.notes = [
          ...(evidence.notes ?? []),
          `Screenshot error: ${toErrorMessage(error)}`,
        ];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-11", evidence);
    }
  });

  test("TS-12 Legacy compatibility regression", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "TS-12",
      title: "Legacy API compatibility regression",
      status: "PASS",
      startedAt: new Date().toISOString(),
      assertions: {},
      ids: {},
      notes: [],
    };

    try {
      const legacyOrders = await apiCall(api, "GET", "/api/orders");
      const legacyInvoices = await apiCall(api, "GET", "/api/invoices");
      const legacyPurchaseOrders = await apiCall(api, "GET", "/api/p2p/purchase-orders");
      const legacyGoodsReceipts = await apiCall(api, "GET", "/api/p2p/goods-receipts");
      const legacyApInvoices = await apiCall(api, "GET", "/api/p2p/ap-invoices");

      expect(legacyOrders.status).toBe(200);
      expect(legacyInvoices.status).toBe(200);
      expect(legacyPurchaseOrders.status).toBe(200);
      expect(legacyGoodsReceipts.status).toBe(200);
      expect(legacyApInvoices.status).toBe(200);

      const orderRows = asArray(legacyOrders.body).map((row) => asObject(row));
      const invoiceRows = asArray(legacyInvoices.body).map((row) => asObject(row));
      const poRows = asArray(legacyPurchaseOrders.body).map((row) => asObject(row));

      const foundSalesOrder = orderRows.some(
        (row) => asString(row.id) === state.salesOrderId,
      );
      const foundVendorBill = asArray(legacyApInvoices.body)
        .map((row) => asObject(row))
        .some((row) => asString(row.id) === state.vendorBillId);

      expect(foundSalesOrder).toBeTruthy();
      expect(foundVendorBill).toBeTruthy();

      evidence.assertions = {
        legacyOrdersStatus: legacyOrders.status,
        legacyInvoicesStatus: legacyInvoices.status,
        legacyPOStatus: legacyPurchaseOrders.status,
        legacyGoodsReceiptsStatus: legacyGoodsReceipts.status,
        legacyApInvoicesStatus: legacyApInvoices.status,
        foundSalesOrder,
        foundVendorBill,
        legacyOrderCount: orderRows.length,
        legacyInvoiceCount: invoiceRows.length,
        legacyPOCount: poRows.length,
      };
      evidence.ids = {
        salesOrderId: state.salesOrderId,
        customerInvoiceId: state.customerInvoiceId,
        purchaseOrderId: state.purchaseOrderId,
        itemReceiptId: state.itemReceiptId,
        vendorBillId: state.vendorBillId,
      };
      evidence.notes = [
        "Endpoint legacy tetap berjalan saat endpoint NetSuite aktif.",
      ];
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(page, "TS-12", "/orders");
      } catch (error) {
        evidence.notes = [
          ...(evidence.notes ?? []),
          `Screenshot error: ${toErrorMessage(error)}`,
        ];
      }
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("TS-12", evidence);
    }
  });
});
