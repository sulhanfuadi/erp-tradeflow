import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const SCREENSHOT_DIR = './public/docs/screenshots';

test.describe('BPMN Screenshots Generator', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('Generate BPMN Documentation Screenshots', async ({ page }) => {
    // 1. O2C: Create Sales Order
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/o2c_create_sales_order.png`, fullPage: true });

    // Wait, let's create a sales order first to get an ID.
    // Actually, just taking a screenshot of the listing or the workbench is enough for the README.
    // But let's navigate carefully.
    
    // 2. P2P Workbench
    await page.goto('/procurement');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p2p_workbench.png`, fullPage: true });

    // 3. Warehouse Workbench
    await page.goto('/warehouses');
    await page.waitForLoadState('networkidle');
    
    // Click the first warehouse "View" link
    const viewLink = page.locator('a:has-text("View")').first();
    if (await viewLink.isVisible()) {
        await viewLink.click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: `${SCREENSHOT_DIR}/inventory_workbench.png`, fullPage: true });
    } else {
        // Fallback
        await page.screenshot({ path: `${SCREENSHOT_DIR}/inventory_workbench.png`, fullPage: true });
    }

  });
});
