import { PrismaClient } from "@prisma/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const prisma = new PrismaClient();

// Helper to fetch with a specific role
async function fetchAsRole(role: string, method: string, path: string, body?: any) {
  // Find a user with this role
  let user = await prisma.user.findFirst({ where: { role } });
  
  // If the role doesn't exist natively in the DB (like sales_manager), we find the specific demo user
  if (!user) {
    if (role === "sales_manager") user = await prisma.user.findFirst({ where: { email: "salesmgr@demo.com" } });
    else if (role === "purchasing_manager") user = await prisma.user.findFirst({ where: { email: "purchasingmgr@demo.com" } });
    else if (role === "inventory_manager") user = await prisma.user.findFirst({ where: { email: "invmgr@demo.com" } });
    else if (role === "ap_analyst") user = await prisma.user.findFirst({ where: { email: "apanalyst@demo.com" } });
    else if (role === "ar_analyst") user = await prisma.user.findFirst({ where: { email: "aranalyst@demo.com" } });
    else if (role === "sales_representative") user = await prisma.user.findFirst({ where: { email: "salesrep@demo.com" } });
  }

  if (!user) throw new Error(`User for role ${role} not found`);

  const resAuth = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: "12345678" })
  });

  const cookies = resAuth.headers.get("set-cookie");
  
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 
      "Content-Type": "application/json",
      "Cookie": cookies || ""
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function run() {
  console.log("=== P2P Demo Dry-Run ===");
  const products = await prisma.product.findMany({ take: 1 });
  const wh = await prisma.warehouse.findMany({ take: 1 });
  const supplier = await prisma.supplier.findMany({ take: 1 });

  const s = supplier[0];
  const w = wh[0];
  const p = await prisma.product.findFirst({ where: { supplierId: s.id } });
  if (!p) throw new Error("No product found for supplier");

  console.log("Purchasing Manager: Create PO");
  const poRes = await fetchAsRole("purchasing_manager", "POST", "/api/netsuite/purchase-orders", {
    supplierId: s.id,
    warehouseId: w.id,
    expectedDate: new Date().toISOString(),
    items: [{ productId: p.id, quantity: 10, unitCost: 50 }]
  });
  console.log("Create PO:", poRes.status);
  if (poRes.status >= 400) console.log("PO Error:", JSON.stringify(poRes.data));
  
  if (poRes.status === 201) {
    const poId = poRes.data.id;
    // We need the purchaseOrderItemId to create the receipt
    // Wait, the IR payload requires `purchaseOrderItemId`!
    // The previous script didn't pass it! That's why IR failed with 400!
    const createdPo = poRes.data;
    const poItemId = createdPo.items[0].id;

    console.log("Inventory Manager: Item Receipt");
    const irRes = await fetchAsRole("inventory_manager", "POST", "/api/netsuite/item-receipts", {
      purchaseOrderId: poId,
      notes: "Test IR",
      items: [{ purchaseOrderItemId: poItemId, quantity: 10 }]
    });
    console.log("Create IR:", irRes.status);
    if (irRes.status >= 400) console.log("IR Error:", JSON.stringify(irRes.data));

    console.log("A/P Analyst: Vendor Bill");
    const vbRes = await fetchAsRole("ap_analyst", "POST", "/api/netsuite/vendor-bills", {
      purchaseOrderId: poId,
      supplierId: s.id,
      amount: 500, // Wait, Vendor Bill payload takes `subtotal`? Let's check schema
      subtotal: 500,
      dueDate: new Date().toISOString()
    });
    console.log("Create VB:", vbRes.status);
    if (vbRes.status >= 400) console.log("VB Error:", JSON.stringify(vbRes.data));
  }

  // Check unauthorized access
  console.log("Client role: Attempt Create PO");
  const unauthRes = await fetchAsRole("client", "POST", "/api/netsuite/purchase-orders", {
    supplierId: s.id,
    warehouseId: w.id,
    expectedDate: new Date().toISOString(),
    items: [{ productId: p.id, quantity: 10, unitCost: 50 }]
  });
  console.log("Client PO status:", unauthRes.status);

  console.log("\\n=== O2C Demo Dry-Run ===");
  const client = await prisma.user.findFirst({ where: { role: "client" } });
  if (!client) throw new Error("No client found");

  console.log("Sales Rep: Create SO");
  const soRes = await fetchAsRole("sales_representative", "POST", "/api/netsuite/sales-orders", {
    clientId: client.id,
    warehouseId: w.id,
    items: [{ productId: p.id, quantity: 1, unitPrice: 100 }]
  });
  console.log("Create SO:", soRes.status);
  if (soRes.status >= 400) console.log("SO Error:", JSON.stringify(soRes.data));

  if (soRes.status === 201) {
    const soId = soRes.data.id;
    console.log("Sales Manager: Approve SO");
    const approveRes = await fetchAsRole("sales_manager", "POST", `/api/netsuite/sales-orders/${soId}/approve`, {});
    console.log("Approve SO:", approveRes.status);

    console.log("Inventory Manager: Fulfill SO");
    const soItemId = soRes.data.items[0].id;
    const fulfillRes = await fetchAsRole("inventory_manager", "POST", "/api/netsuite/item-fulfillments", {
      orderId: soId,
      items: [{ orderItemId: soItemId, quantity: 1 }]
    });
    console.log("Fulfill SO:", fulfillRes.status);
    if (fulfillRes.status >= 400) console.log("Fulfill Error:", JSON.stringify(fulfillRes.data));

    console.log("A/R Analyst: Create Invoice");
    const invRes = await fetchAsRole("ar_analyst", "POST", "/api/netsuite/customer-invoices", {
      orderId: soId,
      clientId: client.id,
      subtotal: 100,
      dueDate: new Date().toISOString()
    });
    console.log("Create Invoice:", invRes.status);
    if (invRes.status >= 400) console.log("Invoice Error:", JSON.stringify(invRes.data));
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
