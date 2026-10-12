
require("dotenv").config();

let accessToken = null;
let tokenExpiresAt = 0;
let apiDomain = process.env.ZOHO_API_DOMAIN || "";

// Check configuration without exposing secret values.
function isZohoConfigured() {
  return Boolean(
    process.env.ZOHO_CLIENT_ID &&
    process.env.ZOHO_CLIENT_SECRET &&
    process.env.ZOHO_REFRESH_TOKEN &&
    process.env.ZOHO_ACCOUNTS_URL
  );
}

// Obtain or refresh the OAuth access token.
async function getAccessToken() {
  if (!isZohoConfigured()) {
    throw new Error("Zoho API credentials are not configured.");
  }

  // Reuse the current token until shortly before expiry.
  if (accessToken && Date.now() < tokenExpiresAt - 60000) {
    return accessToken;
  }

  const accountsUrl = process.env.ZOHO_ACCOUNTS_URL.replace(/\/+$/, "");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    refresh_token: process.env.ZOHO_REFRESH_TOKEN
  });

  const response = await fetch(`${accountsUrl}/oauth/v2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const result = await response.json();

  if (!response.ok || !result.access_token) {
    // Do not log credentials or the full token response.
    throw new Error(
      `Zoho token request failed (HTTP ${response.status}). Check OAuth configuration.`
    );
  }

  accessToken = result.access_token;
  tokenExpiresAt = Date.now() +
    (Number(result.expires_in) || 3600) * 1000;

  // Prefer the API domain supplied by Zoho's OAuth response.
  if (result.api_domain) {
    apiDomain = result.api_domain.replace(/\/+$/, "");
  }

  return accessToken;
}

// Call a Zoho People API endpoint.
// The exact endpoint and required scopes must be confirmed
// from the documentation for the data you are authorized to access.
async function zohoRequest(endpoint, options = {}) {
  const token = await getAccessToken();

  if (!apiDomain) {
    throw new Error(
      "Zoho API domain is missing. Configure it using the authorized Zoho API domain."
    );
  }

  // Accept relative API paths only; never send the token to an arbitrary URL.
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("/") ||
    endpoint.startsWith("//") ||
    endpoint.includes("://")
  ) {
    throw new Error("A relative Zoho API endpoint is required.");
  }

  const response = await fetch(`${apiDomain}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Zoho-oauthtoken ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(
      `Zoho API request failed (HTTP ${response.status}).`
    );
  }

  return response.json();
}

module.exports = {
  isZohoConfigured,
  getAccessToken,
  zohoRequest
};
