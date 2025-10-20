import { getSchedule } from "./countdown.js";

const API_BASE = "https://www.bungie.net/Platform";
const XUR_VENDOR_HASH = 2190858386;
const PUBLIC_VENDOR_COMPONENTS = "400,401,402";
const DEFINITION_CACHE = new Map();

function normaliseConfig(raw = {}) {
  return {
    bungieApiKey: raw.bungieApiKey?.trim() || "",
    proxyUrl: raw.proxyUrl?.replace(/\/$/, "") || "",
    manifestLanguage: raw.manifestLanguage || "en",
  };
}

function buildHeaders(config) {
  const headers = { "Accept": "application/json" };
  if (!config.proxyUrl && config.bungieApiKey) {
    headers["X-API-Key"] = config.bungieApiKey;
  }
  return headers;
}

function buildUrl(path, config) {
  const base = (config.proxyUrl || API_BASE).replace(/\/$/, "");
  const trimmedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(trimmedPath, `${base}/`);
  if (config.manifestLanguage && /\/Destiny2\/Manifest\//.test(trimmedPath)) {
    url.searchParams.set("lc", config.manifestLanguage);
  }
  return url.toString();
}

async function bungieFetch(path, config) {
  const response = await fetch(buildUrl(path, config), {
    headers: buildHeaders(config),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || payload.ErrorCode !== 1) {
    const message = payload?.Message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload.Response;
}

async function getDefinition(table, hash, config) {
  const key = `${table}:${hash}`;
  if (DEFINITION_CACHE.has(key)) {
    return DEFINITION_CACHE.get(key);
  }
  const result = await bungieFetch(`/Destiny2/Manifest/${table}/${hash}/`, config);
  DEFINITION_CACHE.set(key, result);
  return result;
}

async function getDefinitions(table, hashes, config) {
  const unique = Array.from(new Set(hashes.filter((hash) => typeof hash === "number" && hash > 0)));
  const entries = await Promise.all(unique.map(async (hash) => {
    try {
      const definition = await getDefinition(table, hash, config);
      return [hash, definition];
    } catch (error) {
      console.warn(`Unable to load ${table} ${hash}:`, error);
      return null;
    }
  }));
  return new Map(entries.filter(Boolean));
}

function createCostList(costs, definitions) {
  if (!costs || costs.length === 0) {
    return null;
  }
  const list = document.createElement("ul");
  list.className = "item-card__costs";
  for (const cost of costs) {
    const def = definitions.get(cost.itemHash);
    const item = document.createElement("li");
    const quantity = document.createElement("span");
    quantity.textContent = cost.quantity;
    item.appendChild(quantity);
    if (def?.displayProperties?.icon) {
      const icon = document.createElement("img");
      icon.src = `https://www.bungie.net${def.displayProperties.icon}`;
      icon.alt = def.displayProperties.name || "Currency";
      item.appendChild(icon);
    }
    const label = document.createElement("span");
    label.textContent = def?.displayProperties?.name || "Unknown cost";
    item.appendChild(label);
    list.appendChild(item);
  }
  return list;
}

function createItemCard(definition, saleItem, costDefinitions) {
  const card = document.createElement("article");
  card.className = "item-card";

  const media = document.createElement("div");
  media.className = "item-card__media";

  const icon = document.createElement("img");
  icon.className = "item-card__icon";
  icon.alt = definition.displayProperties?.name || "Destiny item";
  if (definition.displayProperties?.icon) {
    icon.src = `https://www.bungie.net${definition.displayProperties.icon}`;
  } else {
    icon.src = "https://www.bungie.net/img/theme/destiny/icons/icon_d2.png";
  }

  const meta = document.createElement("div");
  meta.className = "item-card__meta";
  const title = document.createElement("h3");
  title.className = "item-card__title";
  title.textContent = definition.displayProperties?.name || "Unknown item";

  const subtitle = document.createElement("p");
  subtitle.className = "item-card__subtitle";
  subtitle.textContent = definition.itemTypeAndTierDisplayName
    || definition.itemTypeDisplayName
    || definition.inventory?.tierTypeName
    || "";

  meta.appendChild(title);
  if (subtitle.textContent) {
    meta.appendChild(subtitle);
  }

  media.appendChild(icon);
  media.appendChild(meta);
  card.appendChild(media);

  if (definition.displayProperties?.description) {
    const description = document.createElement("p");
    description.className = "item-card__description";
    description.textContent = definition.displayProperties.description;
    card.appendChild(description);
  }

  const costList = createCostList(saleItem.costs, costDefinitions);
  if (costList) {
    card.appendChild(costList);
  }

  return card;
}

function formatUtcDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }) + " UTC";
}

