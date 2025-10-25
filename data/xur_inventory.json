async function loadXurInventory() {
  const container = document.getElementById("xur-inventory");
  container.innerHTML = "<p>Loading Xûr’s inventory...</p>";

  try {
    const res = await fetch("./data/xur_inventory.json");
    if (!res.ok) throw new Error("Failed to load inventory");
    const data = await res.json();

    container.innerHTML = "";
    for (const [category, items] of Object.entries(data.categories)) {
      const h2 = document.createElement("h2");
      h2.textContent = category;
      container.appendChild(h2);

      const grid = document.createElement("div");
      grid.classList.add("inventory-grid");

      items.forEach(item => {
        const card = document.createElement("div");
        card.classList.add("item-card");

        const img = document.createElement("img");
        img.src = item.icon;
        img.alt = item.name;

        const name = document.createElement("h3");
        name.textContent = item.name;

        const type = document.createElement("p");
        type.textContent = item.type || "";

        card.appendChild(img);
        card.appendChild(name);
        card.appendChild(type);
        grid.appendChild(card);
      });

      container.appendChild(grid);
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error loading Xûr’s inventory.</p>";
  }
}

document.addEventListener("DOMContentLoaded", loadXurInventory);
