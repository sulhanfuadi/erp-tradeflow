import { request, type FullConfig } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

function randomId(length = 8): string {
  return Math.random().toString(36).slice(2, 2 + length);
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function postWithRetry(
  baseContext: Awaited<ReturnType<typeof request.newContext>>,
  pathName: string,
  payload: Record<string, unknown>,
  attempts = 3,
): Promise<Awaited<ReturnType<typeof baseContext.post>>> {
  let latestError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await baseContext.post(pathName, {
        data: payload,
        timeout: 180_000,
      });
    } catch (error) {
      latestError = error;
      if (attempt < attempts) {
        await sleep(2_000 * attempt);
      }
    }
  }

  throw latestError instanceof Error
    ? latestError
    : new Error("POST retry failed");
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    (config.projects[0]?.use?.baseURL as string | undefined) ??
    "http://127.0.0.1:3100";

  const authDir = path.join(process.cwd(), "tests/e2e/.auth");
  const authFile = path.join(authDir, "user.json");
  const evidenceDir = path.join(process.cwd(), "docs/evidence/auto");

  await ensureDir(authDir);
  await ensureDir(evidenceDir);

  const context = await request.newContext({
    baseURL,
    timeout: 180_000,
  });

  const email = `e2e.${Date.now()}.${randomId()}@example.com`;
  const password = `E2Epass!${randomId(6)}`;
  const name = `E2E User ${randomId(5)}`;

  const registerResponse = await postWithRetry(context, "/api/auth/register", {
    name,
    email,
    password,
  });

  if (![201, 409].includes(registerResponse.status())) {
    const payload = await registerResponse.text();
    throw new Error(
      `Global setup register failed (${registerResponse.status()}): ${payload}`,
    );
  }

  const loginResponse = await postWithRetry(context, "/api/auth/login", {
    email,
    password,
  });

  if (!loginResponse.ok()) {
    const payload = await loginResponse.text();
    throw new Error(
      `Global setup login failed (${loginResponse.status()}): ${payload}`,
    );
  }

  await context.storageState({ path: authFile });

  const bootstrapEvidence = {
    status: "PASS",
    baseURL,
    user: {
      name,
      email,
    },
    generatedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(evidenceDir, "TS-00-bootstrap.json"),
    JSON.stringify(bootstrapEvidence, null, 2),
    "utf-8",
  );

  await context.dispose();
}
