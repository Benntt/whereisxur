document.addEventListener("DOMContentLoaded", () => {
  const preview = document.getElementById("preview-json");
  const generateBtn = document.getElementById("generate");

  // ---------------- CATEGORIES ----------------
  const lists = {
    hunterArmor: [
      "The Dragon’s Shadow",
      "Celestial Nighthawk",
      "Foetracer",
      "Raiden Flux",
      "Lucky Raspberry",
      "Wormhusk Crown",
      "Relativism (Hunter Class Item)"
    ],
    titanArmor: [
      "Heart of Inmost Light",
      "Synthoceps",
      "Crest of Alpha Lupi",
      "Actium War Rig",
      "One-Eyed Mask",
      "Ursa Furiosa",
      "Stoicism (Titan Class Item)"
    ],
    warlockArmor: [
      "Lunafaction Boots",
      "Karnstein Armlets",
      "Ophidian Aspect",
      "Transversive Steps",
      "Nezarec’s Sin",
      "Skull of Dire Ahamkara",
      "Solipsism (Warlock Class Item)"
    ],
    exoticWeapons: [
      "Hawkmoon",
      "Crimson",
      "Telesto",
      "Graviton Lance",
      "Tractor Cannon",
      "The Queenbreaker",
      "Coldheart",
      "Sweet Business",
      "Arbalest"
    ],
    legendaryWeapons: [
      "IKELOS_SMG_v1.0.3",
      "IKELOS_SR_v1.0.3",
      "Dire Promise",
      "Main Ingredient",
      "Funnelweb",
      "Distant Tumulus",
      "Seventh Seraph Carbine",
      "Judgment of Kelgorath",
      "Heritage",
      "Prolonged Engagement",
      "Volta Bray II",
      "Legal Action II"
    ],
    catalysts: [
      "Telesto Catalyst",
      "Graviton Lance Catalyst",
      "Crimson Catalyst",
      "Tractor Cannon Catalyst",
      "Arbalest Catalyst",
      "Sweet Business Catalyst",
      "Coldheart Catalyst"
    ]
  };

  // ---------------- BUILD CHECKBOXES ----------------
  for (const [id, items] of Object.entries(lists)) {
    const container = document.getElementById(id);
    if (!container) continue;
    items.forEach(item => {
      const label = document.createElement("label");
      label.style.display = "block";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = item;
      input.name = id;
      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + item));
      container.appendChild(label);
    });
  }

  // ---------------- COLLECT DATA ----------------
  function collectSelections() {
    const data = {
      armor: {
        hunter: getChecked("hunterArmor"),
        titan: getChecked("titanArmor"),
        warlock: getChecked("warlockArmor")
      },
      catalysts: getChecked("catalysts").slice(0, 2),
      exoticWeapons: limitWeapons(getChecked("exoticWeapons"), 4),
      legendaryWeapons: getChecked("legendaryWeapons").slice(0, 9),
      timestamp: new Date().toISOString()
    };
    return data;
  }

  function getChecked(name) {
    return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
  }

  function limitWeapons(list, limit) {
    // ensure Hawkmoon is always present for exotic weapons
    if (!list.includes("Hawkmoon")) list.unshift("Hawkmoon");
    return list.slice(0, limit);
  }

  // ---------------- UPDATE PREVIEW ----------------
  document.addEventListener("change", () => {
    preview.textContent = JSON.stringify(collectSelections(), null, 2);
  });

  // ---------------- DOWNLOAD JSON ----------------
  generateBtn.addEventListener("click", () => {
    const json = JSON.stringify(collectSelections(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "xur-inventory.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  // Initialize preview
  preview.textContent = JSON.stringify(collectSelections(), null, 2);
});
