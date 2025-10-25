// src/fetch_xur.js
import fs from "fs";
import fetch from "node-fetch";

const API_KEY = process.env.BUNGIE_API_KEY;
const CLIENT_ID = process.env.BUNGIE_CLIENT_ID;
const CLIENT_SECRET = process.env.BUNGIE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.BUNGIE_REFRESH_TOKEN;

const HEADERS = { "X-API-Key": API_KEY, "Content-Type": "application/json" };
const BASE = "https://www.bungie.net/Platform";

async function refreshAccessToken() {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: REFRESH_TOKEN,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const res = await fetch("https://www.bungie.net/Platform/App/OAuth/Token/", {
    method: "POST",
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Failed to refresh token: ${res.status}`);
  return data.access_token;
}

async function bungieGet(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...HEADERS, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
  const json = await res.json();
  return json.Response;
}

async function fetchVendorRecursive(token, membershipType, membershipId, characterId, vendorHash, visited = new Set()) {
  if (visited.has(vendorHash)) return {};
  visited.add(vendorHash);

  const data = await bungieGet(`/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/Vendors/${vendorHash}/?components=400,401,402`, token);
  const saleItems = data.sales?.data || {};
  const inventory = {};

  for (const key of Object.keys(saleItems)) {
    const item = saleItems[key];
    inventory[key] = item;
  }

  const nested = data.itemComponents?.sales?.data || {};
  for (const key of Object.keys(nested)) {
    const vendorData = nested[key];
    if (vendorData.vendorHash && !visited.has(vendorData.vendorHash)) {
      const nestedInv = await fetchVendorRecursive(token, membershipType, membershipId, characterId, vendorData.vendorHash, visited);
      Object.assign(inventory, nestedInv);
    }
  }

  return inventory;
}

async function main() {
  const token = await refreshAccessToken();

  const membershipType = 3;
  const membershipId = "4611686018467457059";
  const characterId = "2305843009299618089";

  console.log("Fetching Xûr and nested vendors…");
  const xurHash = 2190858386;
  const inventory = await fetchVendorRecursive(token, membershipType, membershipId, characterId, xurHash);

  const output = {
    vendorHash: xurHash,
    generatedAt: new Date().toISOString(),
    categories: inventory,
  };

  fs.mkdirSync("./data", { recursive: true });
  fs.writeFileSync("./data/xur_inventory.json", JSON.stringify(output, null, 2));
  console.log("✓ Wrote ./data/xur_inventory.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
