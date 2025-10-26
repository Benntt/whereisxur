export default {
  async fetch(request, env, ctx) {
    const API_KEY = env.BUNGIE_API_KEY;
    const VENDOR_HASH = 2190858386; // Xûr’s vendor hash
    const BUNGIE_API = "https://www.bungie.net/Platform";

    try {
      // Fetch vendor data (components 400 = sales, 401 = item components)
      const vendorRes = await fetch(
        `${BUNGIE_API}/Destiny2/Vendors/?components=400,401,402`,
        {
          headers: {
            "X-API-Key": API_KEY,
            "Accept": "application/json"
          }
        }
      );

      const vendorData = await vendorRes.json();
      if (!vendorData || vendorData.ErrorCode !== 1) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch Xûr vendor data" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      const xurSales = vendorData.Response.sales.data[VENDOR_HASH];
      const xurVendor = vendorData.Response.vendors.data[VENDOR_HASH];

      if (!xurSales || !xurVendor) {
        return new Response(
          JSON.stringify({ message: "Xûr is not currently available." }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Extract item hashes
      const itemHashes = Object.values(xurSales.saleItems).map(
        (item) => item.itemHash
      );

      // Fetch item definitions in parallel
      const definitions = await Promise.all(
        itemHashes.map(async (hash) => {
          const defRes = await fetch(
            `${BUNGIE_API}/Destiny2/Manifest/DestinyInventoryItemDefinition/${hash}/`,
            { headers: { "X-API-Key": API_KEY } }
          );
          const defData = await defRes.json();
          return defData.Response || null;
        })
      );

      // Build simplified JSON response
      const inventory = definitions
        .filter(Boolean)
        .map((def) => ({
          name: def.displayProperties?.name || "Unknown Item",
          description: def.displayProperties?.description || "",
          icon: def.displayProperties?.icon
            ? `https://www.bungie.net${def.displayProperties.icon}`
            : null,
          type:
            def.itemTypeAndTierDisplayName ||
            def.itemTypeDisplayName ||
            def.inventory?.tierTypeName ||
            "Item"
        }));

      return new Response(JSON.stringify(inventory, null, 2), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
};
