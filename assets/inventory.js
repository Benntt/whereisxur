async function loadXurInventory() {
  const inventoryContainer = document.getElementById("xur-inventory");
  inventoryContainer.innerHTML = "<p>Loading Xûr’s inventory...</p>";

  try {
    const response = await fetch("./data/xur_inventory_enriched.json");
    if (!response.ok) throw new Error("Failed to fetch Xûr data");

    const data = await response.json();
    inventoryContainer.innerHTML = "";

    if (!data.categories || Object.keys(data.categories).length === 0) {
      inventoryContainer.innerHTML = "<p>No items available from Xûr right now.</p>";
      return;
    }

    // Create grid layout
    const grid = document.createElement("div");
    grid.classList.add("inventory-grid");

    // Go through each category and then through its saleItems
    Object.values(data.categories).forEach(category => {
      if (!category.saleItems) return;

      Object.values(category.saleItems).forEach(item => {
        if (!item.itemHash) return;

        const card = document.createElement("div");
        card.classList.add("item-card");

        // Use real Bungie icon if available
        const img = document.createElement("img");
        img.src = item.displayProperties?.icon
          ? `https://www.bungie.net${item.displayProperties.icon}`
          : "https://www.bungie.net/img/destiny_content/legends/icons/destiny2_icon.jpg";
        img.alt = item.displayProperties?.name || "Destiny Item";

        const title = document.createElement("h3");
        title.textContent = item.displayProperties?.name || `Item ${item.itemHash}`;

        const type = document.createElement("p");
        type.classList.add("xur-type");
        type.textContent = item.itemTypeDisplayName || "";

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(type);
        grid.appendChild(card);
      });
    });

    inventoryContainer.appendChild(grid);

  } catch (error) {
    console.error("Error loading Xûr inventory:", error);
    inventoryContainer.innerHTML = "<p>Error loading Xûr’s inventory.</p>";
  }
}

document.addEventListener("DOMContentLoaded", loadXurInventory);
