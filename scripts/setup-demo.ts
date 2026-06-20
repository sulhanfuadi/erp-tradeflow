/**
 * Setup Demo Database
 *
 * Creates initial admin user and all demo accounts.
 * Run this on fresh database.
 *
 * Usage:
 *   npx tsx scripts/setup-demo.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Load .env manually since tsx doesn't auto-load it
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (key && valueParts.length) {
      const value = valueParts.join("=").replace(/^["']|["']$/g, "");
      process.env[key.trim()] = value.trim();
    }
  }
  console.log("✅ Loaded .env from:", envPath);
} else {
  console.log("⚠️  .env not found at:", envPath);
}

const prisma = new PrismaClient();

const PASSWORD_PLAIN = "12345678";

async function main() {
  console.log("\n🚀 Setting up demo database...\n");

  // --- 1. CREATE ADMIN USER (if not exists) ---
  console.log("Checking admin user...");
  const adminEmail = "admin@demo.com";
  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, name: true, role: true },
  });

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash(PASSWORD_PLAIN, 10);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Admin User",
        username: "admin",
        password: hashedPassword,
        role: "admin",
        createdAt: new Date(),
      },
      select: { id: true, name: true, role: true },
    });
    console.log(`   ✅ Created admin: ${adminEmail} (${adminUser.name}, role: ${adminUser.role})`);
  } else {
    console.log(`   ⏭ Admin already exists: ${adminEmail} (${adminUser.name}, role: ${adminUser.role})`);
  }

  const uid = adminUser.id;

  // --- 2. CREATE DEMO USERS ---
  console.log("\nCreating demo users...");
  
  const DEMO_USERS = [
    { email: "test@client.com", name: "Test Client", username: "testclient", role: "client" },
    { email: "test@supplier.com", name: "Test Supplier", username: "testsupplier", role: "supplier" },
    { email: "salesrep@demo.com", name: "Sales Representative", username: "salesrep", role: "sales_representative" },
    { email: "salesmgr@demo.com", name: "Sales Manager", username: "salesmgr", role: "sales_manager" },
    { email: "invmgr@demo.com", name: "Inventory Manager", username: "invmgr", role: "inventory_manager" },
    { email: "aranalyst@demo.com", name: "A/R Analyst", username: "aranalyst", role: "ar_analyst" },
    { email: "apanalyst@demo.com", name: "A/P Analyst", username: "apanalyst", role: "ap_analyst" },
    { email: "purchasingmgr@demo.com", name: "Purchasing Manager", username: "purchasingmgr", role: "purchasing_manager" },
    { email: "warehouse@demo.com", name: "Warehouse Staff", username: "warehouse", role: "warehouse_staff" },
  ];

  const hashedPassword = await bcrypt.hash(PASSWORD_PLAIN, 10);

  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
      select: { id: true, name: true, role: true },
    });

    if (existing) {
      console.log(`   ⏭ ${u.email} already exists (${existing.name}, role: ${existing.role ?? "—"}). Skipping.`);
      continue;
    }

    await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        username: u.username,
        password: hashedPassword,
        role: u.role,
        createdAt: new Date(),
      },
    });
    console.log(`   ✅ Created ${u.email} (${u.name}, role: ${u.role})`);
  }

  // --- 3. LINK SUPPLIER USER ---
  console.log("\nLinking supplier user...");
  const supplierUser = await prisma.user.findUnique({
    where: { email: "test@supplier.com" },
    select: { id: true },
  });

  if (supplierUser) {
    const firstSupplier = await prisma.supplier.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });

    if (firstSupplier) {
      await prisma.supplier.update({
        where: { id: firstSupplier.id },
        data: {
          userId: supplierUser.id,
          createdBy: supplierUser.id,
          updatedBy: supplierUser.id,
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ Linked supplier "${firstSupplier.name}" to test@supplier.com`);
    } else {
      await prisma.supplier.create({
        data: {
          name: "Demo Supplier",
          userId: supplierUser.id,
          status: true,
          createdBy: supplierUser.id,
          updatedBy: supplierUser.id,
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ Created "Demo Supplier" and linked to test@supplier.com`);
    }
  }

  console.log("\n✅ Demo setup complete!");
  console.log("\n📋 Login credentials (all use password: " + PASSWORD_PLAIN + "):");
  console.log("   - admin@demo.com / Admin User / role: admin");
  console.log("   - test@client.com / Test Client / role: client");
  console.log("   - test@supplier.com / Test Supplier / role: supplier");
  console.log("   - salesrep@demo.com / Sales Representative / role: sales_representative");
  console.log("   - salesmgr@demo.com / Sales Manager / role: sales_manager");
  console.log("   - invmgr@demo.com / Inventory Manager / role: inventory_manager");
  console.log("   - aranalyst@demo.com / A/R Analyst / role: ar_analyst");
  console.log("   - apanalyst@demo.com / A/P Analyst / role: ap_analyst");
  console.log("   - purchasingmgr@demo.com / Purchasing Manager / role: purchasing_manager");
  console.log("   - warehouse@demo.com / Warehouse Staff / role: warehouse_staff\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());