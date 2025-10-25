import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const API_KEY = process.env.BUNGIE_API_KEY;
const INVENTORY_PATH = path.resolve("data/xur_inventory.json");
const OUTPUT_PATH = path.resolve("data/xur_inventory_enriched.json");

async function fetchDefinition(itemHash) {
  const url = `https://www.bungie.net/Platform/Destiny2/Manifest/DestinyInventoryItemDefinition/${itemHash}/`;
  const res = await fetch(url, {
    headers: { "X-API-Key": API_KEY },
  });

  if (!res.ok) {
    console.warn(`⚠️ Failed to fetch item ${itemHash}: ${res.status}`);
    return null;
  }

  const data = await res.json();
  const def = data.Response || {};
  return {
    itemHash,
    name: def.displayProperties?.name || `Item ${itemHash}`,
    icon: def.displayProperties?.icon
      ? `https://www.bungie.net${def.displayProperties.icon}`
      : null,
    type: def.itemTypeDisplayName || "Unknown Type",
    tier: def.inventory?.tierTypeName || "Unknown Tier",
  };
}

async function enrichInventory() {
  if (!fs.existsSync(INVENTORY_PATH)) {
    console.error("❌ Missing xur_inventory.json file.");
    process.exit(1);
  }

  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, "utf8"));

  // Dynamically extract all hashes regardless of structure
  const itemHashes = new Set();

  // Case 1: saleItems array
  if (Array.isArray(inventory.saleItems)) {
    inventory.saleItems.forEach(item => {
      if (item.itemHash) itemHashes.add(item.itemHash);
    });
  }

  // Case 2: nested categories
  if (inventory.categories && typeof inventory.categories === "object") {
    Object.values(inventory.categories).forEach(category => {
      if (category.itemHash) itemHashes.add(category.itemHash);
    });
  }

  // Case 3: vendorGroups or vendor data
  if (inventory.vendors) {
    Object.values(inventory.vendors).forEach(vendor => {
      if (vendor.saleItems) {
        Object.values(vendor.saleItems).forEach(item => {
          if (item.itemHash) itemHashes.add(item.itemHash);
        });
      }
    });
  }

  const hashes = [...itemHashes];
  console.log(`Found ${hashes.length} unique item hashes to enrich.`);

  const results = [];
  for (const hash of hashes) {
    const enriched = await fetchDefinition(hash);
    if (enriched) results.push(enriched);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), "utf8");
  console.log(`✅ Enriched inventory saved to ${OUTPUT_PATH}`);
}

enrichInventory().catch(err => {
  console.error("❌ Error enriching Xûr inventory:", err);
  process.exit(1);
});
