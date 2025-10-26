import fs from "fs";
import fetch from "node-fetch";

const API_BASE = "https://www.bungie.net/Platform/Destiny2/Manifest/DestinyInventoryItemDefinition";
const API_KEY = process.env.BUNGIE_API_KEY;
const INPUT_PATH = "./data/xur_inventory.json";
const OUTPUT_PATH = "./data/xur_inventory_enriched.json";

if (!API_KEY) {
  console.error("❌ Missing BUNGIE_API_KEY in environment variables.");
  process.exit(1);
}

async function getDefinitionByName(name) {
  // Bungie’s Manifest API doesn’t support searching by name directly,
  // so this is just a placeholder in case you expand to include hashes later.
  // Currently, your xur_inventory.json uses names only.
  return { name, displayProperties: { name, description: "", icon: "" } };
}

async function getDefinitionByHash(hash) {
  try {
    const res = await fetch(`${API_BASE}/${hash}/`, {
      headers: { "X-API-Key": API_KEY },
    });
    const json = await res.json();
    if (json.ErrorCode !== 1) throw new Error(json.Message);
    return json.Response;
  } catch (err) {
    console.warn(`⚠️ Failed to fetch item ${hash}: ${err.message}`);
    return null;
  }
}

async function enrichInventory() {
  console.log("🔍 Reading Xûr inventory…");
  const raw = fs.readFileSync(INPUT_PATH, "utf8");
  const data = JSON.parse(raw);

  const enriched = [];
  const uniqueNames = new Set();

  // Handle nested structure
  for (const category of Object.keys(data)) {
    const section = data[category];
    if (Array.isArray(section)) {
      for (const item of section) {
        if (typeof item === "string" && !uniqueNames.has(item)) {
          uniqueNames.add(item);
          enriched.push(await getDefinitionByName(item));
        }
      }
    } else if (typeof section === "object") {
      for (const subclass of Object.keys(section)) {
        for (const item of section[subclass]) {
          if (typeof item === "string" && !uniqueNames.has(item)) {
            uniqueNames.add(item);
            enriched.push(await getDefinitionByName(item));
          }
        }
      }
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(enriched, null, 2));
  console.log(`✅ Enriched inventory saved to ${OUTPUT_PATH}`);
  console.log(`Found ${enriched.length} unique items.`);
}

enrichInventory().catch((err) => {
  console.error("❌ Failed to enrich inventory:", err);
  process.exit(1);
});
