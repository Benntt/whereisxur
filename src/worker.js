// Cloudflare Worker - Xûr API proxy + enrichment
// Fetches vendor sales + definitions server-side (no CORS, no leaked key)

const API_BASE = "https://www.bungie.net/Platform";
const XUR_VENDOR_HASH = 2190858386;

// naive in-memory cache per edge instance (good enough to reduce bursts)
let cached = { ts: 0, data: null };
const TTL_MS = 5 * 60 * 1000; // 5 min

async function bungie(path, env) {
  const url = new URL(path, API_BASE);
  const res = await fetch(url, {
    headers: { "X-API-Key": env.BUNGIE_API_KEY, "Accept": "application/json" },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.ErrorCode !== 1) {
    const msg = body?.Message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body.Response;
}

async function getDefinition(table, hash, env) {
  return bungie(`/Destiny2/Manifest/${table}/${hash}/`, env);
}

async function getDefinitions(table, hashes, env, concurrency = 16) {
  const unique = [...new Set(hashes.filter(h => typeof h === "number" && h > 0))];
  const out = new Map();

  // simple concurrency limiter
  let i = 0;
  async function worker() {
    while (i < unique.length) {
      const idx = i++;
      const h = unique[idx];
      try {
        const def = await getDefinition(table, h, env);
        out.set(h, def);
      } catch (_) {
        // swallow (Bungie sometimes 5xx-es); item will be skipped if missing
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker));
  return out;
}

async function loadXur(env) {
  // cached?
  const now = Date.now();
  if (cached.data && now - cached.ts < TTL_MS) return cached.data;

  // 400 sales, 401 vendors, 402 categories
  const vendors = await bungie("/Destiny2/Vendors/?components=400,401,402", env);
  const vendorSales = vendors.sales?.data?.[XUR_VENDOR_HASH];
  const vendorInfo  = vendors.vendors?.data?.[XUR_VENDOR_HASH];

  if (!vendorSales || !vendorInfo) {
    const payload = { active: false, items: [], location: null, generatedAt: new Date().toISOString() };
    cached = { ts: now, data: payload };
    return payload;
  }

  const saleItems = Object.values(vendorSales.saleItems || {}).sort(
    (a,b) => a.vendorItemIndex - b.vendorItemIndex
  );

  // gather item + cost hashes to enrich once
  const itemHashes = saleItems.map(s => s.itemHash);
  const costHashes = saleItems.flatMap(s => (s.costs || []).map(c => c.itemHash));
  const allCostHashes = [...new Set(costHashes)];

  const [itemDefs, costDefs] = await Promise.all([
    getDefinitions("DestinyInventoryItemDefinition", itemHashes, env),
    getDefinitions("DestinyInventoryItemDefinition", allCostHashes, env)
  ]);

  // optional location strings (best effort)
  let location = null;
  try {
    const vendorDef = await getDefinition("DestinyVendorDefinition", XUR_VENDOR_HASH, env);
    const locIdx = vendorInfo.vendorLocationIndex ?? 0;
    const loc = vendorDef.locations?.[locIdx];
    if (loc?.destinationHash) {
      const dest = await getDefinition("DestinyDestinationDefinition", loc.destinationHash, env);
      const place = dest.placeHash ? await getDefinition("DestinyPlaceDefinition", dest.placeHash, env) : null;
      location = {
        destination: dest?.displayProperties?.name || "",
        place: place?.displayProperties?.name || ""
      };
    }
  } catch (_) {
    location = null;
  }

  const items = saleItems.map(s => {
    const def = itemDefs.get(s.itemHash);
    if (!def) return null;
    const display = def.displayProperties || {};
    const costs = (s.costs || []).map(c => {
      const cdef = costDefs.get(c.itemHash);
      const cd = cdef?.displayProperties || {};
      return {
        quantity: c.quantity,
        name: cd.name || "Unknown",
        icon: cd.icon ? `https://www.bungie.net${cd.icon}` : null
      };
    });
    return {
      hash: s.itemHash,
      name: display.name || "Unknown Item",
      type: def.itemTypeAndTierDisplayName || def.itemTypeDisplayName || def.inventory?.tierTypeName || "",
      icon: display.icon ? `https://www.bungie.net${display.icon}` : null,
      description: display.description || "",
      costs
    };
  }).filter(Boolean);

  const payload = {
    active: true,
    location,
    generatedAt: new Date().toISOString(),
    items
  };

  cached = { ts: now, data: payload };
  return payload;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/xur") {
      try {
        const data = await loadXur(env);
        return new Response(JSON.stringify(data), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, s-maxage=300, max-age=60"
          }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: { "content-type": "application/json" } });
      }
    }
    return new Response("whereisxur worker OK. Use /xur", { status: 200 });
  },
};
