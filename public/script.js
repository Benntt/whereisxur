async function loadXurInventory() {
  const container = document.getElementById('xur-inventory');
  try {
    const response = await fetch('./data/xur_inventory_enriched.json');
    if (!response.ok) throw new Error('Failed to load inventory');
    const data = await response.json();

    container.innerHTML = Object.values(data.items || {}).map(item => `
      <div class="item">
        <img src="https://www.bungie.net${item.icon}" alt="${item.name}" />
        <p>${item.name}</p>
      </div>
    `).join('');
  } catch (err) {
    container.textContent = 'Error loading Xûr’s inventory.';
    console.error(err);
  }
}

loadXurInventory();
