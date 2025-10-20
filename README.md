# Where Is Xûr — static rebuild

This repository contains a fresh, self-hostable front-end for [WhereIsXur.com](https://whereisxur.com). It ships as a
static site that can be deployed to GitHub Pages (or any CDN) and pulls live Destiny 2 vendor data directly from the
Bungie Platform API.

## Features

- Live countdowns for Xûr’s arrival, departure, and the weekly reset (all in UTC)
- Automatic detection of Xûr’s current landing zone using manifest data
- Inventory cards with item names, descriptions, and currency costs
- Works with either a direct Bungie API key or a secure proxy/worker endpoint

## Getting started

1. Clone the repository and install a basic static file server (optional but recommended):

   ```bash
   git clone https://github.com/your-user/whereisxur.git
   cd whereisxur
   npm install --global serve # or use any static HTTP server
   ```

2. Copy `assets/config.example.js` to `assets/config.js` and fill in either a Bungie API key or a proxy URL that injects
   the key server-side.

   ```bash
   cp assets/config.example.js assets/config.js
   # Then edit assets/config.js
   ```

3. Launch a local dev server and open the site in your browser:

   ```bash
   serve .
   ```

The page will automatically contact Bungie’s API to populate the status banner, location card, and inventory grid.

## Deploying to GitHub Pages

1. Push the repository to GitHub.
2. In the repo settings enable **Pages** and choose the `main` branch with the `/` (root) folder.
3. Update `assets/config.js` with either a public-safe proxy URL or a limited-scope API key before publishing. (Do not
   commit private keys to version control.)

## Troubleshooting

- **CORS / API key errors** – If you see a red error banner, ensure your Bungie key is allowed for the domain or that
  your proxy forwards the correct headers.
- **Missing images or names** – Manifest lookups rely on Bungie’s CDN. Verify that the CDN is reachable from your host.
- **Want different locales?** – Set `manifestLanguage` in `assets/config.js` to `fr`, `de`, `ja`, etc. Bungie supports a
  wide range of language codes.

## License

All Bungie assets remain their property. The code in this repository is available under the MIT license.
