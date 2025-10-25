import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const API_KEY = process.env.BUNGIE_API_KEY;
const BASE_URL = "https://www.bungie.net/Platform/Destiny2";
const XUR_VENDOR = 2190858386;
const OUT_PATH = path.join("data", "xur_inventory.json");

// from last debug output
const POSSIBLE_NESTED = [
  4248210736, // More Strange Offers
  3910216754,
  2978337238,
  1980618587,
  1803434835,
  2024015888,
  702981643,
  3666112472,
  3820147479,
  1828251441,
  1420473289,
  569260333,
  4234468055,
  1871764335,
  3109687656
];

async function bungieGet(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, { headers: { "X-API-Key": API_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const data = await res.json();
  if (!data.Response) throw new Error(`Invalid response from ${url}`);
  return data.Response;
}

async function fetchVendorItems(vendorHash) {
  try {
    const vendor = await bungieGet(`/Vendors/${vendorHash}/?components=402,400,302`);
    const sales = vendor.sales?.data ? Object.values(vendor.sales.data) : [];
    const items = [];
    for (const s of sales) {
      const def = await bungieGet(`/Manifest/DestinyInventoryItemDefinition/${s.itemHash}/`);
      items.push({
        itemHash: s.itemHash,
        name: def.displayProperties?.name || "Unknown",
        icon: `https://www.bungie.net${def.displayProperties?.icon || ""}`,
        tier: def.inventory?.tierTypeName || "",
        type: def.itemTypeDisplayName || def.itemTypeAndTierDisplayName || "",
        category: computeCategory(def)
      });
      await new Promise(r => setTimeout(r, 200));
    }
    console.log(`✓ Vendor ${vendorHash} returned ${items.length} items`);
    return items;
  } catch (err) {
    console.warn(`✗ Skipping vendor ${vendorHash}: ${err.message}`);
    return [];
  }
}

async function main() {
  console.log("Fetching Xur + nested vendors…");

  const topVendor = await bungieGet(`/Vendors/?components=402,400,302`);
  const xur = topVendor.sales.data[XUR_VENDOR];
  if (!xur) throw new Error("Xur not found in public vendors.");
  const topSales = Object.values(xur.saleItems);

  const topItems = [];
  for (const sale of topSales) {
    const def = await bungieGet(`/Manifest/DestinyInventoryItemDefinition/${sale.itemHash}/`);
    topItems.push({
      itemHash: sale.itemHash,
      name: def.displayProperties?.name || "Unknown",
      icon: `https://www.bungie.net${def.displayProperties?.icon || ""}`,
      tier: def.inventory?.tierTypeName || "",
      type: def.itemTypeDisplayName || def.itemTypeAndTierDisplayName || "",
      category: computeCategory(def)
    });
    await new Promise(r => setTimeout(r, 200));
  }

  const nestedItems = [];
  for (const hash of POSSIBLE_NESTED) {
    const items = await fetchVendorItems(hash);
    nestedItems.push(...items);
  }

  const allItems = [...topItems, ...nestedItems];

  const sortOrder = [
    "Multivarious Strange Offers",
    "Exotic Gear",
    "Legendary Weapons",
    "Legendary Armor",
    "Loyalty Program of the Nine",
    "Strange Material Offers",
    "Strange Repeatable Offers"
  ];

  const categorized = {};
  for (const cat of sortOrder) categorized[cat] = [];

  for (const item of allItems) {
    const cat = item.category;
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(item);
  }

  const output = {
    vendorHash: XUR_VENDOR,
    generatedAt: new Date().toISOString(),
    validNestedVendors: POSSIBLE_NESTED,
    categories: categorized
  };

  await fs.promises.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.promises.writeFile(OUT_PATH, JSON.stringify(output, null, 2));

  console.log(`Wrote ${OUT_PATH}`);
}

function computeCategory(def) {
  const tier = def?.inventory?.tierTypeName?.toLowerCase() || "";
  const type = def?.itemTypeDisplayName?.toLowerCase() || def?.itemTypeAndTierDisplayName?.toLowerCase() || "";
  const name = def?.displayProperties?.name?.toLowerCase() || "";

  if (/(relativism|solipsism|stoicism)/i.test(name)) return "Multivarious Strange Offers";
  if (/catalyst/i.test(type) || /catalyst/i.test(name)) return "Multivarious Strange Offers";
  if (/exotic/i.test(tier) && (/weapon|armor|engram/i.test(type))) return "Exotic Gear";
  if (/legendary/i.test(tier) && /weapon/i.test(type)) return "Legendary Weapons";
  if (/legendary/i.test(tier) && /armor/i.test(type)) return "Legendary Armor";
  if (/loyalty/i.test(name) || /reset rank/i.test(name)) return "Loyalty Program of the Nine";
  if (/material|currency|shard|core|prism|consumable|upgrade/i.test(type) || /ascendant/i.test(name))
    return "Strange Material Offers";
  if (/repeatable|bounty/i.test(name)) return "Strange Repeatable Offers";
  return "Multivarious Strange Offers";
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
