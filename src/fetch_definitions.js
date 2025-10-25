import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const API_KEY = process.env.BUNGIE_API_KEY;
const DATA_FILE = "./data/xur_inventory.json";
const OUTPUT_FILE = "./data/xur_inventory_enriched.json";
const MANIFEST_FILE = "./data/manifest.json";

async function bungieFetch(url) {
  const res = await fetch(`https://www.bungie.net/Platform${url}`, {
    headers: { "X-API-Key": API_KEY },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function downloadManifest() {
  console.log("Fetching manifest metadata...");
  const res = await bungieFetch("/Destiny2/Manifest/");
  const en = res.Response.jsonWorldComponentContentPaths.en.DestinyInventoryItemDefinition;
  const manifestUrl = `https://www.bungie.net${en}`;
  console.log(`Downloading manifest from ${manifestUrl}`);

  const manifestRes = await fetch(manifestUrl);
  const manifestData = await manifestRes.json();

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifestData, null, 2));
  console.log(`Saved manifest to ${MANIFEST_FILE}`);
  return manifestData;
}

async function enrichXurInventory() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`Missing ${DATA_FILE}. Run fetch_xur.js first.`);
  }

  const xurData = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  const manifest =
    fs.existsSync(MANIFEST_FILE)
      ? JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf-8"))
      : await downloadManifest();

  const categories = {};

  for (const [key, item] of Object.entries(xurData.categories)) {
    const def = manifest[item.itemHash];
    categories[key] = {
      ...item,
      name: def?.displayProperties?.name || "Unknown Item",
      type: def?.itemTypeDisplayName || "Unknown Type",
      icon: def?.displayProperties?.icon
        ? `https://www.bungie.net${def.displayProperties.icon}`
        : null,
    };
  }

  const enriched = {
    ...xurData,
    categories,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));
  console.log(`✓ Wrote ${OUTPUT_FILE}`);
}

(async () => {
  try {
    await enrichXurInventory();
  } catch (err) {
    console.error("✗ Definition enrichment failed:", err.message);
  }
})();
