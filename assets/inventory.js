async function loadXurInventory() {
  try {
    const response = await fetch("/whereisxur/data/xur_inventory_enriched.json");
    if (!response.ok) throw new Error("Failed to fetch Xûr data");
    const data = await response.json();

    const inventoryContainer = document.getElementById("xur-inventory");
    inventoryContainer.innerHTML = "";

    if (!data.categories || Object.keys(data.categories).length === 0) {
      inventoryContainer.innerHTML = "<p>No items available from Xûr right now.</p>";
      return;
    }

    // Create wrapper for layout (3 columns)
    const grid = document.createElement("div");
    grid.classList.add("inventory-grid");

    Object.values(data.categories).forEach(item => {
      if (!item.itemHash) return;

      const card = document.createElement("div");
      card.classList.add("item-card");

      const img = document.createElement("img");
      img.src = `https://www.bungie.net/common/destiny2_content/icons/${item.itemHash}.jpg`;
      img.alt = item.itemHash;

      const title = document.createElement("h3");
      title.textContent = `Item Hash: ${item.itemHash}`;

      card.appendChild(img);
      card.appendChild(title);
      grid.appendChild(card);
    });

    inventoryContainer.appendChild(grid);

  } catch (error) {
    console.error("Error loading Xûr inventory:", error);
    document.getElementById("xur-inventory").innerHTML =
      "<p>Error loading Xûr's inventory.</p>";
  }
}

document.addEventListener("DOMContentLoaded", loadXurInventory);
