async function loadXurInventory() {
  const container = document.getElementById("xur-inventory");
  container.innerHTML = "<p>Loading Xûr’s inventory...</p>";

  try {
    const res = await fetch("https://benntt.github.io/whereisxur/data/xur_inventory_enriched.json");
    if (!res.ok) throw new Error("Failed to load inventory");
    const data = await res.json();

    const categories = data.categories || {};
    const itemHashes = [];

    Object.values(categories).forEach(category => {
      if (category.saleItems) {
        Object.values(category.saleItems).forEach(sale => {
          if (sale.itemHash) itemHashes.push(sale.itemHash);
        });
      }
    });

    if (itemHashes.length === 0) {
      container.innerHTML = "<p>No items available from Xûr right now.</p>";
      return;
    }

    container.innerHTML = "";
    const grid = document.createElement("div");
    grid.classList.add("inventory-grid");

    // Use Bungie's manifest for lookups
    for (const hash of itemHashes.slice(0, 40)) {
      const manifestURL = `https://www.bungie.net/Platform/Destiny2/Manifest/DestinyInventoryItemDefinition/${hash}/`;
      let display = null;

      try {
        const manifestRes = await fetch(manifestURL, {
          headers: { "X-API-Key": "YOUR_BUNGIE_API_KEY_HERE" } // replace this with your key
        });
        const manifestData = await manifestRes.json();
        display = manifestData.Response?.displayProperties || {};
      } catch (err) {
        console.warn(`Failed to fetch manifest for ${hash}`);
      }

      const icon = display.icon
        ? `https://www.bungie.net${display.icon}`
        : "https://www.bungie.net/img/theme/destiny/icons/icon_missing.png";

      const name = display.name || `Item ${hash}`;
      const card = document.createElement("div");
      card.classList.add("item-card");

      const img = document.createElement("img");
      img.src = icon;
      img.alt = name;

      const nameEl = document.createElement("h3");
      nameEl.textContent = name;

      card.appendChild(img);
      card.appendChild(nameEl);
      grid.appendChild(card);
    }

    container.appendChild(grid);
  } catch (err) {
    console.error("Error loading Xûr’s inventory:", err);
    container.innerHTML = "<p>Error loading Xûr’s inventory.</p>";
  }
}

document.addEventListener("DOMContentLoaded", loadXurInventory);
