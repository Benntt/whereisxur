async function loadXurInventory() {
  const container = document.getElementById("xur-inventory");
  container.innerHTML = "<p>Loading Xûr’s inventory...</p>";

  try {
    const res = await fetch("https://benntt.github.io/whereisxur/data/xur_inventory.json");
    if (!res.ok) throw new Error("Failed to load inventory");
    const data = await res.json();

    container.innerHTML = "";

    // The file structure has "categories" with numbered keys
    const items = Object.values(data.categories);

    // Create a grid for the items
    const grid = document.createElement("div");
    grid.classList.add("inventory-grid");

    items.forEach(entry => {
      // Some entries might not have item details yet
      const card = document.createElement("div");
      card.classList.add("item-card");

      // Try to include fallback visuals for missing data
      const img = document.createElement("img");
      img.src = entry.icon || "https://www.bungie.net/img/theme/destiny/icons/icon_missing.png";
      img.alt = entry.name || "Unknown Item";

      const name = document.createElement("h3");
      name.textContent = entry.name || `Item ${entry.itemHash}`;

      const type = document.createElement("p");
      type.textContent = entry.type || "";

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
