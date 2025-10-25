async function loadXurInventory() {
  const container = document.getElementById("xur-inventory");
  container.innerHTML = "<p>Loading Xûr’s inventory...</p>";

  try {
    const response = await fetch("/whereisxur/data/xur_inventory_enriched.json");

    const data = await response.json();

    if (!data || !data.categories) {
      container.innerHTML = "<p>No items available from Xûr right now.</p>";
      return;
    }

    const items = [];

    // Flatten nested saleItems
    for (const categoryKey in data.categories) {
      const category = data.categories[categoryKey];
      if (!category.saleItems) continue;

      for (const saleKey in category.saleItems) {
        const saleItem = category.saleItems[saleKey];
        const itemHash = saleItem.itemHash;
        const definition = data.definitions?.[itemHash];
        if (!definition) continue;

        items.push({
          name: definition.displayProperties?.name || "Unknown Item",
          description: definition.itemTypeDisplayName || "Unknown Type",
          icon: definition.displayProperties?.icon
            ? `https://www.bungie.net${definition.displayProperties.icon}`
            : null,
        });
      }
    }

    if (!items.length) {
      container.innerHTML = "<p>No items available from Xûr right now.</p>";
      return;
    }

    // Build grid
    const grid = document.createElement("div");
    grid.className = "xur-grid";

    for (const item of items) {
      const itemDiv = document.createElement("div");
      itemDiv.className = "xur-item";

      itemDiv.innerHTML = `
        ${item.icon ? `<img src="${item.icon}" alt="${item.name}">` : ""}
        <h3>${item.name}</h3>
        <p class="xur-type">${item.description}</p>
      `;

      grid.appendChild(itemDiv);
    }

    container.innerHTML = "";
    container.appendChild(grid);
  } catch (error) {
    console.error("Error loading Xûr inventory:", error);
    container.innerHTML = "<p>Error loading Xûr’s inventory.</p>";
  }
}

document.addEventListener("DOMContentLoaded", loadXurInventory);
