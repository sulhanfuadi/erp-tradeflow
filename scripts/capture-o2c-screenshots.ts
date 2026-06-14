import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = path.join(process.cwd(), "docs/evidence/bpmn");

async function loginAndCapture(page: any, role: string, url: string, screenshotName: string) {
  console.log(`\n======================================`);
  console.log(`Starting capture for ${screenshotName}`);
  console.log(`Role: ${role}, URL: ${url}`);
  
  await page.goto("http://localhost:3000/login");
  await page.waitForLoadState("networkidle");
  
  // Select role from dropdown
  await page.click('button[role="combobox"]');
  await page.waitForTimeout(1000);
  await page.click(`div[role="option"]:has-text("${role}")`);
  await page.waitForTimeout(1000);
  
  // Click Sign In
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: 10000 }).catch(() => {}),
    page.click('button:has-text("Sign In")')
  ]);
  
  // Navigate to target URL
  console.log(`Navigating to target: ${url}`);
  await page.goto(`http://localhost:3000${url}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  
  // Wait for skeletons to disappear
  try {
    await page.waitForFunction(
      () => document.querySelectorAll(".animate-pulse").length === 0,
      { timeout: 15000 }
    );
    console.log(`Skeletons disappeared.`);
  } catch (e) {
    console.log(`Timeout waiting for skeletons. Taking screenshot anyway.`);
  }
  
  await page.waitForTimeout(2000); // extra wait for charts/data
  
  const filePath = path.join(SCREENSHOT_DIR, `${screenshotName}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`Saved screenshot: ${filePath}`);
  
  // Logout for next session by clearing cookies
  await page.context().clearCookies();
}

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    // 1. O2C-01 Create Sales Order (Sales Rep) -> /orders
    await loginAndCapture(page, "Sales Representative", "/orders", "O2C-01_create-sales-order");
    
    // 2. O2C-02 Approve Sales Order (Sales Manager) -> /admin/orders
    await loginAndCapture(page, "Sales Manager", "/admin/orders", "O2C-02_approve-sales-order");
    
    // 3. O2C-03 Fulfill Sales Order (Inventory Manager) -> /admin/client-orders
    await loginAndCapture(page, "Inventory Manager", "/admin/client-orders", "O2C-03_item-fulfillment");
    
    // 4. O2C-04 Invoice Customer (A/R Analyst) -> /invoices
    await loginAndCapture(page, "A/R Analyst", "/invoices", "O2C-04_customer-invoice");
    
    // 5. O2C-05 Receive Customer Payment (A/R Analyst) -> /admin/client-invoices
    await loginAndCapture(page, "A/R Analyst", "/admin/client-invoices", "O2C-05_customer-payment");
    
  } catch (error) {
    console.error("Error during execution:", error);
  } finally {
    await browser.close();
  }
}

main();
