import { PrismaClient } from "@prisma/client";
import { createItemFulfillment } from "./prisma/netsuite";

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    where: { status: "pending" },
    include: { items: true },
  });

  if (!order) {
    console.log("No pending order found");
    return;
  }

  const inventoryMgr = await prisma.user.findFirst({ where: { role: "inventory_manager" } });
  
  if (!inventoryMgr) {
    console.log("No inventory manager found");
    return;
  }

  console.log("Found order:", order.id, "Items:", order.items.length);
  
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
