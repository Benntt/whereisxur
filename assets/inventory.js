// assets/inventory.js
async function loadXurInventory() {
  const container = document.getElementById('xur-inventory');

  try {
    const response = await fetch('data/xur_inventory_enriched.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    const items = Object.values(data);
    if (!items.length) {
      container.innerHTML = `<p>No items available from Xûr right now.</p>`;
      return;
    }

    const html = items
      .map(item => `
        <div class="xur-item">
          <img src="https://www.bungie.net${item.displayProperties.icon}" alt="${item.displayProperties.name}" />
          <p>${item.displayProperties.name}</p>
        </div>
      `)
      .join('');

    container.innerHTML = html;
  } catch (err) {
    console.error('Failed to load Xûr inventory:', err);
    container.innerHTML = `<p>Unable to load Xûr’s inventory right now.</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadXurInventory);
