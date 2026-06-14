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

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. P2P-01 Create Purchase Order (Purchasing Manager) -> /procurement
    await loginAndCapture(page, "Purchasing Manager", "/procurement", "P2P-01_procurement-workbench");
    
    // 2. P2P-03 Item Receipt (Inventory Manager) -> /procurement
    await loginAndCapture(page, "Inventory Manager", "/procurement", "P2P-03_item-receipt");
    
    // 3. P2P-04 Vendor Bill (A/R Analyst) -> /procurement
    await loginAndCapture(page, "A/R Analyst", "/procurement", "P2P-04_vendor-bill");
    
    // 4. P2P-05 Bill Payment (A/R Analyst) -> /procurement
    await loginAndCapture(page, "A/R Analyst", "/procurement", "P2P-05_bill-payment");
    
  } catch (error) {
    console.error("Error during execution:", error);
  } finally {
    await browser.close();
  }
}

main();
