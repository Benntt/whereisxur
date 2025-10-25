import fetch from "node-fetch";
import fs from "fs";

const API_KEY = process.env.BUNGIE_API_KEY;
const CLIENT_ID = process.env.BUNGIE_CLIENT_ID;
const CLIENT_SECRET = process.env.BUNGIE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.BUNGIE_REFRESH_TOKEN;

const XUR_VENDOR_HASH = 2190858386;
const DATA_FILE = "./data/xur_inventory.json";

async function bungieFetch(url, accessToken) {
  const res = await fetch(`https://www.bungie.net/Platform${url}`, {
    headers: {
      "X-API-Key": API_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${url}\n${JSON.stringify(data)}`);
  }

  return data;
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

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json();
  if (!data.access_token) throw new Error("No access_token returned");
  return data.access_token;
}

async function getMembershipData(accessToken) {
  const res = await bungieFetch("/User/GetMembershipsForCurrentUser/", accessToken);
  const memberships = res.Response?.destinyMemberships;
  if (!memberships || memberships.length === 0) {
    throw new Error("No Destiny memberships found for this Bungie account");
  }

  // Prioritize Steam/PC (type 3), otherwise use first available
  const preferred = memberships.find((m) => m.membershipType === 3) || memberships[0];
  return {
    membershipId: preferred.membershipId,
    membershipType: preferred.membershipType,
  };
}

async function getCharacterId(membershipType, membershipId, accessToken) {
  const res = await bungieFetch(
    `/Destiny2/${membershipType}/Profile/${membershipId}/?components=200`,
    accessToken
  );

  const chars = res.Response?.characters?.data;
  if (!chars || Object.keys(chars).length === 0) {
    throw new Error("No characters found for this profile");
  }

  return Object.keys(chars)[0];
}

async function fetchXurInventory(membershipType, membershipId, characterId, accessToken) {
  const res = await bungieFetch(
    `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/Vendors/${XUR_VENDOR_HASH}/?components=402,400,302`,
    accessToken
  );

  return res.Response;
}

async function main() {
  console.log("Fetching Xur inventory…");

  try {
    const accessToken = await refreshAccessToken();
    const { membershipId, membershipType } = await getMembershipData(accessToken);
    const characterId = await getCharacterId(membershipType, membershipId, accessToken);

    console.log(`Using membership ${membershipId} (${membershipType}) character ${characterId}`);

    const vendor = await fetchXurInventory(membershipType, membershipId, characterId, accessToken);

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
