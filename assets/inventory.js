// inventory.js
// Fixed version to read enriched JSON structure directly

async function loadXurInventory() {
  const container = document.getElementById('xur-inventory');
  if (!container) return;

  try {
    const response = await fetch('data/xur_inventory_enriched.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load inventory data.');

    const data = await response.json();
    const categories = data.categories;
    if (!categories || Object.keys(categories).length === 0) {
      container.innerHTML = '<p>No items available from Xûr right now.</p>';
      return;
    }

    const items = Object.values(categories).filter(i => i.name && i.icon);

    if (items.length === 0) {
      container.innerHTML = '<p>No items available from Xûr right now.</p>';
      return;
    }

    const grouped = groupByCategory(items);
    createTabs(container, grouped);

  } catch (err) {
    console.error('Error loading Xûr inventory:', err);
    container.innerHTML = `<p class="error">Error loading Xûr inventory data.</p>`;
  }
}

function groupByCategory(items) {
  const groups = {
    Weapons: [],
    Armor: [],
    Catalysts: [],
    Other: []
  };

  for (const item of items) {
    const name = (item.type || '').toLowerCase();
    if (name.includes('weapon')) groups.Weapons.push(item);
    else if (name.includes('armor') || name.includes('helmet') || name.includes('gauntlet') || name.includes('greaves') || name.includes('plate') || name.includes('cloak'))
      groups.Armor.push(item);
    else if (name.includes('catalyst')) groups.Catalysts.push(item);
    else groups.Other.push(item);
  }

  return groups;
}

function createTabs(container, grouped) {
  const tabBar = document.createElement('div');
  tabBar.classList.add('xur-tabs');

  const tabs = Object.keys(grouped).filter(category => grouped[category].length > 0);

  tabs.forEach((tabName, index) => {
    const tab = document.createElement('button');
    tab.textContent = tabName;
    tab.classList.add('xur-tab');
    if (index === 0) tab.classList.add('active');
    tab.addEventListener('click', () => showCategory(container, grouped, tabName, tabBar));
    tabBar.appendChild(tab);
  });

  container.appendChild(tabBar);

  const grid = document.createElement('div');
  grid.classList.add('xur-grid');
  container.appendChild(grid);

  showCategory(container, grouped, tabs[0], tabBar);
}

function showCategory(container, grouped, category, tabBar) {
  tabBar.querySelectorAll('.xur-tab').forEach(tab => {
    tab.classList.toggle('active', tab.textContent === category);
  });

  const grid = container.querySelector('.xur-grid');
  grid.innerHTML = '';

  const items = grouped[category];
  for (const item of items) {
    const card = document.createElement('div');
    card.classList.add('xur-item');

    const img = document.createElement('img');
    img.src = item.icon.startsWith('http') ? item.icon : `https://www.bungie.net${item.icon}`;
    img.alt = item.name;

    const name = document.createElement('h3');
    name.textContent = item.name;

    const type = document.createElement('p');
    type.classList.add('xur-type');
    type.textContent = item.type || '';

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(type);
    grid.appendChild(card);
  }
}

document.addEventListener('DOMContentLoaded', loadXurInventory);
