/**
 * Seed Converse Dummy Data
 *
 * Populates the database with realistic Converse store data for BPMN testing.
 *
 * Usage:
 *   npx tsx scripts/seed-converse-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n👟 Seeding Converse Dummy Data...\n");

  // --- 1. CLEANUP (EXCEPT USERS) ---
  console.log("Cleaning up old transactional & master data (keeping users)...");
  await prisma.customerPayment.deleteMany({});
  await prisma.billPayment.deleteMany({});
  await prisma.itemFulfillmentItem.deleteMany({});
  await prisma.itemFulfillment.deleteMany({});
  await prisma.aPInvoice.deleteMany({});
  await prisma.goodsReceiptItem.deleteMany({});
  await prisma.goodsReceipt.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.stockTransfer.deleteMany({});
  await prisma.stockAllocation.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.warehouse.deleteMany({});

  // --- 2. GET USERS ---
  const adminUser = await prisma.user.findFirst({ where: { role: { in: ["admin", "guest-user"] } } }) || await prisma.user.findFirst();
  const salesRep = await prisma.user.findFirst({ where: { email: "salesrep@demo.com" } }) || adminUser;
  const salesMgr = await prisma.user.findFirst({ where: { email: "salesmgr@demo.com" } }) || adminUser;
  const purchasingMgr = await prisma.user.findFirst({ where: { email: "purchasingmgr@demo.com" } }) || adminUser;
  const clientUser = await prisma.user.findFirst({ where: { email: "test@client.com" } }) || adminUser;
  
  if (!adminUser) {
    throw new Error("No admin user found. Please run register first.");
  }
  const uid = adminUser.id;

  // --- 3. WAREHOUSES ---
  console.log("Creating Warehouses...");
  const whCentral = await prisma.warehouse.create({
    data: { name: "Converse Central Distribution", type: "main", address: "Jakarta Utara", userId: uid, createdBy: uid }
  });
  const whRegional = await prisma.warehouse.create({
    data: { name: "Jakarta Regional Hub", type: "secondary", address: "Jakarta Selatan", userId: uid, createdBy: uid }
  });

  // --- 4. SUPPLIERS ---
  console.log("Creating Suppliers...");
  const supGlobal = await prisma.supplier.create({
    data: { name: "Converse Global Manufacturing", description: "Official Global Manufacturer", userId: uid, createdBy: uid }
  });
  const supApparel = await prisma.supplier.create({
    data: { name: "Apparel Supply Co.", description: "Local Apparel Distributor", userId: uid, createdBy: uid }
  });

  // --- 5. CATEGORIES ---
  console.log("Creating Categories...");
  const catSneakers = await prisma.category.create({ data: { name: "Sneakers", userId: uid, createdBy: uid } });
  const catApparel = await prisma.category.create({ data: { name: "Apparel", userId: uid, createdBy: uid } });
  const catAccessories = await prisma.category.create({ data: { name: "Accessories", userId: uid, createdBy: uid } });

  // --- 6. PRODUCTS ---
  console.log("Creating Products...");
  const products = [
    { name: "Chuck Taylor All Star Classic High Top", price: 60.0, sku: "CNV-CT-HI-BLK", qty: 150, cat: catSneakers.id, sup: supGlobal.id },
    { name: "Chuck 70 Vintage Canvas", price: 85.0, sku: "CNV-C70-VNT-WHT", qty: 80, cat: catSneakers.id, sup: supGlobal.id },
    { name: "Run Star Hike Platform", price: 110.0, sku: "CNV-RSH-PLT-BLK", qty: 50, cat: catSneakers.id, sup: supGlobal.id },
    { name: "Converse One Star Pro", price: 75.0, sku: "CNV-OSP-SDE-RED", qty: 45, cat: catSneakers.id, sup: supGlobal.id },
    { name: "Go-To Embroidered Star Chevron Tee", price: 25.0, sku: "CNV-TEE-CHV-BLK", qty: 200, cat: catApparel.id, sup: supApparel.id },
    { name: "Straight Edge Backpack", price: 45.0, sku: "CNV-BAG-EDG-NAV", qty: 30, cat: catAccessories.id, sup: supApparel.id },
  ];

  const dbProducts = [];
  for (const p of products) {
    const prod = await prisma.product.create({
      data: {
        name: p.name,
        price: p.price,
        sku: p.sku,
        quantity: p.qty,
        status: "active",
        categoryId: p.cat,
        supplierId: p.sup,
        userId: uid,
        createdBy: uid
      }
    });
    dbProducts.push(prod);

    // Stock Allocation
    await prisma.stockAllocation.create({
      data: {
        productId: prod.id,
        warehouseId: whCentral.id,
        quantity: p.qty,
        userId: uid
      }
    });
  }

  // --- 7. O2C: SALES ORDERS ---
  console.log("Creating O2C Sales Orders...");
  // Order 1: Pending Approval
  const o1Prod = dbProducts[1]; // Chuck 70
  const o1Qty = 5;
  const order1 = await prisma.order.create({
    data: {
      orderNumber: "ORD-CONV-001",
      userId: salesRep!.id,
      clientId: clientUser!.id,
      createdBy: salesRep!.id,
      status: "pending_approval",
      paymentStatus: "unpaid",
      subtotal: o1Prod.price * o1Qty,
      total: o1Prod.price * o1Qty,
      shippingAddress: { street: "Jl. Sudirman No. 1", city: "Jakarta", country: "Indonesia" },
      items: {
        create: {
          productId: o1Prod.id,
          productName: o1Prod.name,
          sku: o1Prod.sku,
          quantity: o1Qty,
          price: o1Prod.price,
          subtotal: o1Prod.price * o1Qty
        }
      }
    }
  });

  // Order 2: Completed
  const o2Prod = dbProducts[0]; // Chuck Taylor
  const o2Qty = 2;
  const order2 = await prisma.order.create({
    data: {
      orderNumber: "ORD-CONV-002",
      userId: salesMgr!.id,
      clientId: clientUser!.id,
      createdBy: salesMgr!.id,
      status: "delivered",
      paymentStatus: "paid",
      subtotal: o2Prod.price * o2Qty,
      total: o2Prod.price * o2Qty,
      shippingAddress: { street: "Jl. Thamrin No. 10", city: "Jakarta", country: "Indonesia" },
      items: {
        create: {
          productId: o2Prod.id,
          productName: o2Prod.name,
          sku: o2Prod.sku,
          quantity: o2Qty,
          fulfilledQuantity: o2Qty,
          billedQuantity: o2Qty,
          price: o2Prod.price,
          subtotal: o2Prod.price * o2Qty
        }
      }
    }
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-CONV-002",
      orderId: order2.id,
      userId: adminUser!.id,
      clientId: clientUser!.id,
      createdBy: adminUser!.id,
      status: "paid",
      dueDate: new Date(),
      subtotal: order2.total,
      total: order2.total,
      amountPaid: order2.total,
      amountDue: 0
    }
  });

  await prisma.customerPayment.create({
    data: {
      paymentNumber: "CP-CONV-002",
      invoiceId: invoice2.id,
      orderId: order2.id,
      userId: adminUser!.id,
      createdBy: adminUser!.id,
      paymentAmount: order2.total,
      amountApplied: order2.total,
      amountRemaining: 0,
      status: "posted"
    }
  });

  // --- 8. P2P: PURCHASE ORDERS ---
  console.log("Creating P2P Purchase Orders...");
  const poProd = dbProducts[2]; // Run Star Hike
  await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-CONV-001",
      supplierId: supGlobal.id,
      warehouseId: whCentral.id,
      userId: purchasingMgr!.id,
      createdBy: purchasingMgr!.id,
      status: "draft",
      subtotal: poProd.price * 20,
      total: poProd.price * 20,
      expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      items: {
        create: {
          productId: poProd.id,
          productName: poProd.name,
          sku: poProd.sku,
          quantity: 20n,
          unitCost: poProd.price * 0.5, // vendor cost is half of selling price
          subtotal: (poProd.price * 0.5) * 20
        }
      }
    }
  });

  console.log("\n✅ Converse dummy data seeded successfully! You can now test the O2C/P2P flow with realistic data.\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
