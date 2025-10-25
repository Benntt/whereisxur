async function loadXurInventory() {
  const container = document.getElementById("xur-inventory");
  container.innerHTML = "<p>Loading Xûr’s inventory...</p>";

  try {
    // Use the enriched file (has names, icons, and types)
    const res = await fetch("https://benntt.github.io/whereisxur/data/xur_inventory_enriched.json");
    if (!res.ok) throw new Error("Failed to load inventory");
    const data = await res.json();

    container.innerHTML = "";

    // Flatten the categories into a list of items
    const items = Object.values(data.categories);

    // Limit to ~40 items max to avoid overflow
    const filtered = items.slice(0, 40);

    const grid = document.createElement("div");
    grid.classList.add("inventory-grid");

    filtered.forEach(entry => {
      const def = entry.definition || {}; // the enriched data holds these
      const card = document.createElement("div");
      card.classList.add("item-card");

      const img = document.createElement("img");
      img.src = def.displayProperties?.icon
        ? `https://www.bungie.net${def.displayProperties.icon}`
        : "https://www.bungie.net/img/theme/destiny/icons/icon_missing.png";
      img.alt = def.displayProperties?.name || "Unknown Item";

      const name = document.createElement("h3");
      name.textContent = def.displayProperties?.name || `Item ${entry.itemHash}`;

      const type = document.createElement("p");
      type.textContent = def.itemTypeDisplayName || "";

      card.appendChild(img);
      card.appendChild(name);
      card.appendChild(type);
      grid.appendChild(card);
    });

    container.appendChild(grid);
  } catch (err) {
    console.error("Error loading Xûr’s inventory:", err);
    container.innerHTML = "<p>Error loading Xûr’s inventory.</p>";
  }
}

document.addEventListener("DOMContentLoaded", loadXurInventory);
