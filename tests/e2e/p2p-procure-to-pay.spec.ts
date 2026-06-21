import { test, expect, APIRequestContext, request as playwrightRequest, Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const EVIDENCE_DIR = path.join(process.cwd(), "docs/evidence/auto");

// Use a unique string to isolate runs
const RUN_ID = Date.now().toString().slice(-6);

type ScenarioEvidence = {
  scenarioId: string;
  title: string;
  status: "PASS" | "FAIL";
  startedAt: string;
  finishedAt?: string;
  artifactPath?: string;
  error?: string;
  ids?: Record<string, string>;
};

async function writeEvidence(scenarioId: string, data: ScenarioEvidence) {
  const jsonPath = path.join(EVIDENCE_DIR, `${scenarioId}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), "utf8");
}

async function captureScreenshot(page: Page, scenarioId: string, urlPath: string) {
  await page.goto(urlPath, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000); // Wait for data to load and UI to settle
  const relativePath = `docs/evidence/auto/${scenarioId}.png`;
  const fullPath = path.join(process.cwd(), relativePath);
  await page.screenshot({ path: fullPath, fullPage: true });
  return relativePath;
}

// Helpers
async function apiCall(api: APIRequestContext, method: string, url: string, data?: unknown) {
  const res = await api.fetch(url, { method, data });
  if (!res.ok() && method !== "GET") {
    console.error("API error", url, await res.text());
  }
  return { status: res.status(), body: await res.json().catch(() => ({})) };
}

function asString(val: unknown): string { return typeof val === "string" ? val : ""; }
function asObject(val: unknown): Record<string, unknown> { return typeof val === "object" && val !== null ? val as Record<string, unknown> : {}; }
function asArray(val: unknown): unknown[] { return Array.isArray(val) ? val : []; }

const state = {
  categoryId: "",
  supplierId: "",
  warehouseId: "",
  productId: "",
  purchaseOrderId: "",
  purchaseOrderItemId: "",
  goodsReceiptId: "",
  apInvoiceId: "",
  poQuantity: 10,
  poUnitCost: 1000,
};

async function loginAsRole(api: APIRequestContext, email: string) {
  const res = await apiCall(api, "POST", "/api/auth/login", { email, password: "12345678" });
  expect(res.status).toBe(200);
}

async function loginUi(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "12345678");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
}

test.describe("P2P Procure To Pay Workflow", () => {
  test.describe.configure({ mode: "serial" });

  let api: APIRequestContext;

  test.beforeAll(async () => {
    await fs.mkdir(EVIDENCE_DIR, { recursive: true });
    // Using a fresh context rather than default AUTH_STATE so we can log in manually
    api = await playwrightRequest.newContext({ baseURL: BASE_URL });
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test("P2P-Step1-Create-PO Creates Purchase Order", async ({ page }) => {
    // Role: Purchasing Manager
    await loginAsRole(api, "purchasingmgr@demo.com");
    const evidence: ScenarioEvidence = {
      scenarioId: "P2P-Step1-Create-PO",
      title: "Creates Purchase Order",
      status: "PASS",
      startedAt: new Date().toISOString()
    };
    try {
      // 1. Setup Data
      const categoryRes = await apiCall(api, "POST", "/api/categories", { name: `P2P Category ${RUN_ID}`, status: true });
      state.categoryId = asString(asObject(categoryRes.body).id);

      const supplierRes = await apiCall(api, "POST", "/api/suppliers", { name: `P2P Supplier ${RUN_ID}`, status: true });
      state.supplierId = asString(asObject(supplierRes.body).id);

      const warehouseRes = await apiCall(api, "POST", "/api/warehouses", { name: `P2P-Warehouse-${RUN_ID}`, type: "main", status: true });
      state.warehouseId = asString(asObject(warehouseRes.body).id);

      const productRes = await apiCall(api, "POST", "/api/products", {
        name: `P2P Product ${RUN_ID}`, sku: `P2P-SKU-${RUN_ID}`, price: 5000, quantity: 0, status: "active",
        categoryId: state.categoryId, supplierId: state.supplierId,
      });
      state.productId = asString(asObject(productRes.body).id);

      // 2. Create PO
      const poRes = await apiCall(api, "POST", "/api/netsuite/purchase-orders", {
        supplierId: state.supplierId, warehouseId: state.warehouseId, notes: "P2P-Step1 PO",
        items: [{ productId: state.productId, quantity: state.poQuantity, unitCost: state.poUnitCost }]
      });
      expect(poRes.status).toBe(201);
      const poBody = asObject(poRes.body);
      state.purchaseOrderId = asString(poBody.id);
      state.purchaseOrderItemId = asString(asObject(asArray(poBody.items)[0]).id);
      
      evidence.ids = { purchaseOrderId: state.purchaseOrderId };
    } catch (e) {
      evidence.status = "FAIL"; evidence.error = String(e); throw e;
    } finally {
      try {
        await loginUi(page, "purchasingmgr@demo.com");
        // We will open the Workbench for the screenshot
        evidence.artifactPath = await captureScreenshot(page, "P2P-Step1-Create-PO", `/procurement`);
      } catch (e) {}
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("P2P-Step1-Create-PO", evidence);
    }
  });

  test("P2P-Step2-Review-Item Review Item on Purchase Order", async ({ page }) => {
    // Role: Inventory Manager
    await loginAsRole(api, "invmgr@demo.com");
    const evidence: ScenarioEvidence = {
      scenarioId: "P2P-Step2-Review-Item",
      title: "Review Item on Purchase Order",
      status: "PASS",
      startedAt: new Date().toISOString()
    };
    try {
      // Review Item first
      const reviewRes = await apiCall(api, "POST", "/api/netsuite/inventory/review-item", {
        purchaseOrderId: state.purchaseOrderId,
        notes: "P2P-Step2 Reviewed",
        approved: true,
      });
      expect(reviewRes.status).toBe(201);

      // Create Receipt
      const itemReceiptRes = await apiCall(api, "POST", "/api/netsuite/item-receipts", {
        purchaseOrderId: state.purchaseOrderId, notes: "P2P-Step2 Receipt",
        items: [{ purchaseOrderItemId: state.purchaseOrderItemId, quantity: state.poQuantity }]
      });
      expect(itemReceiptRes.status).toBe(201);
      state.goodsReceiptId = asString(asObject(itemReceiptRes.body).id);

      evidence.ids = { goodsReceiptId: state.goodsReceiptId };
    } catch (e) {
      evidence.status = "FAIL"; evidence.error = String(e); throw e;
    } finally {
      try {
        await loginUi(page, "invmgr@demo.com");
        evidence.artifactPath = await captureScreenshot(page, "P2P-Step2-Review-Item", `/procurement`);
      } catch (e) {}
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("P2P-Step2-Review-Item", evidence);
    }
  });

  test("P2P-Step3-Bill-PO Bill Purchase Order", async ({ page }) => {
    // Role: A/R Analyst
    await loginAsRole(api, "aranalyst@demo.com");
    const evidence: ScenarioEvidence = {
      scenarioId: "P2P-Step3-Bill-PO",
      title: "Bill Purchase Order",
      status: "PASS",
      startedAt: new Date().toISOString()
    };
    try {
      // Create AP Invoice
      const apRes = await apiCall(api, "POST", "/api/netsuite/vendor-bills", {
        supplierId: state.supplierId,
        purchaseOrderId: state.purchaseOrderId,
        goodsReceiptId: state.goodsReceiptId,
        subtotal: state.poQuantity * state.poUnitCost,
        tax: 0,
        notes: "P2P-Step3 Vendor Bill"
      });
      expect(apRes.status).toBe(201);
      state.apInvoiceId = asString(asObject(apRes.body).id);

      // Approve Vendor Bill
      const approveRes = await apiCall(api, "POST", `/api/netsuite/vendor-bills/${state.apInvoiceId}/approve`);
      expect(approveRes.status).toBe(200);

      evidence.ids = { apInvoiceId: state.apInvoiceId };
    } catch (e) {
      evidence.status = "FAIL"; evidence.error = String(e); throw e;
    } finally {
      try {
        await loginUi(page, "aranalyst@demo.com");
        // Prefill form for visual confirmation in screenshot
        await page.goto(`/procurement`);
        await page.waitForTimeout(1000);
        evidence.artifactPath = await captureScreenshot(page, "P2P-Step3-Bill-PO", `/procurement`);
      } catch (e) {}
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("P2P-Step3-Bill-PO", evidence);
    }
  });

  test("P2P-Step4-Pay-Bill Pay Vendor Bill", async ({ page }) => {
    // Role: A/R Analyst
    await loginAsRole(api, "aranalyst@demo.com");
    const evidence: ScenarioEvidence = {
      scenarioId: "P2P-Step4-Pay-Bill",
      title: "Pay Vendor Bill",
      status: "PASS",
      startedAt: new Date().toISOString()
    };
    try {
      // Pay Vendor Bill
      const payRes = await apiCall(api, "POST", "/api/netsuite/bill-payments", {
        apInvoiceId: state.apInvoiceId,
        paymentAmount: state.poQuantity * state.poUnitCost,
        notes: "P2P-Step4 Payment"
      });
      expect(payRes.status).toBe(201);
    } catch (e) {
      evidence.status = "FAIL"; evidence.error = String(e); throw e;
    } finally {
      try {
        await loginUi(page, "aranalyst@demo.com");
        evidence.artifactPath = await captureScreenshot(page, "P2P-Step4-Pay-Bill", `/procurement`);
      } catch (e) {}
      evidence.finishedAt = new Date().toISOString();
      await writeEvidence("P2P-Step4-Pay-Bill", evidence);
    }
  });
});
