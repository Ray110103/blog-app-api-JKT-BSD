import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function updateProductWeights() {
  console.log("🔄 Starting product weight update...\n");

  try {
    // Count products before update
    const totalProducts = await prisma.product.count();
    console.log(`📦 Total products in database: ${totalProducts}\n`);

    // Update Single Cards (5 grams typical)
    console.log("⚡ Updating Single Cards...");
    const singleCardsUpdated = await prisma.product.updateMany({
      where: {
        productType: "SINGLE_CARD",
        weight: 100, // Only update defaults
      },
      data: { weight: 5 },
    });
    console.log(`✅ Updated ${singleCardsUpdated.count} single cards to 5g\n`);

    // Update Booster Packs (20 grams)
    console.log("📦 Updating Booster Packs...");
    const boosterPacks = await prisma.product.updateMany({
      where: {
        productType: "SEALED_PRODUCT",
        weight: 100,
        name: { contains: "Booster Pack", mode: "insensitive" },
      },
      data: { weight: 20 },
    });
    console.log(`✅ Updated ${boosterPacks.count} booster packs to 20g\n`);

    // Update Booster Boxes (500 grams)
    console.log("📦 Updating Booster Boxes...");
    const boosterBoxes = await prisma.product.updateMany({
      where: {
        productType: "SEALED_PRODUCT",
        weight: 100,
        name: { contains: "Booster Box", mode: "insensitive" },
      },
      data: { weight: 500 },
    });
    console.log(`✅ Updated ${boosterBoxes.count} booster boxes to 500g\n`);

    // Update Elite Trainer Boxes (400 grams)
    console.log("📦 Updating Elite Trainer Boxes...");
    const eliteTrainer = await prisma.product.updateMany({
      where: {
        productType: "SEALED_PRODUCT",
        weight: 100,
        name: { contains: "Elite Trainer", mode: "insensitive" },
      },
      data: { weight: 400 },
    });
    console.log(`✅ Updated ${eliteTrainer.count} elite trainer boxes to 400g\n`);

    // Update Starter Decks (150 grams)
    console.log("📦 Updating Starter Decks...");
    const starterDecks = await prisma.product.updateMany({
      where: {
        productType: "SEALED_PRODUCT",
        weight: 100,
        name: { contains: "Deck", mode: "insensitive" },
      },
      data: { weight: 150 },
    });
    console.log(`✅ Updated ${starterDecks.count} starter decks to 150g\n`);

    // Update remaining Sealed Products (100 grams default)
    console.log("📦 Updating remaining Sealed Products...");
    const remainingSealed = await prisma.product.updateMany({
      where: {
        productType: "SEALED_PRODUCT",
        weight: 100,
      },
      data: { weight: 100 },
    });
    console.log(`✅ ${remainingSealed.count} sealed products kept at 100g\n`);

    // Update Accessories (50 grams typical)
    console.log("🎨 Updating Accessories...");
    const accessories = await prisma.product.updateMany({
      where: {
        productType: "ACCESSORY",
        weight: 100,
      },
      data: { weight: 50 },
    });
    console.log(`✅ Updated ${accessories.count} accessories to 50g\n`);

    // Show summary
    console.log("=" .repeat(50));
    console.log("📊 WEIGHT UPDATE SUMMARY");
    console.log("=" .repeat(50));

    const weightStats = await prisma.product.groupBy({
      by: ["productType"],
      _avg: { weight: true },
      _min: { weight: true },
      _max: { weight: true },
      _count: true,
    });

    weightStats.forEach((stat) => {
      console.log(`\n${stat.productType}:`);
      console.log(`  - Count: ${stat._count}`);
      console.log(`  - Avg Weight: ${stat._avg.weight}g`);
      console.log(`  - Min Weight: ${stat._min.weight}g`);
      console.log(`  - Max Weight: ${stat._max.weight}g`);
    });

    console.log("\n✅ Product weights updated successfully!");
  } catch (error) {
    console.error("\n❌ Error updating weights:", error);
    throw error;
  }
}

updateProductWeights()
  .catch((e) => {
    console.error("❌ Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });