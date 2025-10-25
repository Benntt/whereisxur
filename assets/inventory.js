async function loadXurInventory() {
  const container = document.getElementById("xur-inventory");
  container.innerHTML = "<p>Loading Xûr’s inventory...</p>";

  try {
    const res = await fetch("https://benntt.github.io/whereisxur/data/xur_inventory_enriched.json");
    if (!res.ok) throw new Error("Failed to load inventory");
    const data = await res.json();

    container.innerHTML = "";
    const categories = data.categories || {};
    const items = [];

    // Flatten all saleItems across categories
    Object.values(categories).forEach(category => {
      if (category.saleItems) {
        Object.values(category.saleItems).forEach(sale => items.push(sale));
      }
    });

    if (items.length === 0) {
      container.innerHTML = "<p>No items available from Xûr right now.</p>";
      return;
    }

    const grid = document.createElement("div");
    grid.classList.add("inventory-grid");

    items.slice(0, 40).forEach(item => {
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
