const WORKER_URL = "https://YOUR_WORKER_SUBDOMAIN.workers.dev";

const statusEl = document.getElementById("status");
const gridEl   = document.getElementById("inventory");
const locEl    = document.getElementById("location");

function setStatus(text, cls = "") {
  statusEl.textContent = text;
  statusEl.className = `status ${cls}`;
}

function locationCard(loc) {
  if (!loc) return "";
  const parts = [loc.destination, loc.place].filter(Boolean).join(" — ");
  return `
    <article class="location-card">
      <h2>${loc.destination || "Xûr's location"}</h2>
      <p>${parts || "Check Tower Hangar, EDZ Winding Cove, or Nessus Watcher’s Grave."}</p>
    </article>`;
}

async function load() {
  try {
    setStatus("Contacting Bungie…");
    gridEl.setAttribute("aria-busy", "true");

    const res = await fetch(`${WORKER_URL}/xur`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // status + location
    if (data.active) {
      setStatus("Xûr is here! Inventory below.", "status--online");
    } else {
      setStatus("Xûr has departed. Check back Friday.", "status--offline");
    }
    locEl.innerHTML = locationCard(data.location);

    // render items
    gridEl.innerHTML = "";
    if (!data.items?.length) {
      gridEl.innerHTML = `<div class="location-card"><p>No items found.</p></div>`;
      return;
    }

    for (const it of data.items) {
      const item = document.createElement("article");
      item.className = "item";

      const img = document.createElement("img");
      img.className = "thumb";
      img.alt = it.name || "Item";
      img.src = it.icon || "https://www.bungie.net/img/theme/destiny/icons/icon_d2.png";

      const meta = document.createElement("div");
      meta.className = "meta";

      const h3 = document.createElement("h3");
      h3.textContent = it.name || "Unknown item";

      const sub = document.createElement("div");
      sub.className = "sub";
      sub.textContent = it.type || "";

      meta.appendChild(h3);
      if (it.type) meta.appendChild(sub);

      if (Array.isArray(it.costs) && it.costs.length) {
        const ul = document.createElement("ul");
        ul.className = "costs";
        for (const c of it.costs) {
          const li = document.createElement("li");
          const qty = document.createElement("span");
          qty.textContent = c.quantity;
          li.appendChild(qty);
          if (c.icon) {
            const ci = document.createElement("img");
            ci.src = c.icon;
            ci.alt = c.name || "Cost";
            li.appendChild(ci);
          }
          const name = document.createElement("span");
          name.textContent = c.name || "Cost";
          li.appendChild(name);
          ul.appendChild(li);
        }
        meta.appendChild(ul);
      }

      item.appendChild(img);
      item.appendChild(meta);
      gridEl.appendChild(item);
    }
  } catch (err) {
    console.error(err);
    setStatus(`Unable to load Xûr: ${err.message}`, "status--error");
    gridEl.innerHTML = "";
  } finally {
    gridEl.setAttribute("aria-busy", "false");
  }
}

document.addEventListener("DOMContentLoaded", load);
