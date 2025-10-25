import fetch from "node-fetch";

const client_id = process.env.BUNGIE_CLIENT_ID;
const client_secret = process.env.BUNGIE_CLIENT_SECRET;
const redirect_uri = process.env.BUNGIE_REDIRECT_URI;

const code = process.argv[2];
if (!code) {
  console.error("Usage: node src/get_refresh_token.js <AUTH_CODE>");
  process.exit(1);
}

const params = new URLSearchParams();
params.append("grant_type", "authorization_code");
params.append("code", code);
params.append("client_id", client_id);
params.append("client_secret", client_secret);
params.append("redirect_uri", redirect_uri);

fetch("https://www.bungie.net/Platform/App/OAuth/Token/", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: params
})
  .then(res => res.json())
  .then(data => {
    console.log("Response from Bungie:");
    console.log(data);
    if (data.access_token && data.refresh_token) {
      console.log("\nACCESS_TOKEN:", data.access_token);
      console.log("REFRESH_TOKEN:", data.refresh_token);
    } else {
      console.error("\nSomething went wrong. Check the response above.");
    }
  })
  .catch(err => console.error("Error fetching token:", err));
