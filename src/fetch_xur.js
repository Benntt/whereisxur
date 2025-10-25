import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const API_KEY = process.env.BUNGIE_API_KEY;
const BASE_URL = "https://www.bungie.net/Platform/Destiny2";
const VENDOR_HASH = 2190858386; // Xûr
const OUT_PATH = path.join("data", "xur_inventory.json");

// Helper: Bungie API GET with retries
async function bungieGet(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, { headers: { "X-API-Key": API_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const data = await res.json();
  if (!data.Response) throw new Error(`Invalid response from ${url}`);
  return data.Response;
}

// Main function
async function main() {
  console.log("Fetching public vendor sales…");
  const vendors = await bungieGet("/Vendors/?components=402,302,400");
  const vendor = vendors.sales.data[VENDOR_HASH];
  if (!vendor) throw new Error("No Xûr sales found.");

  const saleItems = Object.values(vendor.saleItems);
  console.log(`Found ${saleItems.length} sale items. Enriching with Manifest…`);

  const enriched = [];
  for (const sale of saleItems) {
    const itemHash = sale.itemHash;
    const item = await bungieGet(`/Manifest/DestinyInventoryItemDefinition/${itemHash}/`);
    const def = item;

    enriched.push({
      itemHash,
      name: def.displayProperties?.name || "Unknown",
      icon: `https://www.bungie.net${def.displayProperties?.icon || ""}`,
      tier: def.inventory?.tierTypeName || "",
      type: def.itemTypeDisplayName || def.itemTypeAndTierDisplayName || "",
      category: computeCategory(def),
    });

    await new Promise((r) => setTimeout(r, 200)); // throttle
  }

  const categorized = {};
  const sortOrder = [
    "Multivarious Strange Offers",
    "Exotic Gear",
    "Legendary Weapons",
    "Legendary Armor",
    "Loyalty Program of the Nine",
    "Strange Material Offers",
    "Strange Repeatable Offers",
  ];

  for (const cat of sortOrder) categorized[cat] = [];

  for (const item of enriched) {
    const cat = item.category;
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(item);
  }

  const output = {
    vendorHash: VENDOR_HASH,
    generatedAt: new Date().toISOString(),
    source: "Destiny2.GetPublicVendors + Manifest",
    categories: categorized,
  };

  await fs.promises.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.promises.writeFile(OUT_PATH, JSON.stringify(output, null, 2));

  console.log(`Wrote ${OUT_PATH}`);
}

// Category computation aligned with WhereIsXur.com
function computeCategory(def) {
  const tier = def?.inventory?.tierTypeName?.toLowerCase() || "";
  const type = def?.itemTypeDisplayName?.toLowerCase() || def?.itemTypeAndTierDisplayName?.toLowerCase() || "";
  const name = def?.displayProperties?.name?.toLowerCase() || "";

  // Multivarious Strange Offers: Exotic class items & catalysts
  if (/(relativism|solipsism|stoicism)/i.test(name)) return "Multivarious Strange Offers";
  if (/catalyst/i.test(type) || /catalyst/i.test(name)) return "Multivarious Strange Offers";

  // Exotic Gear
  if (/exotic/i.test(tier) && (/weapon|armor|engram/i.test(type))) return "Exotic Gear";

  // Legendary Weapons & Armor
  if (/legendary/i.test(tier) && /weapon/i.test(type)) return "Legendary Weapons";
  if (/legendary/i.test(tier) && /armor/i.test(type)) return "Legendary Armor";

  // Loyalty Program of the Nine
  if (/loyalty/i.test(name) || /reset rank/i.test(name)) return "Loyalty Program of the Nine";

  // Strange Material Offers
  if (/material|currency|shard|core|prism|consumable|upgrade/i.test(type) || /ascendant/i.test(name))
    return "Strange Material Offers";

  // Strange Repeatable Offers
  if (/repeatable|bounty/i.test(name)) return "Strange Repeatable Offers";

  // Default
  return "Multivarious Strange Offers";
}

// Run main
main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
