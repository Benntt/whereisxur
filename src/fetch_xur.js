import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const API_KEY = process.env.BUNGIE_API_KEY;
const BASE_URL = "https://www.bungie.net/Platform/Destiny2";
const XUR_VENDOR = 2190858386;
const OUT_PATH = path.join("data", "xur_inventory.json");

async function bungieGet(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, { headers: { "X-API-Key": API_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const data = await res.json();
  if (!data.Response) throw new Error(`Invalid response from ${url}`);
  return data.Response;
}

async function fetchVendorSales(vendorHash) {
  const res = await bungieGet(`/Vendors/${vendorHash}/?components=402,400,302`);
  if (!res.sales || !res.sales.data) return [];
  return Object.values(res.sales.data);
}

async function enrichItem(itemHash) {
  const def = await bungieGet(`/Manifest/DestinyInventoryItemDefinition/${itemHash}/`);
  return {
    itemHash,
    name: def.displayProperties?.name || "Unknown",
    icon: `https://www.bungie.net${def.displayProperties?.icon || ""}`,
    tier: def.inventory?.tierTypeName || "",
    type: def.itemTypeDisplayName || def.itemTypeAndTierDisplayName || "",
    category: computeCategory(def),
  };
}

async function main() {
  console.log("Fetching top-level Xur vendor…");
  const topVendor = await bungieGet(`/Vendors/?components=402,400,302`);
  const xur = topVendor.sales.data[XUR_VENDOR];
  if (!xur) throw new Error("Xur not found in public vendors.");

  let allItems = [];
  const saleItems = Object.values(xur.saleItems);

  console.log(`Found ${saleItems.length} top-level sales. Checking for sub-vendors…`);

  for (const sale of saleItems) {
    const def = await bungieGet(`/Manifest/DestinyInventoryItemDefinition/${sale.itemHash}/`);
    const vendorHash = def.sockets?.socketEntries?.find(s => s.singleInitialItemHash)?.singleInitialItemHash;

    if (vendorHash) {
      console.log(`→ Found nested vendor via item ${def.displayProperties?.name} (${vendorHash})`);
      try {
        const subSales = await fetchVendorSales(vendorHash);
        for (const sub of subSales) {
          const enriched = await enrichItem(sub.itemHash);
          allItems.push(enriched);
          await new Promise(r => setTimeout(r, 200));
        }
      } catch (err) {
        console.warn(`Failed nested vendor ${vendorHash}:`, err.message);
      }
    } else {
      const enriched = await enrichItem(sale.itemHash);
      allItems.push(enriched);
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const sortOrder = [
    "Multivarious Strange Offers",
    "Exotic Gear",
    "Legendary Weapons",
    "Legendary Armor",
    "Loyalty Program of the Nine",
    "Strange Material Offers",
    "Strange Repeatable Offers",
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
    source: "Destiny2.GetPublicVendors + Manifest",
    categories: categorized,
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

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
