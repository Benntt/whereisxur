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
    type: def.itemTypeDisplayName || "Unknown",
    tier: def.inventory?.tierTypeName || "Unknown",
  };
}

async function enrichInventory() {
  if (!fs.existsSync(INVENTORY_PATH)) {
    console.error("❌ Missing xur_inventory.json file.");
    process.exit(1);
  }

  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, "utf8"));
  const categories = inventory.categories || {};

  const itemHashes = [];
  Object.values(categories).forEach(category => {
    if (category.itemHash) itemHashes.push(category.itemHash);
  });

  console.log(`Found ${itemHashes.length} item hashes.`);

  const results = [];
  for (const hash of itemHashes) {
    const enriched = await fetchDefinition(hash);
    if (enriched) results.push(enriched);
  }

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(results, null, 2),
    "utf8"
  );

  console.log(`✅ Enriched inventory saved to ${OUTPUT_PATH}`);
}

enrichInventory().catch(err => {
  console.error("❌ Error enriching Xûr inventory:", err);
  process.exit(1);
});
