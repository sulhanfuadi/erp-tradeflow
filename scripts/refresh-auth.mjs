/**
 * refresh-auth.mjs
 * Registers a fresh E2E user, logs in, writes session cookie to
 * tests/e2e/.auth/user.json (Playwright storageState format).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "http://127.0.0.1:3100";
const AUTH_FILE = path.join(__dirname, "tests/e2e/.auth/user.json");

const email = `refresh.${Date.now()}@example.com`;
const password = "RefreshP@ss123";
const name = "Refresh Auth User";

console.log(`🔐 Registering ${email}...`);

const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name, email, password }),
});

if (![200, 201, 409].includes(registerRes.status)) {
  const text = await registerRes.text();
  throw new Error(`Register failed (${registerRes.status}): ${text}`);
}
console.log(`  ✅ Registered (status: ${registerRes.status})`);

console.log(`🔑 Logging in...`);
const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});

if (!loginRes.ok) {
  const text = await loginRes.text();
  throw new Error(`Login failed (${loginRes.status}): ${text}`);
}

// Extract Set-Cookie header
const setCookieHeader = loginRes.headers.get("set-cookie");
if (!setCookieHeader) {
  throw new Error("No Set-Cookie header in login response");
}

// Parse cookie parts
const cookieParts = setCookieHeader.split(";").map((p) => p.trim());
const [nameValue, ...attrs] = cookieParts;
const [cookieName, cookieValue] = nameValue.split("=");

const expiresAttr = attrs.find((a) => a.toLowerCase().startsWith("expires="));
const expires = expiresAttr
  ? new Date(expiresAttr.split("=")[1]).getTime() / 1000
  : Date.now() / 1000 + 3600;

const storageState = {
  cookies: [
    {
      name: cookieName,
      value: cookieValue,
      domain: "127.0.0.1",
      path: "/",
      expires,
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ],
  origins: [],
};

await fs.mkdir(path.dirname(AUTH_FILE), { recursive: true });
await fs.writeFile(AUTH_FILE, JSON.stringify(storageState, null, 2));

console.log(`  ✅ Auth refreshed → ${AUTH_FILE}`);
console.log(`  🕐 Token expires at: ${new Date(expires * 1000).toISOString()}`);
