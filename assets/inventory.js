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

    // Create the grid
    const grid = document.createElement("div");
    grid.classList.add("inventory-grid");

    Object.values(data.categories).forEach(item => {
      if (!item.itemHash) return;

      const card = document.createElement("div");
      card.classList.add("item-card");

      // Placeholder image until manifest integration
      const img = document.createElement("img");
      img.src = "https://www.bungie.net/img/destiny_content/legends/icons/destiny2_icon.jpg";
      img.alt = "Destiny Item Icon";

      const title = document.createElement("h3");
      title.textContent = `Item Hash: ${item.itemHash}`;

      card.appendChild(img);
      card.appendChild(title);
      grid.appendChild(card);
    });

    inventoryContainer.appendChild(grid);

  } catch (error) {
    console.error("Error loading Xûr inventory:", error);
    inventoryContainer.innerHTML = "<p>Error loading Xûr’s inventory.</p>";
  }
}

document.addEventListener("DOMContentLoaded", loadXurInventory);
