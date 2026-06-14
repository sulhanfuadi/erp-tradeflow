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
  const inventoryMgr = await prisma.user.findFirst({ where: { email: "inventorymgr@demo.com" } }) || adminUser;
  
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
  const whSurabaya = await prisma.warehouse.create({
    data: { name: "Surabaya Fulfillment Center", type: "secondary", address: "Surabaya Timur", userId: uid, createdBy: uid }
  });

  // --- 4. SUPPLIERS ---
  console.log("Creating Suppliers...");
  const supGlobal = await prisma.supplier.create({
    data: { name: "Converse Global Manufacturing", description: "Official Global Manufacturer", userId: uid, createdBy: uid }
  });
  const supApparel = await prisma.supplier.create({
    data: { name: "Apparel Supply Co.", description: "Local Apparel Distributor", userId: uid, createdBy: uid }
  });
  const supAccessories = await prisma.supplier.create({
    data: { name: "Premium Laces & Accessories Ltd.", description: "Supplier for premium shoelaces and socks", userId: uid, createdBy: uid }
  });
  const supNike = await prisma.supplier.create({
    data: { name: "Nike Inc. (Parent Company)", description: "Special drops and limited editions", userId: uid, createdBy: uid }
  });

  // --- 5. CATEGORIES ---
  console.log("Creating Categories...");
  const catSneakers = await prisma.category.create({ data: { name: "Sneakers", userId: uid, createdBy: uid } });
  const catApparel = await prisma.category.create({ data: { name: "Apparel", userId: uid, createdBy: uid } });
  const catAccessories = await prisma.category.create({ data: { name: "Accessories", userId: uid, createdBy: uid } });
  const catLimited = await prisma.category.create({ data: { name: "Limited Edition", userId: uid, createdBy: uid } });
  const catKids = await prisma.category.create({ data: { name: "Kids & Toddlers", userId: uid, createdBy: uid } });

  // --- 6. PRODUCTS ---
  console.log("Creating Products...");
  const products = [
    { name: "Chuck Taylor All Star Classic High Top", price: 60.0, sku: "CNV-CT-HI-BLK", qty: 450, cat: catSneakers.id, sup: supGlobal.id },
    { name: "Chuck 70 Vintage Canvas", price: 85.0, sku: "CNV-C70-VNT-WHT", qty: 280, cat: catSneakers.id, sup: supGlobal.id },
    { name: "Run Star Hike Platform", price: 110.0, sku: "CNV-RSH-PLT-BLK", qty: 150, cat: catSneakers.id, sup: supGlobal.id },
    { name: "Converse One Star Pro", price: 75.0, sku: "CNV-OSP-SDE-RED", qty: 145, cat: catSneakers.id, sup: supGlobal.id },
    { name: "Go-To Embroidered Star Chevron Tee", price: 25.0, sku: "CNV-TEE-CHV-BLK", qty: 300, cat: catApparel.id, sup: supApparel.id },
    { name: "Straight Edge Backpack", price: 45.0, sku: "CNV-BAG-EDG-NAV", qty: 80, cat: catAccessories.id, sup: supApparel.id },
    { name: "CDG Play x Converse Chuck 70", price: 150.0, sku: "CNV-CDG-C70-BLK", qty: 25, cat: catLimited.id, sup: supNike.id },
    { name: "Off-White x Converse Vulcanized", price: 450.0, sku: "CNV-OW-VULC", qty: 10, cat: catLimited.id, sup: supNike.id },
    { name: "Kids Chuck Taylor All Star Low", price: 35.0, sku: "CNV-KID-LOW-WHT", qty: 120, cat: catKids.id, sup: supGlobal.id },
    { name: "Premium Cotton Crew Socks", price: 12.0, sku: "CNV-SCK-CRW-WHT", qty: 500, cat: catAccessories.id, sup: supAccessories.id },
    { name: "Classic Windbreaker Jacket", price: 65.0, sku: "CNV-JKT-WND-RED", qty: 60, cat: catApparel.id, sup: supApparel.id },
    { name: "Replacement Shoelaces (Black)", price: 5.0, sku: "CNV-LCE-BLK-54", qty: 1000, cat: catAccessories.id, sup: supAccessories.id },
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

    // Stock Allocation (split across central and regional)
    await prisma.stockAllocation.create({
      data: {
        productId: prod.id,
        warehouseId: whCentral.id,
        quantity: Math.floor(p.qty * 0.7), // 70% in central
        userId: uid
      }
    });
    
    if (p.qty > 10) {
      await prisma.stockAllocation.create({
        data: {
          productId: prod.id,
          warehouseId: whRegional.id,
          quantity: Math.ceil(p.qty * 0.3), // 30% in regional
          userId: uid
        }
      });
    }
  }

  // --- 7. O2C: SALES ORDERS ---
  console.log("Creating O2C Sales Orders...");
  
  // Create an order for the screenshot (Pending Approval)
  // We want to make sure the user sees a rich sales order
  const orderItemsPending = [
    { prod: dbProducts[1]!, qty: 5 },  // Chuck 70
    { prod: dbProducts[6]!, qty: 2 },  // CDG Play
    { prod: dbProducts[9]!, qty: 10 }, // Socks
  ];
  const pendingTotal = orderItemsPending.reduce((sum, item) => sum + (item.prod.price * item.qty), 0);
  
  await prisma.order.create({
    data: {
      orderNumber: "ORD-CONV-1001",
      userId: salesRep!.id,
      clientId: clientUser!.id,
      createdBy: salesRep!.id,
      status: "pending_approval",
      paymentStatus: "unpaid",
      subtotal: pendingTotal,
      total: pendingTotal,
      shippingAddress: { street: "Jl. Sudirman No. 1", city: "Jakarta", country: "Indonesia" },
      items: {
        create: orderItemsPending.map(i => ({
          productId: i.prod.id,
          productName: i.prod.name,
          sku: i.prod.sku,
          quantity: i.qty,
          price: i.prod.price,
          subtotal: i.prod.price * i.qty
        }))
      }
    }
  });

  // Order 2: Completed (Delivered & Paid)
  const orderItemsDelivered = [
    { prod: dbProducts[0]!, qty: 20 }, // Classic High Top
    { prod: dbProducts[5]!, qty: 5 },  // Backpack
  ];
  const deliveredTotal = orderItemsDelivered.reduce((sum, item) => sum + (item.prod.price * item.qty), 0);
  
  const order2 = await prisma.order.create({
    data: {
      orderNumber: "ORD-CONV-1002",
      userId: salesMgr!.id,
      clientId: clientUser!.id,
      createdBy: salesMgr!.id,
      status: "delivered",
      paymentStatus: "paid",
      subtotal: deliveredTotal,
      total: deliveredTotal,
      shippingAddress: { street: "Jl. Thamrin No. 10", city: "Jakarta", country: "Indonesia" },
      items: {
        create: orderItemsDelivered.map(i => ({
          productId: i.prod.id,
          productName: i.prod.name,
          sku: i.prod.sku,
          quantity: i.qty,
          fulfilledQuantity: i.qty,
          billedQuantity: i.qty,
          price: i.prod.price,
          subtotal: i.prod.price * i.qty
        }))
      }
    }
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-CONV-1002",
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
      paymentNumber: "CP-CONV-1002",
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
  
  // Order 3: Pending Fulfillment (Approved)
  const orderItemsApproved = [
    { prod: dbProducts[2]!, qty: 8 },  // Run Star Hike
    { prod: dbProducts[8]!, qty: 15 }, // Kids Chuck
  ];
  const approvedTotal = orderItemsApproved.reduce((sum, item) => sum + (item.prod.price * item.qty), 0);
  
  await prisma.order.create({
    data: {
      orderNumber: "ORD-CONV-1003",
      userId: salesMgr!.id,
      clientId: clientUser!.id,
      createdBy: salesMgr!.id,
      status: "pending", // means approved and pending fulfillment
      paymentStatus: "unpaid",
      subtotal: approvedTotal,
      total: approvedTotal,
      shippingAddress: { street: "Jl. Gatot Subroto No. 45", city: "Jakarta", country: "Indonesia" },
      items: {
        create: orderItemsApproved.map(i => ({
          productId: i.prod.id,
          productName: i.prod.name,
          sku: i.prod.sku,
          quantity: i.qty,
          price: i.prod.price,
          subtotal: i.prod.price * i.qty
        }))
      }
    }
  });
  
  // Order 4: Cancelled
  const orderItemsCancelled = [
    { prod: dbProducts[3]!, qty: 2 },  // One Star Pro
  ];
  const cancelledTotal = orderItemsCancelled.reduce((sum, item) => sum + (item.prod.price * item.qty), 0);
  
  await prisma.order.create({
    data: {
      orderNumber: "ORD-CONV-1004",
      userId: salesRep!.id,
      clientId: clientUser!.id,
      createdBy: salesRep!.id,
      status: "cancelled",
      paymentStatus: "unpaid",
      subtotal: cancelledTotal,
      total: cancelledTotal,
      shippingAddress: { street: "Jl. Diponegoro No. 8", city: "Bandung", country: "Indonesia" },
      items: {
        create: orderItemsCancelled.map(i => ({
          productId: i.prod.id,
          productName: i.prod.name,
          sku: i.prod.sku,
          quantity: i.qty,
          price: i.prod.price,
          subtotal: i.prod.price * i.qty
        }))
      }
    }
  });

  // --- 8. P2P: PURCHASE ORDERS ---
  console.log("Creating P2P Purchase Orders...");
  
  // PO 1: Draft
  const poProd1 = dbProducts[2]!; // Run Star Hike
  await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-CONV-2001",
      supplierId: supGlobal.id,
      warehouseId: whCentral.id,
      userId: purchasingMgr!.id,
      createdBy: purchasingMgr!.id,
      status: "draft",
      subtotal: poProd1.price * 50,
      total: poProd1.price * 50,
      expectedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      items: {
        create: {
          productId: poProd1.id,
          productName: poProd1.name,
          sku: poProd1.sku,
          quantity: BigInt(50),
          unitCost: poProd1.price * 0.4, // vendor cost
          subtotal: (poProd1.price * 0.4) * 50
        }
      }
    }
  });
  
  // PO 2: Pending Receipt
  const poProd2 = dbProducts[7]!; // Off-White
  await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-CONV-2002",
      supplierId: supNike.id,
      warehouseId: whCentral.id,
      userId: purchasingMgr!.id,
      createdBy: purchasingMgr!.id,
      status: "pending_receipt",
      subtotal: poProd2.price * 20,
      total: poProd2.price * 20,
      expectedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      items: {
        create: {
          productId: poProd2.id,
          productName: poProd2.name,
          sku: poProd2.sku,
          quantity: BigInt(20),
          unitCost: poProd2.price * 0.6, // vendor cost
          subtotal: (poProd2.price * 0.6) * 20
        }
      }
    }
  });
  
  // PO 3: Received & Billed
  const poProd3 = dbProducts[10]!; // Windbreaker
  const po3 = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-CONV-2003",
      supplierId: supApparel.id,
      warehouseId: whRegional.id,
      userId: purchasingMgr!.id,
      createdBy: purchasingMgr!.id,
      status: "billed",
      subtotal: poProd3.price * 100,
      total: poProd3.price * 100,
      expectedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      items: {
        create: {
          productId: poProd3.id,
          productName: poProd3.name,
          sku: poProd3.sku,
          quantity: BigInt(100),
          receivedQuantity: BigInt(100),
          billedQuantity: BigInt(100),
          unitCost: poProd3.price * 0.3, // vendor cost
          subtotal: (poProd3.price * 0.3) * 100
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
