/**
 * Stock Consistency Verifier
 * 
 * Invariant: Product.quantity MUST equal the sum of StockAllocation.quantity 
 * across all warehouses for that product.
 * 
 * Run with: npx tsx scripts/verify-stock-consistency.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Stock Consistency Verification...");

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      quantity: true,
    },
  });

  const allocations = await prisma.stockAllocation.findMany({
    select: {
      productId: true,
      quantity: true,
    },
  });

  let inconsistencies = 0;

  for (const product of products) {
    const productAllocations = allocations.filter((a) => a.productId === product.id);
    const sumAllocated = productAllocations.reduce((sum, a) => sum + Number(a.quantity), 0);
    const productQty = Number(product.quantity);

    if (sumAllocated !== productQty) {
      console.error(`❌ INCONSISTENCY DETECTED: Product [${product.sku}] ${product.name}`);
      console.error(`   Product.quantity: ${productQty}`);
      console.error(`   Sum of StockAllocation.quantity: ${sumAllocated}`);
      inconsistencies++;
    }
  }

  if (inconsistencies === 0) {
    console.log(`✅ All ${products.length} products have consistent stock aggregates.`);
  } else {
    console.log(`⚠️ Found ${inconsistencies} products with stock inconsistencies.`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
