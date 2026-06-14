import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('FAILED URL:', response.url(), response.status());
    }
  });

  await page.goto("http://localhost:3000/login");
  await page.click('button[role="combobox"]');
  await page.waitForTimeout(500);
  await page.click(`div[role="option"]:has-text("Sales Representative")`);
  await Promise.all([
    page.waitForNavigation(),
    page.click('button:has-text("Sign In")')
  ]);

  await page.goto("http://localhost:3000/orders/6a2d73662287e50ed8edca6c");
  await page.waitForTimeout(2000);
  
  await browser.close();
}
main();
