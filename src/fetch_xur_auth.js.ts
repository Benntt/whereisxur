import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const API_KEY = process.env.BUNGIE_API_KEY || ""; // optional when using OAuth; leave blank or set your key
const CLIENT_ID = process.env.BUNGIE_CLIENT_ID;
const CLIENT_SECRET = process.env.BUNGIE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.BUNGIE_REFRESH_TOKEN;

const BASE = "https://www.bungie.net/Platform";
const OUT_PATH = path.join("data", "xur_inventory.json");
const XUR_VENDOR = 2190858386;

// Small helper
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function oauthRefresh() {
  const res = await fetch(`${BASE}/app/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OAuth refresh failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function call(endpoint, accessToken) {
  const url = `${BASE}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`
  };
  if (API_KEY) headers["X-API-Key"] = API_KEY;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${url} -> ${t}`);
  }
  const json = await res.json();
  if (!json.Response) throw new Error(`No Response at ${url}`);
  return json.Response;
}

async function resolveMembership(accessToken) {
  // Authenticated user memberships
  const me = await call("/User/GetMembershipsForCurrentUser/", accessToken);
  const primary = me.primaryMembershipId || (me.destinyMemberships[0]?.membershipId ?? null);
  if (!primary) throw new Error("No memberships found on the account used for OAuth.");
  const m = me.destinyMemberships.find((x) => x.membershipId === primary) || me.destinyMemberships[0];
  return { membershipId: m.membershipId, membershipType: m.membershipType };
}

async function pickCharacter(accessToken, membershipType, membershipId) {
  // Profile -> characterIds
  const prof = await call(
    `/Destiny2/${membershipType}/Profile/${membershipId}/?components=100`,
    accessToken
  );
  const ids = prof.profile?.data?.characterIds || [];
  if (!ids.length) throw new Error("No characters found on this account.");
  return ids[0]; // first character id is fine
}

async function getVendorItems(accessToken, membershipType, membershipId, characterId, vendorHash) {
  // Character-scoped vendor; this exposes all Xur inventory
  const v = await call(
    `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/Vendors/${vendorHash}/?components=400,402,302`,
    accessToken
  );

  const sales = v.sales?.data ? Object.values(v.sales.data) : [];
  const items = [];
  for (const s of sales) {
    const def = await manifestItem(accessToken, s.itemHash);
    items.push(toItem(def));
    await sleep(150);
  }
  return items;
}

async function manifestItem(accessToken, itemHash) {
  // Manifest lookups do not require auth, but Authorization is fine; include API key if you set it.
  const headers = {};
  if (API_KEY) headers["X-API-Key"] = API_KEY;

  const res = await fetch(
    `${BASE}/Destiny2/Manifest/DestinyInventoryItemDefinition/${itemHash}/`,
    { headers }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Manifest ${itemHash} failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  return data.Response;
}

function toItem(def) {
  return {
    itemHash: def.hash,
    name: def.displayProperties?.name || "Unknown",
    icon: def.displayProperties?.icon
      ? `https://www.bungie.net${def.displayProperties.icon}`
      : "",
    tier: def.inventory?.tierTypeName || "",
    type: def.itemTypeDisplayName || def.itemTypeAndTierDisplayName || "",
    category: categorize(def)
  };
}

function categorize(def) {
  const tier = (def.inventory?.tierTypeName || "").toLowerCase();
  const type =
    (def.itemTypeDisplayName || def.itemTypeAndTierDisplayName || "").toLowerCase();
  const name = (def.displayProperties?.name || "").toLowerCase();

  if (/(relativism|solipsism|stoicism|xenology)/i.test(name)) return "Multivarious Strange Offers";
  if (/catalyst/.test(type) || /catalyst/.test(name)) return "Multivarious Strange Offers";
  if (/exotic/.test(tier) && /(weapon|armor|engram)/.test(type)) return "Exotic Gear";
  if (/legendary/.test(tier) && /weapon/.test(type)) return "Legendary Weapons";
  if (/legendary/.test(tier) && /armor/.test(type)) return "Legendary Armor";
  if (/loyalty/.test(name) || /reset rank/.test(name)) return "Loyalty Program of the Nine";
  if (/(material|currency|shard|core|prism|consumable|upgrade)/.test(type) || /ascendant/.test(name))
    return "Strange Material Offers";
  if (/repeatable|bounty/.test(name)) return "Strange Repeatable Offers";
  return "Multivarious Strange Offers";
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error("Missing CLIENT_ID, CLIENT_SECRET, or REFRESH_TOKEN env vars.");
  }

  const accessToken = await oauthRefresh();

  const { membershipId, membershipType } = await resolveMembership(accessToken);
  const characterId = await pickCharacter(accessToken, membershipType, membershipId);

  const items = await getVendorItems(
    accessToken,
    membershipType,
    membershipId,
    characterId,
    XUR_VENDOR
  );

  const sortOrder = [
    "Multivarious Strange Offers",
    "Exotic Gear",
    "Legendary Weapons",
    "Legendary Armor",
    "Loyalty Program of the Nine",
    "Strange Material Offers",
    "Strange Repeatable Offers"
  ];

  const categories = {};
  for (const c of sortOrder) categories[c] = [];
  for (const it of items) {
    if (!categories[it.category]) categories[it.category] = [];
    categories[it.category].push(it);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    from: "Authenticated character vendor",
    vendorHash: XUR_VENDOR,
    categories
  };

  await fs.promises.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.promises.writeFile(OUT_PATH, JSON.stringify(payload, null, 2));

  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
