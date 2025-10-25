import fs from "fs";
import fetch from "node-fetch";

const API_KEY = process.env.BUNGIE_API_KEY;
const REFRESH_TOKEN = process.env.BUNGIE_REFRESH_TOKEN;
const CLIENT_ID = process.env.BUNGIE_CLIENT_ID;
const CLIENT_SECRET = process.env.BUNGIE_CLIENT_SECRET;

const TOKEN_URL = "https://www.bungie.net/platform/app/oauth/token/";
const BASE_URL = "https://www.bungie.net/Platform/Destiny2";
const XUR_HASH = 2190858386;

async function refreshAccessToken() {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", REFRESH_TOKEN);
  params.append("client_id", CLIENT_ID);
  params.append("client_secret", CLIENT_SECRET);

  const res = await fetch(TOKEN_URL, { method: "POST", body: params });
  if (!res.ok) throw new Error(`Failed to refresh token: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function bungieGet(path, accessToken) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "X-API-Key": API_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
  const data = await res.json();
  return data.Response;
}

async function fetchVendorRecursive(vendorHash, accessToken, visited = new Set()) {
  if (visited.has(vendorHash)) return {};
  visited.add(vendorHash);

  console.log(`Fetching vendor ${vendorHash}...`);
  const data = await bungieGet(`/Vendors/${vendorHash}/?components=402,400,302`, accessToken);

  const result = { vendorHash, displayCategories: [], sales: {} };
  if (data.categories?.data?.categories) result.displayCategories = data.categories.data.categories;
  if (data.sales?.data) result.sales = data.sales.data;

  // find nested vendor links
  const linkedVendors = [];
  for (const sale of Object.values(result.sales)) {
    const sub = sale.vendorHash || sale.overrideStyleItemHash;
    if (sub && sub !== vendorHash) linkedVendors.push(sub);
  }

  // fetch sub-vendors
  for (const sub of linkedVendors) {
    try {
      const subData = await fetchVendorRecursive(sub, accessToken, visited);
      if (Object.keys(subData).length) result[`sub_${sub}`] = subData;
    } catch {
      console.log(`Skipping ${sub}`);
    }
  }

  return result;
}

async function main() {
  console.log("Fetching Xur and nested vendors…");
  const accessToken = await refreshAccessToken();

  const xurData = await fetchVendorRecursive(XUR_HASH, accessToken);

  const output = {
    vendorHash: XUR_HASH,
    generatedAt: new Date().toISOString(),
    data: xurData,
  };

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync("data/xur_inventory.json", JSON.stringify(output, null, 2));
  console.log("✓ Wrote data/xur_inventory.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
