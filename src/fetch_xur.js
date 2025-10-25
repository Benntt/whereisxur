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

async function main() {
  console.log("Fetching top-level vendors...");
  const vendors = await bungieGet("/Vendors/?components=402,400,302");

  if (!vendors.sales?.data[XUR_VENDOR]) throw new Error("Xûr not found");
  const xur = vendors.sales.data[XUR_VENDOR];
  const topItems = Object.values(xur.saleItems);

  console.log(`Found ${topItems.length} top-level Xûr items.`);
  console.log("Checking for nested vendor or linked sale containers...\n");

  const foundVendors = new Set();
  for (const sale of topItems) {
    const def = await bungieGet(`/Manifest/DestinyInventoryItemDefinition/${sale.itemHash}/`);
    const name = def.displayProperties?.name || "Unknown";

    // Look inside every vendor-like property
    const possibleVendorRefs = [
      def.preview?.derivedItemCategories?.map(c => c?.vendorHash),
      def.sockets?.socketEntries?.map(s => s?.singleInitialItemHash),
      def.inventory?.stackUniqueLabel,
      def.itemCategoryHashes,
      def.displaySource,
    ];

    console.log(`Item: ${name}`);
    console.log(JSON.stringify(possibleVendorRefs, null, 2));
    console.log("-----------------------------");

    await new Promise(r => setTimeout(r, 300));
  }

  console.log("\nFinished checking Xûr inventory.");
  console.log("→ Look for anything that looks like a vendor hash (a number around 9 digits long).");
  console.log("→ We’ll use those real ones for the next version.\n");

  // write empty JSON for safety
  const output = { vendorHash: XUR_VENDOR, generatedAt: new Date().toISOString(), categories: {} };
  await fs.promises.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.promises.writeFile(OUT_PATH, JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