async function renderLocation(vendorData, vendorDefinition, config, container) {
  if (!container) {
    return;
  }
  container.setAttribute("aria-busy", "true");

  try {
    const fullVendorDefinition = vendorDefinition
      || await getDefinition("DestinyVendorDefinition", XUR_VENDOR_HASH, config);
    const locationIndex = vendorData?.vendorLocationIndex ?? 0;
    const location = fullVendorDefinition.locations?.[locationIndex];
    let destinationName = "";
    let placeName = "";
    if (location?.destinationHash) {
      const destination = await getDefinition("DestinyDestinationDefinition", location.destinationHash, config);
      destinationName = destination.displayProperties?.name || "";
      if (destination.placeHash) {
        const place = await getDefinition("DestinyPlaceDefinition", destination.placeHash, config);
        placeName = place.displayProperties?.name || "";
      }
    }

    const body = document.createElement("div");
    body.className = "location-card__body";

    const heading = document.createElement("h2");
    heading.textContent = destinationName || "Xûr's location";
    body.appendChild(heading);

    const info = document.createElement("p");
    if (destinationName || placeName) {
      info.textContent = [destinationName, placeName].filter(Boolean).join(" — ");
    } else {
      info.textContent = "Visit the Tower Hangar, Watcher's Grave on Nessus, or the Winding Cove on the EDZ to check.";
    }
    body.appendChild(info);

    const card = document.createElement("article");
    card.className = "location-card";

    if (location?.backgroundImagePath) {
      const media = document.createElement("div");
      media.className = "location-card__media";
      media.style.backgroundImage = `url(https://www.bungie.net${location.backgroundImagePath})`;
      card.appendChild(media);
    }

    card.appendChild(body);

    container.innerHTML = "";
    container.appendChild(card);
  } catch (error) {
    console.warn("Unable to resolve Xûr location", error);
    container.innerHTML = `
      <article class="location-card location-card--placeholder">
        <div class="location-card__body">
          <h2>Location unavailable</h2>
          <p>We couldn’t look up the landing zone. Check the Tower Hangar, EDZ Winding Cove, or Nessus Watcher’s Grave.</p>
        </div>
      </article>`;
  } finally {
    container.setAttribute("aria-busy", "false");
  }
}

function createInventorySection(title, description, items) {
  const section = document.createElement("section");
  section.className = "inventory__section";

  if (title) {
    const heading = document.createElement("h2");
    heading.className = "inventory__heading";
    heading.textContent = title;
    section.appendChild(heading);
  }

  if (description) {
    const meta = document.createElement("p");
    meta.className = "inventory__meta";
    meta.textContent = description;
    section.appendChild(meta);
  }

  const grid = document.createElement("div");
  grid.className = "inventory__grid";
  for (const item of items) {
    grid.appendChild(item);
  }
  section.appendChild(grid);

  return section;
}

function orderForCategory(category, fallback) {
  if (!category) {
    return fallback;
  }
  if (typeof category.order === "number") {
    return category.order;
  }
  if (typeof category.index === "number") {
    return category.index;
  }
  return fallback;
}

function groupSaleItems(saleItems, vendorDefinition) {
  const grouped = new Map();
  const itemList = vendorDefinition?.itemList || [];
  const displayCategories = vendorDefinition?.displayCategories || [];

  for (const saleItem of saleItems) {
    const vendorIndex = saleItem.vendorItemIndex ?? -1;
    const vendorItem = itemList[vendorIndex];
    const displayCategoryIndex = saleItem.displayCategoryIndex
      ?? vendorItem?.displayCategoryIndex;
    const category = Number.isInteger(displayCategoryIndex)
      ? displayCategories[displayCategoryIndex]
      : undefined;
    const key = category?.displayCategoryIdentifier
      || category?.displayCategoryName
      || (Number.isInteger(displayCategoryIndex)
        ? `category-${displayCategoryIndex}`
        : `vendor-${vendorIndex}`);
    const entry = grouped.get(key) || {
      key,
      title: category?.displayCategoryName || "Featured Inventory",
      description: category?.displayCategoryDescription || "",
      order: orderForCategory(
        category,
        Number.isInteger(displayCategoryIndex) ? displayCategoryIndex : vendorIndex,
      ),
      items: [],
    };
    entry.items.push(saleItem);
    grouped.set(key, entry);
  }

  return Array.from(grouped.values()).sort((a, b) => a.order - b.order);
}

