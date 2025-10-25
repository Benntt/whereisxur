// inventory.js
// Loads and displays Xûr’s inventory from the enriched JSON data

async function loadXurInventory() {
  const container = document.getElementById('xur-inventory');
  if (!container) return;

  try {
    const response = await fetch('data/xur_inventory_enriched.json');
    if (!response.ok) throw new Error('Failed to load inventory file.');

    const data = await response.json();
    const categories = data.categories;
    if (!categories) throw new Error('No categories found in inventory.');

    container.innerHTML = ''; // Clear placeholder text

    const itemEntries = Object.entries(categories)
      .filter(([_, item]) => item.item && item.item.displayProperties)
      .map(([_, item]) => item.item);

    if (itemEntries.length === 0) {
      container.innerHTML = '<p>No items available right now.</p>';
      return;
    }

    const grouped = groupItemsByType(itemEntries);

    for (const [category, items] of Object.entries(grouped)) {
      const section = document.createElement('section');
      section.classList.add('xur-section');

      const title = document.createElement('h2');
      title.textContent = category;
      section.appendChild(title);

      const grid = document.createElement('div');
      grid.classList.add('xur-grid');

      for (const item of items) {
        const card = document.createElement('div');
        card.classList.add('xur-item');

        const img = document.createElement('img');
        img.src = `https://www.bungie.net${item.displayProperties.icon}`;
        img.alt = item.displayProperties.name;

        const name = document.createElement('h3');
        name.textContent = item.displayProperties.name;

        const type = document.createElement('p');
        type.classList.add('xur-type');
        type.textContent = item.itemTypeDisplayName || '';

        card.appendChild(img);
        card.appendChild(name);
        card.appendChild(type);

        grid.appendChild(card);
      }

      section.appendChild(grid);
      container.appendChild(section);
    }
  } catch (error) {
    console.error('Error loading Xûr inventory:', error);
    container.innerHTML = `<p class="error">Failed to load Xûr's inventory.</p>`;
  }
}

function groupItemsByType(items) {
  const groups = {};
  for (const item of items) {
    const category = item.itemTypeDisplayName || 'Other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
  }
  return groups;
}

// Initialize after DOM loads
document.addEventListener('DOMContentLoaded', loadXurInventory);
