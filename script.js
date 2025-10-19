const API = "https://www.bungie.net/Platform";
const XUR_VENDOR_HASH = 2190858386; // Xûr
const COMPONENTS = "400,402"; // Vendors, VendorSales

// Utility: fetch with API key
async function bfetch(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { "X-API-Key": window.BUNGIE_API_KEY }
  });
  const json = await res.json();
  if (!res.ok || json.ErrorCode !== 1) {
    throw new Error(json.Message || `HTTP ${res.status}`);
  }
  return json.Response;
}

// Utility: get item definition for a single hash (fast per-item call)
async function getItemDef(itemHash) {
  const res = await bfetch(`/Destiny2/Manifest/DestinyInventoryItemDefinition/${itemHash}/`);
  return res;
}

// Render helpers
const statusEl = document.getElementById("status");
const gridEl = document.getElementById("inventory");
const countdownEl = document.getElementById("countdown");

// Countdown logic: Friday 17:00 UTC -> Tuesday 17:00 UTC
function nextUtc(dayIndex, hour) {
  // dayIndex: 0=Sun ... 6=Sat
  const now = new Date();
  // Create a Date in UTC same week
  const utcNow = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()
  ));

  // find target this week
  const target = new Date(utcNow);
  const deltaDays = (dayIndex - target.getUTCDay() + 7) % 7;
  target.setUTCDate(target.getUTCDate() + deltaDays);
  target.setUTCHours(hour, 0, 0, 0);

  // if already passed, push a week
  if (target <= utcNow) target.setUTCDate(target.getUTCDate() + 7);
  return target;
}

function formatRemaining(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}

function runCountdown() {
  const now = new Date();
  // windows: arrival = Friday 17:00 UTC (5), departure = Tuesday 17:00 UTC (2)
  const nextFri = nextUtc(5, 17);
  const nextTue = nextUtc(2, 17);

  // Determine which is the *current* active window
  // If today is between Fri 17:00 UTC and the following Tue 17:00 UTC, count to Tue; else count to Fri.
  let target;
  const utcNow = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()
  ));
  // get last Friday and next Tuesday relative to now
  const lastFri = new Date(nextFri); lastFri.setUTCDate(nextFri.getUTCDate() - 7);
  const upcomingTue = (utcNow < nextTue) ? nextTue : new Date(nextTue.getTime() + 7*86400000);

  const inWindow = utcNow >= lastFri && utcNow < upcomingTue;
  target = inWindow ? upcomingTue : nextFri;

  function tick() {
    const rem = target - new Date();
    countdownEl.textContent = (inWindow ? "Xûr leaves in " : "Xûr arrives in ") + formatRemaining(rem);
    requestAnimationFrame(tick);
  }
  tick();
}

// Build a cost string from sale item costs (Strange Coins etc.)
function costString(costs) {
  if (!Array.isArray(costs) || costs.length === 0) return "";
  return costs.map(c => `${c.quantity} × ${c.itemHash}`).join(", "); // will be replaced with names if needed
}

// Replace itemHash costs with names/icons lazily
async function prettyCosts(costs) {
  if (!Array.isArray(costs) || costs.length === 0) return "";
  const parts = [];
  for (const c of costs) {
    const def = await getItemDef(c.itemHash);
    const name = def?.displayProperties?.name || c.itemHash;
    parts.push(`${c.quantity} × ${name}`);
  }
  return parts.join(" • ");
}

function cardTemplate({ name, type, icon, costs, category }) {
  const img = icon ? `https://www.bungie.net${icon}` : "";
  return `
    <article class="card">
      <img src="${img}" alt="${name}" loading="lazy" />
      <div class="meta">
        <h3>${name}</h3>
        <div class="type">${type || ""}</div>
        <div class="cost">${costs || ""}</div>
        ${category ? `<span class="badge">${category}</span>` : ""}
      </div>
    </article>
  `;
}

async function loadXur() {
  try {
    statusEl.textContent = "Loading Xûr from public vendors…";
    const pub = await bfetch(`/Destiny2/Vendors/?components=${COMPONENTS}`);

    // Find Xûr vendor and sales
    const vendors = pub.vendors?.data || {};
    const sales = pub.sales?.data || {}; // keyed by vendorHash

    if (!vendors[XUR_VENDOR_HASH] || !sales[XUR_VENDOR_HASH]) {
      statusEl.textContent = "Xûr not available right now. Countdown reflects next arrival.";
      return;
    }

    statusEl.textContent = "Xûr is here. Building inventory…";

    const saleItems = Object.values(sales[XUR_VENDOR_HASH].saleItems || {});
    // Fetch definitions for each itemHash (name/icon/type)
    const cards = [];
    for (const s of saleItems) {
      const def = await getItemDef(s.itemHash);
      const name = def?.displayProperties?.name || "Unknown Item";
      const type = def?.itemTypeDisplayName || "";
      const icon = def?.displayProperties?.icon || "";
      const costs = await prettyCosts(s.costs || []);
      // Optional: category from vendor categories if you want to group later
      cards.push(cardTemplate({ name, type, icon, costs }));
    }

    gridEl.innerHTML = cards.join("");
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error loading Bungie API: ${err.message}`;
  }
}

// Init
if (!window.BUNGIE_API_KEY || window.BUNGIE_API_KEY.includes("PASTE_YOUR_")) {
  document.getElementById("status").textContent =
    "Add your Bungie API key to config.js to enable live data.";
} else {
  loadXur();
}
runCountdown();
