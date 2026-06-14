import { PrismaClient } from "@prisma/client";
import { createItemFulfillment } from "./prisma/netsuite";

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findUnique({
    where: { orderNumber: "ORD-2026-0614-133439-0006" },
    include: { items: true },
  });

  if (!order) return console.log("no order");

  const inventoryMgr = await prisma.user.findFirst({ where: { role: "inventory_manager" } });
  if (!inventoryMgr) return console.log("no inv mgr");

  try {
    const fulfillment = await createItemFulfillment(
      {
        orderId: order.id,
        items: order.items.map(i => ({ orderItemId: i.id, quantity: i.quantity })),
      },
      inventoryMgr.id
    );
    console.log("Fulfillment created successfully:", fulfillment.id);
  } catch (err) {
    console.error("Error creating fulfillment:", err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
