import fs from 'fs';
import fetch from 'node-fetch';

const API_KEY = process.env.BUNGIE_API_KEY;
const CLIENT_ID = process.env.BUNGIE_CLIENT_ID;
const CLIENT_SECRET = process.env.BUNGIE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.BUNGIE_REFRESH_TOKEN;

// your account values
const MEMBERSHIP_TYPE = 3; // 1=Xbox, 2=PSN, 3=Steam/Epic, 5=Stadia
const DESTINY_MEMBERSHIP_ID = '21329669';
const CHARACTER_ID = '2305843009299618089';
const VENDOR_HASH_XUR = 2190858386;

const BASE_URL = 'https://www.bungie.net/Platform/Destiny2';

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

async function fetchVendorRecursive(vendorHash, accessToken) {
  const url = `/${MEMBERSHIP_TYPE}/Profile/${DESTINY_MEMBERSHIP_ID}/Character/${CHARACTER_ID}/Vendors/${vendorHash}/?components=402,400,302`;
  const fullUrl = `${BASE_URL}${url}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(fullUrl, {
      headers: {
        'X-API-Key': API_KEY,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (!data.Response) return { error: 'Empty vendor response' };

      const categories = data.Response.categories?.data?.categories || [];
      const sales = data.Response.sales?.data || {};
      const result = {};

      for (const cat of categories) {
        const catName = cat.displayCategoryIndex ?? cat.displayCategoryHash;
        result[catName] = [];
        for (const sale of Object.values(sales)) {
          result[catName].push({
            item: sale.itemHash,
            quantity: sale.quantity
          });
        }
      }

      return result;
    }

    if (res.status >= 500) {
      console.warn(`Server error ${res.status}, retrying (${attempt}/3)…`);
      await new Promise(r => setTimeout(r, 2000 * attempt));
      continue;
    }

    console.error(`✗ Bungie API error ${res.status}: ${url}`);
    return { error: `HTTP ${res.status}` };
  }

  return { error: 'Max retries exceeded' };
}

async function main() {
  console.log('Fetching Xur and nested vendors…');
  const accessToken = await refreshAccessToken();

  const allData = {
    vendorHash: VENDOR_HASH_XUR,
    generatedAt: new Date().toISOString(),
    categories: {}
  };

  try {
    const xurData = await fetchVendorRecursive(VENDOR_HASH_XUR, accessToken);
    if (xurData.error) {
      console.warn('Vendor fetch returned an error:', xurData.error);
    } else {
      allData.categories = xurData;
    }
  } catch (err) {
    console.error('✗ Xur fetch failed:', err.message);
  }

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/xur_inventory.json', JSON.stringify(allData, null, 2));
  console.log('✓ Wrote data/xur_inventory.json');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
