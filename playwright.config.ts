import { defineConfig } from "@playwright/test";
import path from "node:path";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? "3100");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  "mongodb://127.0.0.1:27017/erp_tradeflow?replicaSet=rs0";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results/playwright",
  use: {
    baseURL: BASE_URL,
    storageState: path.join(process.cwd(), "tests/e2e/.auth/user.json"),
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      PLAYWRIGHT_TEST_MODE: "true",
    },
    url: `${BASE_URL}/login`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
