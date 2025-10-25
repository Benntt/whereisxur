import fetch from "node-fetch";
import fs from "fs";

const API_KEY = process.env.BUNGIE_API_KEY;
const REFRESH_TOKEN = process.env.BUNGIE_REFRESH_TOKEN;
const CLIENT_ID = process.env.BUNGIE_CLIENT_ID;
const CLIENT_SECRET = process.env.BUNGIE_CLIENT_SECRET;

const MEMBERSHIP_TYPE = 3; // 1=Xbox, 2=PSN, 3=Steam, 4=Blizzard, 5=Stadia, etc.
const MEMBERSHIP_ID = "21329669"; // your Bungie.net membership ID (not character)
const XUR_VENDOR_HASH = 2190858386;
const DATA_FILE = "./data/xur_inventory.json";

async function bungieGet(endpoint, accessToken) {
  const res = await fetch(`https://www.bungie.net/Platform${endpoint}`, {
    headers: {
      "X-API-Key": API_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${endpoint}\n${text}`);
  }
  return res.json();
}

async function refreshAccessToken() {
  const res = await fetch("https://www.bungie.net/Platform/App/OAuth/Token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error("Token refresh failed");
  const data = await res.json();
  return data.access_token;
}

async function getCharacterId(accessToken) {
  const profile = await bungieGet(
    `/Destiny2/${MEMBERSHIP_TYPE}/Profile/${MEMBERSHIP_ID}/?components=200`,
    accessToken
  );
  const chars = profile.Response.characters?.data;
  if (!chars || Object.keys(chars).length === 0) {
    throw new Error("No characters found for this account.");
  }
  return Object.keys(chars)[0]; // just use the first character
}

async function fetchVendor(accessToken, characterId) {
  const vendor = await bungieGet(
    `/Destiny2/${MEMBERSHIP_TYPE}/Profile/${MEMBERSHIP_ID}/Character/${characterId}/Vendors/${XUR_VENDOR_HASH}/?components=402,400,302`,
    accessToken
  );
  return vendor.Response;
}

async function main() {
  console.log("Fetching Xur and nested vendors…");

  try {
    const accessToken = await refreshAccessToken();
    const characterId = await getCharacterId(accessToken);

    console.log(`Using character ${characterId}`);
    const vendor = await fetchVendor(accessToken, characterId);

    const output = {
      vendorHash: XUR_VENDOR_HASH,
      generatedAt: new Date().toISOString(),
      categories: vendor?.sales?.data || {},
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2));
    console.log(`✓ Wrote ${DATA_FILE}`);
  } catch (err) {
    console.error("✗ Xur fetch failed:", err.message);
    const fallback = {
      vendorHash: XUR_VENDOR_HASH,
      generatedAt: new Date().toISOString(),
      error: err.message,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(fallback, null, 2));
  }
}

main();
