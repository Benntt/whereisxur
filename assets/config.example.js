window.XUR_CONFIG = {
  /**
   * Bungie API key used for direct Platform requests. Keep this private! For production builds, route traffic through
   * a serverless proxy (for example, a Cloudflare Worker) so the key is never shipped to browsers.
   */
  bungieApiKey: "",

  /**
   * Optional HTTPS endpoint that proxies Bungie requests (and adds the API key server-side). When provided, the client
   * will omit the X-API-Key header entirely.
   *
   * Example: "https://your-worker-subdomain.workers.dev/api"
   */
  proxyUrl: "",

  /**
   * Localisation language code for manifest lookups. Bungie supports locales such as "en", "fr", "de", "ja", etc.
   */
  manifestLanguage: "en",
};
