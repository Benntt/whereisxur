// One-time helper to print a refresh token to the console.
// Run locally:  node src/oauth_get_refresh_token.js
// You will paste CLIENT_ID and CLIENT_SECRET in env vars before running.
//
// Steps:
// 1) Open the printed authorize URL in a browser, sign in, approve.
// 2) You will be redirected to your Redirect URL with ?code=....
// 3) Paste the code here when prompted; this script exchanges it for tokens.
// 4) Copy REFRESH_TOKEN from the output; save it as a GitHub Secret later.

import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fetch from "node-fetch";

const CLIENT_ID = process.env.BUNGIE_CLIENT_ID;
const CLIENT_SECRET = process.env.BUNGIE_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set BUNGIE_CLIENT_ID and BUNGIE_CLIENT_SECRET in your environment.");
  process.exit(1);
}

// Use the Redirect URL you configured in Bungie app settings.
const REDIRECT_URI = process.env.BUNGIE_REDIRECT_URI || "https://localhost/blank";

const AUTH_URL = `https://www.bungie.net/en/OAuth/Authorize?client_id=${encodeURIComponent(
  CLIENT_ID
)}&response_type=code&state=whereisxur`;

console.log("Open this URL in a browser and authorize:");
console.log(AUTH_URL);
console.log("");

const rl = readline.createInterface({ input, output });
const code = await rl.question("Paste the 'code' param from the redirect URL here: ");
await rl.close();

const tokenRes = await fetch("https://www.bungie.net/platform/app/oauth/token/", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    code: code.trim()
  })
});

if (!tokenRes.ok) {
  const msg = await tokenRes.text();
  console.error("Token exchange failed:", tokenRes.status, msg);
  process.exit(1);
}

const tokens = await tokenRes.json();

console.log("\nSuccess. Save these securely.\n");
console.log("ACCESS_TOKEN:", tokens.access_token);
console.log("EXPIRES_IN_SECONDS:", tokens.expires_in);
console.log("REFRESH_TOKEN:", tokens.refresh_token);
console.log("REFRESH_EXPIRES_IN_SECONDS:", tokens.refresh_expires_in);
console.log("\nUse REFRESH_TOKEN as a GitHub Secret named BUNGIE_REFRESH_TOKEN.");