function updateStatus(statusEl, stateClass, message, metaText) {
  statusEl.className = `status${stateClass ? ` ${stateClass}` : ""}`;
  statusEl.innerHTML = "";

  const messageEl = document.createElement("span");
  messageEl.className = "status__message";
  messageEl.textContent = message;
  statusEl.appendChild(messageEl);

  if (metaText) {
    const metaEl = document.createElement("span");
    metaEl.className = "status__meta";
    metaEl.textContent = metaText;
    statusEl.appendChild(metaEl);
  }
}

export async function loadInventory(rawConfig = {}) {
  const config = normaliseConfig(rawConfig);
  const statusEl = document.getElementById("status");
  const gridEl = document.getElementById("inventory");
  const locationEl = document.getElementById("location");

  if (!statusEl || !gridEl) {
    return;
  }

  updateStatus(statusEl, "", "Contacting Bungie…");
  gridEl.innerHTML = "";
  gridEl.setAttribute("aria-busy", "true");

  try {
    const data = await bungieFetch(`/Destiny2/PublicVendors/?components=${PUBLIC_VENDOR_COMPONENTS}`, config);
    const vendorSales = data.sales?.data?.[XUR_VENDOR_HASH];
    const vendorInfo = data.vendors?.data?.[XUR_VENDOR_HASH];

    if (!vendorSales || !vendorInfo) {
      updateStatus(
        statusEl,
        "status--offline",
        "Xûr is not currently in the Solar System.",
        "Check back Friday at reset.",
      );
      if (locationEl) {
        locationEl.innerHTML = `
          <article class="location-card location-card--placeholder">
            <div class="location-card__body">
              <h2>Xûr has departed</h2>
              <p>We’ll update this panel with the correct landing zone the moment he returns on Friday.</p>
            </div>
          </article>`;
        locationEl.setAttribute("aria-busy", "false");
      }
      return;
    }

    const schedule = getSchedule();
    const message = schedule.isActive
      ? "Xûr is here! Inventory refreshed every weekend."
      : "Preparing Xûr’s next visit. Here’s the most recent inventory.";
    const departureText = formatUtcDate(schedule.nextDeparture);
    const arrivalText = formatUtcDate(schedule.nextArrival);
    const metaText = schedule.isActive
      ? (departureText ? `Leaves ${departureText}` : "")
      : (arrivalText ? `Arrives ${arrivalText}` : "");
    updateStatus(
      statusEl,
      schedule.isActive ? "status--online" : "status--offline",
      message,
      metaText,
    );

    const vendorDefinition = await getDefinition("DestinyVendorDefinition", XUR_VENDOR_HASH, config);

    await renderLocation(vendorInfo, vendorDefinition, config, locationEl);

    const saleItems = Object.values(vendorSales.saleItems || {});
    saleItems.sort((a, b) => a.vendorItemIndex - b.vendorItemIndex);

    const itemDefinitions = await getDefinitions(
      "DestinyInventoryItemDefinition",
      saleItems.map((item) => item.itemHash),
      config,
    );

    const costDefinitions = await getDefinitions(
      "DestinyInventoryItemDefinition",
      saleItems.flatMap((item) => item.costs?.map((cost) => cost.itemHash) || []),
      config,
    );

    gridEl.innerHTML = "";
    if (saleItems.length === 0) {
      gridEl.innerHTML = "<p>We couldn’t find any sale items for Xûr this week.</p>";
      return;
    }

    const groupedItems = groupSaleItems(saleItems, vendorDefinition);
    const cardsByGroup = groupedItems.map((group) => {
      const renderedItems = [];
      for (const item of group.items) {
        const definition = itemDefinitions.get(item.itemHash);
        if (!definition) {
          continue;
        }
        renderedItems.push(createItemCard(definition, item, costDefinitions));
      }
      return { ...group, renderedItems };
    }).filter((group) => group.renderedItems.length > 0);

    if (cardsByGroup.length === 0) {
      gridEl.innerHTML = "<p>We couldn’t find any sale items for Xûr this week.</p>";
      return;
    }

    for (const group of cardsByGroup) {
      const section = createInventorySection(group.title, group.description, group.renderedItems);
      gridEl.appendChild(section);
    }
  } catch (error) {
    console.error(error);
    updateStatus(statusEl, "status--error", `Unable to load Xûr data: ${error.message}`);
    gridEl.innerHTML = "";
  } finally {
    gridEl.setAttribute("aria-busy", "false");
  }
}
