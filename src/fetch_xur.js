import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const API_KEY = process.env.BUNGIE_API_KEY;
const BASE_URL = "https://www.bungie.net/Platform/Destiny2";
const XUR_VENDOR = 2190858386;
const STRANGE_GEAR_OFFERS = 3910216754;
const MORE_STRANGE_OFFERS = 4248210736;
const OUT_PATH = path.join("data", "xur_inventory.json");

async function bungieGet(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, { headers: { "X-API-Key": API_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const data = await res.json();
  if (!data.Response) throw new Error(`Invalid response from ${url}`);
  return data.Response;
}

async function fetchVendorItems(vendorHash) {
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
  return items;
}

async function main() {
  console.log("Fetching Xur + sub vendors…");

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

  const strangeGear = await fetchVendorItems(STRANGE_GEAR_OFFERS);
  const moreStrange = await fetchVendorItems(MORE_STRANGE_OFFERS);

  const allItems = [...topItems, ...strangeGear, ...moreStrange];

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
    source: "Destiny2.GetPublicVendors + Manifest + Nested Vendors",
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
