export default {
  async fetch(request, env) {
    const apiKey = env.BUNGIE_API_KEY;
    const url = "https://www.bungie.net/Platform/Destiny2/Vendors/?components=400,401,402";

    try {
      const response = await fetch(url, {
        headers: { "X-API-Key": apiKey },
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch from Bungie: ${response.status}` }),
          { status: response.status, headers: { "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
