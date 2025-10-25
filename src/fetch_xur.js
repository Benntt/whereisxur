import fs from 'fs';
import fetch from 'node-fetch';

const API_KEY = process.env.BUNGIE_API_KEY;
const CLIENT_ID = process.env.BUNGIE_CLIENT_ID;
const CLIENT_SECRET = process.env.BUNGIE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.BUNGIE_REFRESH_TOKEN;

// CHANGE THESE TO MATCH YOUR ACCOUNT
// You can get these by calling the /User/GetMembershipsForCurrentUser endpoint once using your access token
const MEMBERSHIP_TYPE = 3; // 1=Xbox, 2=PSN, 3=Steam/Epic, 5=Stadia
const DESTINY_MEMBERSHIP_ID = '21329669'; // yours from refresh result
const CHARACTER_ID = '2305843009299618089'; // pick any character on your account

const BASE_URL = 'https://www.bungie.net/Platform/Destiny2';
const VENDOR_HASH_XUR = 2190858386;

// Refresh access token using stored refresh token
async function refreshAccessToken() {
  const res = await fetch('https://www.bungie.net/platform/app/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: REFRESH_TOKEN,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    })
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh token: ${res.status}`);
  }

  const data = await res.json();
  if (!data.access_token) throw new Error('No access token in refresh response');
  return data.access_token;
}

// Bungie GET helper
async function bungieGet(path, accessToken) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'X-API-Key': API_KEY,
      'Authorization': `Bearer ${accessToken}`
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${path}`);
  }
  return await res.json();
}

// Fetch vendor and any nested vendors
async function fetchVendorRecursive(vendorHash, accessToken) {
  const url = `/${MEMBERSHIP_TYPE}/Profile/${DESTINY_MEMBERSHIP_ID}/Character/${CHARACTER_ID}/Vendors/${vendorHash}/?components=402,400,302`;
  const data = await bungieGet(url, accessToken);

  const categories = data.Response?.categories?.data?.categories || [];
  const sales = data.Response?.sales?.data || {};
  const result = {};

  for (const cat of categories) {
    const catName = cat.displayCategoryIndex ?? cat.displayCategoryHash;
    result[catName] = [];

    const saleItems = cat.itemIndexes?.map(i => sales[i]) || [];
    for (const sale of Object.values(sales)) {
      const item = sale.itemHash;
      const quantity = sale.quantity;
      result[catName].push({ item, quantity });
    }
  }

  return result;
}

async function main() {
  console.log('Fetching Xur and nested vendors…');
  const accessToken = await refreshAccessToken();

  let allData = { vendorHash: VENDOR_HASH_XUR, generatedAt: new Date().toISOString(), categories: {} };

  try {
    const xurData = await fetchVendorRecursive(VENDOR_HASH_XUR, accessToken);
    allData.categories = xurData;
  } catch (err) {
    console.error('✗ Xur fetch failed:', err.message);
  }

  // Save JSON
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/xur_inventory.json', JSON.stringify(allData, null, 2));
  console.log('✓ Wrote data/xur_inventory.json');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
