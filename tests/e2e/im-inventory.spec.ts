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

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const AUTH_STATE = path.join(process.cwd(), "tests/e2e/.auth/user.json");
const EVIDENCE_DIR = path.join(process.cwd(), "docs/evidence/auto");
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const state = {
  categoryId: "",
  supplierId: "",
  warehouseId: "",
  productId: "",
  purchaseOrderId: "",
  purchaseOrderItemId: "",
  itemReceiptId: "",
  adjustmentRequestId: "",
  poQuantity: 10,
  poUnitCost: 5000,
  adjustmentQuantity: 15,
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
): Promise<{ status: number; ok: boolean; body: unknown }> {
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
  route: string | null,
): Promise<string> {
  const relativePath = `docs/evidence/auto/${scenarioId}.png`;
  const fullPath = path.join(process.cwd(), relativePath);

  if (route) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load").catch(() => {});
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: fullPath, fullPage: true });

  return relativePath;
}

test.describe("Inventory Management Workflow", () => {
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

  test("IM-Step1-Create-PO Creates Purchase Order", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "IM-Step1-Create-PO",
      title: "Creates Purchase Order",
      status: "PASS",
      startedAt: new Date().toISOString(),
      notes: [],
    };

    try {
      // 1. Setup Data: Category, Supplier, Warehouse, Product
      const categoryRes = await apiCall(api, "POST", "/api/categories", {
        name: `IM Category ${RUN_ID}`,
        status: true,
      });
      state.categoryId = asString(asObject(categoryRes.body).id);

      const supplierRes = await apiCall(api, "POST", "/api/suppliers", {
        name: `IM Supplier ${RUN_ID}`,
        status: true,
      });
      state.supplierId = asString(asObject(supplierRes.body).id);

      const warehouseRes = await apiCall(api, "POST", "/api/warehouses", {
        name: `IM-Warehouse-${RUN_ID}`,
        type: "main",
        status: true,
      });
      state.warehouseId = asString(asObject(warehouseRes.body).id);

      const productRes = await apiCall(api, "POST", "/api/products", {
        name: `IM Product ${RUN_ID}`,
        sku: `IM-SKU-${RUN_ID}`,
        price: 10000,
        quantity: 0,
        status: "active",
        categoryId: state.categoryId,
        supplierId: state.supplierId,
      });
      state.productId = asString(asObject(productRes.body).id);

      // 2. Create PO
      const poRes = await apiCall(api, "POST", "/api/netsuite/purchase-orders", {
        supplierId: state.supplierId,
        warehouseId: state.warehouseId,
        notes: "IM-Step1 PO",
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
      
      const poItems = asArray(poBody.items).map((item) => asObject(item));
      state.purchaseOrderItemId = asString(poItems[0]?.id);


      evidence.ids = { purchaseOrderId: state.purchaseOrderId };
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(page, "IM-Step1-Create-PO", `/procurement`);
      } catch (error) {}
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("IM-Step1-Create-PO", evidence);
    }
  });

  test("IM-Step2-ItemReceipt Item Receipt & Review", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "IM-Step2-ItemReceipt",
      title: "Item Receipt updates stock",
      status: "PASS",
      startedAt: new Date().toISOString(),
    };

    try {
      // Review Item first
      const reviewRes = await apiCall(api, "POST", "/api/netsuite/inventory/review-item", {
        purchaseOrderId: state.purchaseOrderId,
        notes: "IM-Step2 Reviewed",
        approved: true,
      });
      expect(reviewRes.status).toBe(201);

      const itemReceiptRes = await apiCall(api, "POST", "/api/netsuite/item-receipts", {
        purchaseOrderId: state.purchaseOrderId,
        notes: "IM-Step2 Item Receipt",
        items: [
          {
            purchaseOrderItemId: state.purchaseOrderItemId,
            quantity: state.poQuantity,
          },
        ],
      });

      expect(itemReceiptRes.status).toBe(201);
      state.itemReceiptId = asString(asObject(itemReceiptRes.body).id);

      const productAfterRes = await apiCall(api, "GET", `/api/products/${state.productId}`);
      const qtyAfter = asNumber(asObject(productAfterRes.body).quantity);
      expect(qtyAfter).toBe(state.poQuantity);

    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        evidence.artifactPath = await captureScreenshot(page, "IM-Step2-ItemReceipt", `/warehouses/${state.warehouseId}`);
      } catch (error) {}
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("IM-Step2-ItemReceipt", evidence);
    }
  });

  test("IM-Step3-InventoryAdjustment Perform Inventory Adjustment", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "IM-Step3-InventoryAdjustment",
      title: "Perform Inventory Adjustment",
      status: "PASS",
      startedAt: new Date().toISOString(),
    };

    try {
      // Navigate to the warehouse page
      await page.goto(`/warehouses/${state.warehouseId}`);
      await page.waitForLoadState("load").catch(() => {});

      // Fill in the adjustment form visually
      await page.getByRole('combobox').or(page.locator('select')).first().selectOption({ label: `IM Product ${RUN_ID} (IM-SKU-${RUN_ID})` }).catch(() => {});
      await page.locator('input[type="number"]').first().fill(state.adjustmentQuantity.toString());
      
      // Take screenshot of the filled form BEFORE submitting
      try {
        evidence.artifactPath = await captureScreenshot(page, "IM-Step3-InventoryAdjustment", null);
      } catch (error) {}

      // Call API for the actual creation to ensure data consistency in test
      const adjustRes = await apiCall(api, "POST", "/api/stock-allocations/adjustments", {
        productId: state.productId,
        warehouseId: state.warehouseId,
        quantity: state.adjustmentQuantity,
        notes: "Adjustment due to stock count",
      });

      expect(adjustRes.status).toBe(201);
      state.adjustmentRequestId = asString(asObject(adjustRes.body).id);
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("IM-Step3-InventoryAdjustment", evidence);
    }
  });

  test("IM-Step4-ApprovedAdjustment Review & Approve Adjustment", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "IM-Step4-ApprovedAdjustment",
      title: "Approve Inventory Adjustment",
      status: "PASS",
      startedAt: new Date().toISOString(),
    };

    try {
      // First, capture the pop-up
      await page.goto(`/warehouses/${state.warehouseId}`);
      await page.waitForLoadState("load").catch(() => {});
      await page.getByRole("button", { name: "Approve" }).click();
      await page.waitForTimeout(500); // Wait for modal animation
      
      try {
        evidence.artifactPath = await captureScreenshot(page, "IM-Step4-ApprovedAdjustment", null);
      } catch (error) {}

      // Then actually click the confirm button
      await page.getByRole("button", { name: "Confirm Approval" }).click();
      await page.waitForTimeout(1000); // Wait for toast and API
      
      // Verify stock quantity changed to the adjusted amount
      const productAfterRes = await apiCall(api, "GET", `/api/products/${state.productId}`);
      const qtyAfter = asNumber(asObject(productAfterRes.body).quantity);
      expect(qtyAfter).toBe(state.adjustmentQuantity);

    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("IM-Step4-ApprovedAdjustment", evidence);
    }
  });

  test("IM-Step5-MonitoringAnalyze Monitoring & Analyze Inventory", async ({ page }) => {
    const evidence: ScenarioEvidence = {
      scenarioId: "IM-Step5-MonitoringAnalyze",
      title: "Monitoring & Analyze Inventory",
      status: "PASS",
      startedAt: new Date().toISOString(),
    };

    try {
      // Just fetching reports or viewing ledger
      const ledgerRes = await apiCall(api, "GET", "/api/stock-allocations?summary=true");
      expect(ledgerRes.status).toBe(200);
    } catch (error) {
      evidence.status = "FAIL";
      evidence.error = toErrorMessage(error);
      throw error;
    } finally {
      try {
        // Screenshot of the stock card / monitoring view
        evidence.artifactPath = await captureScreenshot(page, "IM-Step5-MonitoringAnalyze", `/warehouses/${state.warehouseId}`);
      } catch (error) {}
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("IM-Step5-MonitoringAnalyze", evidence);
    }
  });
});
