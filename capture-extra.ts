import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SCREENSHOT_DIR = path.join(process.cwd(), "docs/evidence/bpmn");

async function hideOverlays(page: any) {
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      [id*="react-query-devtools"], 
      .tsqd-parent, 
      button[aria-label*="Query Devtools"],
      button[aria-label*="React Query"],
      [class*="react-query-devtools"],
      nextjs-portal,
      #nextjs-placeholder,
      [id*="nextjs-portal"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }).catch(() => {});
}

async function login(page: any, role: string) {
  await page.goto("http://localhost:3000/login");
  await page.waitForLoadState("networkidle");
  await page.click('button[role="combobox"]');
  await page.waitForTimeout(500);
  await page.click(`div[role="option"]:has-text("${role}")`);
  await page.waitForTimeout(500);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: 10000 }).catch(() => {}),
    page.click('button:has-text("Sign In")')
  ]);
  await hideOverlays(page);
}

async function capture(page: any, name: string) {
  await hideOverlays(page);
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath });
  console.log(`Saved screenshot: ${name}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // Need a pending order for fulfillment
  let pendingOrder = await prisma.order.findFirst({ where: { status: 'pending' }, include: { items: true } });
  if (!pendingOrder) {
      // Find a pending approval order and approve it
      const pa = await prisma.order.findFirst({ where: { status: 'pending_approval' }});
      if (pa) {
          pendingOrder = await prisma.order.update({ where: { id: pa.id }, data: { status: 'pending' }, include: { items: true } });
      }
  }

  if (pendingOrder) {
    // Step 3: Pick, Pack, Ship
    await login(page, "Inventory Manager");
    await page.goto(`http://localhost:3000/orders/${pendingOrder.id}`);
    await page.waitForTimeout(2000);
    
    // Open fulfillment modal
    await page.click('button:has-text("Manage Fulfillment")');
    await page.waitForTimeout(1000);
    
    // Click the Fulfillment tab!
    await page.click('button[role="tab"]:has-text("Fulfillment")');
    await page.waitForTimeout(1000);
    
    // It's in "Pick" state
    await capture(page, "O2C-03_fulfillment-pick");
    
    // Click Pick
    await page.click('button:has-text("Pick (Create Fulfillment)")');
    await page.waitForTimeout(2000);
    await capture(page, "O2C-03_fulfillment-pack");
    
    // Click Pack
    await page.click('button:has-text("Pack")');
    await page.waitForTimeout(2000);
    await capture(page, "O2C-03_fulfillment-ship");
    
    // Click Ship
    await page.click('button:has-text("Ship")');
    await page.waitForTimeout(2000);
  }
  
  // Step 4: Invoice a Sales Order
  // Create an invoice from the order we just shipped
  await page.context().clearCookies();
  await login(page, "A/R Analyst");
  await page.goto("http://localhost:3000/admin/client-invoices");
  await page.waitForTimeout(2000);
  
  await page.click('button:has-text("Generate Invoice")');
  await page.waitForTimeout(1000);
  
  if (pendingOrder) {
    // Select order
    await page.click('div[role="dialog"] button[role="combobox"]');
    await page.waitForTimeout(500);
    await page.click(`div[role="option"]:has-text("${pendingOrder.orderNumber}")`);
    await page.waitForTimeout(500);
    
    // Set due date
    await page.fill('input[type="date"]', "2030-12-31");
    await capture(page, "O2C-04_generate-invoice-modal");
    
    await page.click('button[type="submit"]:has-text("Generate Invoice")');
    await page.waitForTimeout(2000);
    
    // Go to the newly created invoice
    const newInvoice = await prisma.invoice.findFirst({ orderBy: { createdAt: 'desc' } });
    if (newInvoice) {
      await page.goto(`http://localhost:3000/invoices/${newInvoice.id}`);
      await page.waitForTimeout(2000);
      await capture(page, "O2C-04_invoice-detail");
      
      // Step 5: Payment
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      await capture(page, "O2C-05_invoice-bottom");
      
      await page.click(`button:has-text("Pay")`);
      await page.waitForTimeout(1000);
      await capture(page, "O2C-05_payment-modal");
      
      await page.click('button:has-text("Secure checkout")');
      await page.waitForTimeout(2000);
      
      await capture(page, "O2C-05_payment-success");
    }
  }

  await browser.close();
  await prisma.$disconnect();
}

main().catch(console.error);
