async function loadXurInventory() {
  const container = document.getElementById("xur-inventory");
  container.innerHTML = "<p>Loading Xûr’s inventory...</p>";

  try {
    const res = await fetch("https://benntt.github.io/whereisxur/data/xur_inventory_enriched.json");
    if (!res.ok) throw new Error("Failed to load inventory");
    const data = await res.json();

    container.innerHTML = "";

    // Your file has a structure like { vendorHash, categories: { "1": { itemHash, displayProperties, ... } } }
    const categories = data.categories || {};
    const items = Object.values(categories);
    const filtered = items.slice(0, 40);

    const grid = document.createElement("div");
    grid.classList.add("inventory-grid");

    filtered.forEach(item => {
      const display = item.displayProperties || {};

      const icon = display.icon
        ? `https://www.bungie.net${display.icon}`
        : "https://www.bungie.net/img/theme/destiny/icons/icon_missing.png";

      const name = display.name || `Item ${item.itemHash}`;
      const type =
        item.itemTypeDisplayName ||
        item.classType ||
        item.itemType ||
        "Unknown Type";

      const card = document.createElement("div");
      card.classList.add("item-card");

      const img = document.createElement("img");
      img.src = icon;
      img.alt = name;

      const nameEl = document.createElement("h3");
      nameEl.textContent = name;

      const typeEl = document.createElement("p");
      typeEl.textContent = type;

      card.appendChild(img);
      card.appendChild(nameEl);
      card.appendChild(typeEl);
      grid.appendChild(card);
    });

    container.appendChild(grid);
  } catch (err) {
    console.error("Error loading Xûr’s inventory:", err);
    container.innerHTML = "<p>Error loading Xûr’s inventory.</p>";
  }
}

document.addEventListener("DOMContentLoaded", loadXurInventory);
