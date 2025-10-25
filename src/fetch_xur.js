// Fetches Xûr's public vendor sales; enriches with Manifest; outputs JSON.
// No OAuth; uses GetPublicVendors so it can run headless in Actions.

import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";

const API_KEY = process.env.BUNGIE_API_KEY; // add in GitHub Actions secret
if (!API_KEY) {
  console.error("Missing BUNGIE_API_KEY env var.");
  process.exit(1);
}

const HEADERS = { "X-API-Key": API_KEY };
const BUNGIE = "https://www.bungie.net/Platform";
const CDN = "https://www.bungie.net";
const XUR_VENDOR_HASH = 2190858386;
const OUT_PATH = path.join("public", "data", "xur_inventory.json");

// Minimal delay to respect rate limits; keeps things polite.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch public vendors; component 402 = VendorSales
async function getPublicVendors() {
  const url = `${BUNGIE}/Destiny2/Vendors/?components=402`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GetPublicVendors failed ${res.status}; ${body}`);
  }
  const json = await res.json();
  return json?.Response;
}

// Fetch a single item definition from the Manifest
async function getItemDef(itemHash) {
  const url = `${BUNGIE}/Destiny2/Manifest/DestinyInventoryItemDefinition/${itemHash}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ItemDef ${itemHash} failed ${res.status}; ${body}`);
  }
  const json = await res.json();
  return json?.Response;
}

// Simple categorizer; tune as you like later
function computeCategory(def) {
  const tier = def?.inventory?.tierTypeName || "";
  const type = def?.itemTypeDisplayName || def?.itemTypeAndTierDisplayName || "";
  const name = def?.displayProperties?.name || "";

  // Catalysts usually have "Catalyst" in type or name
  if (/catalyst/i.test(type) || /catalyst/i.test(name)) return "Catalysts";

  // Class items; exotics often map to class item display names
  if (/class item/i.test(type)) return "Exotic Class Items";

  // Armor vs weapon buckets
  if (/weapon/i.test(type)) {
    if (/exotic/i.test(tier)) return "Exotic Weapons";
    if (/legendary/i.test(tier)) return "Legendary Weapons";
    return "Other Weapons";
  }
  if (/armor/i.test(type)) {
    if (/exotic/i.test(tier)) return "Exotic Armor";
    if (/legendary/i.test(tier)) return "Legendary Armor";
    return "Other Armor";
  }

  // Coins, shards, etc.
  if (/material|currency|consumable/i.test(type)) return "Strange Material Offers";

  return tier || "Other";
}

function toSafeFilename(s) {
  return s
    .replace(/[\/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("Fetching public vendor sales…");
  const resp = await getPublicVendors();

  // Public vendors payload layout:
  // resp.sales.data is keyed by vendorHash; each contains saleItems keyed by saleIndex.
  const vendorSales = resp?.sales?.data?.[XUR_VENDOR_HASH]?.saleItems;
  if (!vendorSales) {
    throw new Error("Xûr not present in public vendors or structure changed.");
  }

  const saleItems = Object.values(vendorSales); // each has itemHash, costs, etc.

  console.log(`Found ${saleItems.length} sale items. Enriching with Manifest…`);
  const items = [];
  for (const sale of saleItems) {
    const { itemHash, costs = [], quantity = 1 } = sale;
    try {
      const def = await getItemDef(itemHash);
      await sleep(120); // gentle pacing

      const name = def?.displayProperties?.name || `Hash ${itemHash}`;
      const icon = def?.displayProperties?.icon ? CDN + def.displayProperties.icon : null;
      const tier = def?.inventory?.tierTypeName || null;
      const type = def?.itemTypeDisplayName || def?.itemTypeAndTierDisplayName || null;

      items.push({
        itemHash,
        name,
        icon,
        tier,
        type,
        quantity,
        category: computeCategory(def),
        collectibleHash: def?.collectibleHash ?? null,
        bucketTypeHash: def?.inventory?.bucketTypeHash ?? null,
        classType: def?.classType ?? null
      });
    } catch (e) {
      console.error(`Item ${itemHash} failed: ${e.message}`);
    }
  }

  // Group by category for your frontend
  const grouped = items.reduce((acc, it) => {
    const key = it.category || "Other";
    acc[key] = acc[key] || [];
    acc[key].push(it);
    return acc;
  }, {});

  // Sorted keys; put Exotics first; adjust as needed
  const sortOrder = [
    "Exotic Weapons",
    "Exotic Armor",
    "Exotic Class Items",
    "Catalysts",
    "Legendary Weapons",
    "Legendary Armor",
    "Strange Material Offers",
    "Other Weapons",
    "Other Armor",
    "Other"
  ];
  const ordered = {};
  for (const k of sortOrder) {
    if (grouped[k]?.length) ordered[k] = grouped[k];
  }
  for (const k of Object.keys(grouped)) {
    if (!ordered[k]) ordered[k] = grouped[k];
  }

  // Ensure output directory exists
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });

  // Include metadata for cache busting and display
  const payload = {
    vendorHash: XUR_VENDOR_HASH,
    generatedAt: new Date().toISOString(),
    source: "Destiny2.GetPublicVendors + Manifest",
    categories: ordered
  };

  await fs.writeFile(OUT_PATH, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
