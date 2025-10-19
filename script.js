const API = "https://www.bungie.net/Platform";
const XUR_HASH = 2190858386;

async function bfetch(path) {
  const res = await fetch(`${API}${path}`, { headers: { "X-API-Key": window.BUNGIE_API_KEY } });
  const data = await res.json();
  if (!res.ok || data.ErrorCode !== 1) throw new Error(data.Message);
  return data.Response;
}

async function getItemDef(hash) {
  const r = await bfetch(`/Destiny2/Manifest/DestinyInventoryItemDefinition/${hash}/`);
  return r.displayProperties;
}

async function loadXur() {
  const status = document.getElementById("status");
  const grid = document.getElementById("inventory");
  try {
    status.textContent = "Fetching public vendors...";
    const r = await bfetch("/Destiny2/Vendors/?components=400,402");
    const sales = r.sales.data[XUR_HASH];
    if (!sales) {
      status.textContent = "Xûr is not available right now.";
      return;
    }
    status.textContent = "Xûr is here!";
    const items = Object.values(sales.saleItems);
    for (const s of items) {
      const d = await getItemDef(s.itemHash);
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <img src="https://bungie.net${d.icon}" alt="${d.name}">
        <div class="meta">
          <h3>${d.name}</h3>
          <div class="type">${d.itemTypeDisplayName || ""}</div>
        </div>`;
      grid.appendChild(card);
    }
  } catch (e) {
    status.textContent = "Error: " + e.message;
  }
}

// countdown
function countdown() {
  const el = document.getElementById("countdown");
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  const target = new Date();
  let label;
  if ((day > 5 || (day === 5 && hour >= 17)) || day < 2) {
    // currently active, count to Tuesday 17:00 UTC
    label = "Xûr leaves in ";
    target.setUTCDate(now.getUTCDate() + ((2 - day + 7) % 7));
    target.setUTCHours(17,0,0,0);
  } else {
    // inactive, count to Friday 17:00 UTC
    label = "Xûr arrives in ";
    target.setUTCDate(now.getUTCDate() + ((5 - day + 7) % 7));
    target.setUTCHours(17,0,0,0);
  }
  const t = target - now;
  const d = Math.floor(t / 86400000);
  const h = Math.floor((t % 86400000) / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  el.textContent = `${label}${d}d ${h}h ${m}m`;
}

countdown();
setInterval(countdown, 60000);
loadXur();
