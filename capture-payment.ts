import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SCREENSHOT_DIR = path.join(process.cwd(), "docs/evidence/bpmn");

async function capture(page: any, name: string) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath });
  console.log(`Saved screenshot: ${name}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  const invoice = await prisma.invoice.findFirst({ orderBy: { createdAt: 'desc' } });
  if (invoice) {
    // Reset to unpaid first
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'unpaid' } });

    await page.goto("http://localhost:3000/login");
    await page.click('button[role="combobox"]');
    await page.click(`div[role="option"]:has-text("Inventory Manager")`);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(2000);
    
    // Go directly to the invoice detail page as the client!
    await page.goto(`http://localhost:3000/invoices/${invoice.id}`);
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    // Specifically target the Pay button in the dialog trigger
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const payBtn = btns.find(b => b.textContent && b.textContent.includes('Pay $'));
      if (payBtn) payBtn.click();
    });
    await page.waitForTimeout(1000);
    
    await capture(page, "O2C-05_payment-modal");
    
    // Evaluate JS to find and click the Secure checkout button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const checkoutBtn = btns.find(b => b.textContent && b.textContent.includes('checkout'));
      if (checkoutBtn) checkoutBtn.click();
    });
    
    await page.waitForTimeout(5000); // wait for redirect and loading
    
    await page.evaluate(() => window.scrollTo(0, 0)); // scroll to top to show PAID badge
    await capture(page, "O2C-05_payment-success");
  }

  await browser.close();
  await prisma.$disconnect();
}

main().catch(console.error);
