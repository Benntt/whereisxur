import fs from "fs";

const inputPath = "./data/xur-inventory.json";
const outputPath = "./data/xur_inventory_filtered.json";

try {
  const raw = fs.readFileSync(inputPath, "utf8");
  const data = JSON.parse(raw);

  const items = [];

  if (data.armor) {
    for (const [className, pieces] of Object.entries(data.armor)) {
      pieces.forEach(name => {
        items.push({ name, type: `Armor (${className})` });
      });
    }
  }

  if (data.catalysts) {
    data.catalysts.forEach(name => {
      items.push({ name, type: "Catalyst" });
    });
  }

  if (data.exotics) {
    data.exotics.forEach(name => {
      items.push({ name, type: "Exotic Weapon" });
    });
  }

  if (data.legendaries) {
    data.legendaries.forEach(name => {
      items.push({ name, type: "Legendary Weapon" });
    });
  }

  if (data.materials) {
    data.materials.forEach(name => {
      items.push({ name, type: "Material" });
    });
  }

  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
  console.log(`✅ Filtered and flattened ${items.length} Xûr items`);
} catch (err) {
  console.error("❌ Failed to filter Xûr items:", err);
}
