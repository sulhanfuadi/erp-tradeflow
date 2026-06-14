import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const invoice = await prisma.invoice.findFirst();
  if (!invoice) return console.log("NO INVOICE IN DB");
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (response.status() >= 400 && response.url().includes('/api/invoices')) {
      console.log('FAILED URL:', response.url(), response.status());
    }
  });

  await page.goto("http://localhost:3000/login");
  await page.click('button[role="combobox"]');
  await page.waitForTimeout(500);
  await page.click(`div[role="option"]:has-text("A/R Analyst")`);
  await Promise.all([
    page.waitForNavigation(),
    page.click('button:has-text("Sign In")')
  ]);

  await page.goto(`http://localhost:3000/invoices/${invoice.id}`);
  await page.waitForTimeout(2000);
  
  const content = await page.textContent('body');
  if (content?.includes('Invoice not found') || content?.includes('not found')) {
    console.log('PAGE SHOWS INVOICE NOT FOUND');
  } else {
    console.log('PAGE LOADED SUCCESSFULLY');
  }
  
  await browser.close();
  await prisma.$disconnect();
}
main();
