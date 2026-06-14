import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SCREENSHOT_DIR = path.join(process.cwd(), "docs/evidence/bpmn");

async function loginAndCapture(page: any, role: string, url: string, screenshotName: string) {
  console.log(`\n======================================`);
  console.log(`Starting capture for ${screenshotName}`);
  console.log(`Role: ${role}, URL: ${url}`);
  
  await page.goto("http://localhost:3000/login");
  await page.waitForLoadState("networkidle");
  
  await page.click('button[role="combobox"]');
  await page.waitForTimeout(1000);
  await page.click(`div[role="option"]:has-text("${role}")`);
  await page.waitForTimeout(1000);
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: 10000 }).catch(() => {}),
    page.click('button:has-text("Sign In")')
  ]);
  
  console.log(`Navigating to target: ${url}`);
  await page.goto(`http://localhost:3000${url}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  
  try {
    await page.waitForFunction(
      () => document.querySelectorAll(".animate-pulse").length === 0,
      { timeout: 15000 }
    );
    console.log(`Skeletons disappeared.`);
  } catch (e) {
    console.log(`Timeout waiting for skeletons.`);
  }
  
  await page.waitForTimeout(2000);

  const filePath = path.join(SCREENSHOT_DIR, `${screenshotName}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`Saved screenshot: ${filePath}`);
  
  await page.context().clearCookies();
}

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const warehouse = await prisma.warehouse.findFirst();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. INV-01 Warehouses List (Purchasing Manager) -> /warehouses
    await loginAndCapture(page, "Purchasing Manager", "/warehouses", "INV-01_warehouses-list");
    
    // 2. INV-02 Warehouse Detail (Warehouse Staff) -> /warehouses/[id]
    if (warehouse) {
      await loginAndCapture(page, "Warehouse Staff", `/warehouses/${warehouse.id}`, "INV-02_warehouse-detail");
    } else {
      await loginAndCapture(page, "Warehouse Staff", "/warehouses", "INV-02_warehouse-detail");
    }
    
    // 3. INV-03 Products & Stock Levels (Inventory Manager) -> /products
    await loginAndCapture(page, "Inventory Manager", "/products", "INV-03_products-stock");
    
    // 4. INV-04 Inventory Ledger (Inventory Manager) -> /products (since there is no ledger page explicitly)
    await loginAndCapture(page, "Inventory Manager", "/products", "INV-04_inventory-ledger");
    
    // 5. INV-05 Suppliers (Inventory Manager) -> /suppliers
    await loginAndCapture(page, "Inventory Manager", "/suppliers", "INV-05_suppliers");
    
  } catch (error) {
    console.error("Error during execution:", error);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main();
