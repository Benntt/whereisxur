async function fetchInventory() {
  const container = document.getElementById("inventory-output");
  if (!container) return;

  try {
    // Fetch inventory
    const invRes = await fetch("data/xur-inventory.json", { cache: "no-store" });
    const inventory = await invRes.json();

    // Fetch image database
    const imgRes = await fetch("data/item-images.json", { cache: "no-store" });
    const imageDB = await imgRes.json();

    const timestamp = new Date(inventory.timestamp).toLocaleString();
    let html = `<p class="loot-note">Last updated: ${timestamp}</p>`;

    const renderItem = name => {
      const imgPath = imageDB[name] || "assets/placeholder.png";
      return `
        <div class="item-card">
          <img src="${imgPath}" alt="${name}" class="item-img">
          <span class="item-name">${name}</span>
        </div>
      `;
    };

    const renderSection = (title, items) => {
      if (!items || !items.length) return "";
      return `
        <h3>${title}</h3>
        <div class="item-grid">
          ${items.map(renderItem).join("")}
        </div>
      `;
    };

    html += renderSection("Exotic Weapons", inventory.exoticWeapons);
    html += renderSection("Legendary Weapons", inventory.legendaryWeapons);
    html += renderSection("Catalysts", inventory.catalysts);

    if (inventory.armor) {
      html += `<h3>Armor</h3>`;
      for (const [cls, items] of Object.entries(inventory.armor)) {
        html += renderSection(cls.charAt(0).toUpperCase() + cls.slice(1), items);
      }
    }

    container.innerHTML = html;
  } catch (err) {
    console.error("Failed to load Xûr data:", err);
    container.innerHTML = "<p>Unable to load Xûr’s inventory right now.</p>";
  }
}


function updateCountdown() {
  const countdown = document.getElementById("countdown-timer");
  const statusContainer = document.getElementById("xur-status");
  if (!countdown || !statusContainer) return;

  const excuses = [
    "Consulting the Nine about poor sales.",
    "Got lost in the Ahamkara bones again.",
    "Arguing with Drifter about who’s more mysterious.",
    "Hiding from Guardians who dismantled Telesto... again.",
    "Trading Strange Coins for fashion advice from Rahool.",
    "Trying to decode why people keep calling him 'tentacle face.'",
    "Recharging his willpower after another weekend in the Tower.",
    "Negotiating with the Nine for a better dental plan."
  ];

  // -------- helpers --------
  function nextDayTime(dayUTC, hourUTC) {
    const now = new Date();
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUTC, 0, 0, 0));
    const currentDay = now.getUTCDay();
    let diff = (dayUTC - currentDay + 7) % 7;
    if (diff === 0 && now.getUTCHours() >= hourUTC) diff = 7;
    target.setUTCDate(now.getUTCDate() + diff);
    return target;
  }

  function prevDayTime(dayUTC, hourUTC) {
    const now = new Date();
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUTC, 0, 0, 0));
    const currentDay = now.getUTCDay();
    let diff = (currentDay - dayUTC + 7) % 7;
    if (diff === 0 && now.getUTCHours() < hourUTC) diff = 7;
    target.setUTCDate(now.getUTCDate() - diff);
    return target;
  }

  function getCurrentCycleTimes() {
    // open = last Friday 17 UTC, close = next Tuesday 17 UTC
    const open = prevDayTime(5, 17);   // Friday
    const close = nextDayTime(2, 17);  // Tuesday
    return { open, close };
  }

  function getOrAssignExcuse() {
    const used = JSON.parse(localStorage.getItem("usedExcuses") || "[]");
    let current = localStorage.getItem("currentExcuse");
    const all = excuses;

    if (used.length >= all.length) localStorage.setItem("usedExcuses", JSON.stringify([]));

    const lastCycle = localStorage.getItem("lastCycle");
    const nowCycle = getCycleKey();

    if (lastCycle !== nowCycle || !current) {
      const available = all.filter(e => !used.includes(e));
      current = available[Math.floor(Math.random() * available.length)];
      used.push(current);
      localStorage.setItem("usedExcuses", JSON.stringify(used));
      localStorage.setItem("currentExcuse", current);
      localStorage.setItem("lastCycle", nowCycle);
    }
    return current;
  }

  function getCycleKey() {
    const now = new Date();
    const friday = prevDayTime(5, 17);
    return `${friday.getUTCFullYear()}-${friday.getUTCMonth()}-${friday.getUTCDate()}`;
  }

  // -------- main loop --------
  function refresh() {
    const now = new Date();
    const { open, close } = getCurrentCycleTimes();
    const isHere = now >= open && now < close;

    const diff = isHere ? close - now : open - now;
    const label = isHere ? "LEAVES IN" : "ARRIVES IN";

    const total = Math.max(0, Math.floor(diff / 1000));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    countdown.textContent = `${label}: ${d}d ${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;

    if (isHere) {
      statusContainer.innerHTML = `<p class="status-online">🟢 Xûr is currently at the <strong>Tower Bazaar</strong>.</p>`;
    } else {
      const excuse = getOrAssignExcuse();
      statusContainer.innerHTML = `<p class="status-offline">🔴 Xûr has left. ${excuse}</p>`;
    }
  }

  refresh();
  setInterval(refresh, 1000);
}

function setLiveIndicator() {
  const dot = document.getElementById("live-indicator");
  const label = document.querySelector(".stream-label");
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const eastern = new Date(utc + 3600000 * -4);
  const day = eastern.getDay();
  const hour = eastern.getHours();
  const isLive = (day >= 1 && day <= 4 && hour >= 7 && hour < 10) || (day === 5 && hour >= 7 && hour < 18);

  dot.style.display = isLive ? "inline-block" : "none";
  label.classList.toggle("live-glow", isLive);
}

function startAutoRefresh() {
  setInterval(fetchInventory, 300000); // 5 min
}

document.addEventListener("DOMContentLoaded", () => {
  fetchInventory();
  updateCountdown();
  setLiveIndicator();
  startAutoRefresh();
});
