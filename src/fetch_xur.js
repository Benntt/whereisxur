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
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}\n${JSON.stringify(data)}`);
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

async function getDestinyMembershipId(accessToken) {
  const data = await bungieFetch("/User/GetMembershipsForCurrentUser/", accessToken);
  const memberships = data.Response.destinyMemberships;
  if (!memberships || memberships.length === 0) {
    throw new Error("No Destiny memberships found for this Bungie account");
  }
  const membership = memberships.find((m) => m.membershipType === 3) || memberships[0];
  return {
    membershipId: membership.membershipId,
    membershipType: membership.membershipType,
  };
}

async function getFirstCharacterId(membershipType, membershipId, accessToken) {
  const profile = await bungieFetch(
    `/Destiny2/${membershipType}/Profile/${membershipId}/?components=200`,
    accessToken
  );
  const chars = profile.Response.characters?.data;
  if (!chars || Object.keys(chars).length === 0) {
    throw new Error("No characters found for this account");
  }
  return Object.keys(chars)[0];
}

async function fetchXurInventory(membershipType, membershipId, characterId, accessToken) {
  const vendor = await bungieFetch(
    `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/Vendors/${XUR_VENDOR_HASH}/?components=402,400,302`,
    accessToken
  );
  return vendor.Response;
}

async function main() {
  console.log("Fetching Xur and nested vendors…");

  try {
    const accessToken = await refreshAccessToken();
    const { membershipId, membershipType } = await getDestinyMembershipId(accessToken);
    const characterId = await getFirstCharacterId(membershipType, membershipId, accessToken);

    console.log(`Using membership ${membershipId} (${membershipType}), character ${characterId}`);

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
