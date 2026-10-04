/**
 * Generic Claude API proxy — NaatuPaakam shared pattern
 *
 * Supports two auth modes (auto-detected from env vars):
 *   1. Vertex AI  — uses GOOGLE_SERVICE_ACCOUNT_JSON (JSON string, for Netlify prod)
 *                   or GOOGLE_APPLICATION_CREDENTIALS (local file path, for local dev)
 *   2. Direct API — uses ANTHROPIC_API_KEY
 *
 * No external npm dependencies — Vertex AI JWT auth uses Node.js built-in crypto.
 *
 * Required env vars (set in .env.local locally, Netlify dashboard in prod):
 *   Vertex AI mode:  GOOGLE_SERVICE_ACCOUNT_JSON=<json string>
 *                    VERTEX_PROJECT_ID=your-gcp-project-id
 *                    VERTEX_LOCATION=us-east5  (optional, defaults to us-east5)
 *   Direct API mode: ANTHROPIC_API_KEY=sk-ant-...
 */

import crypto from "crypto";
import fs from "fs";

async function fetchWeatherContext(latitude, longitude) {
  try {
    // 1. Fetch 21 days of weather from Open-Meteo (free, no API key)
    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.searchParams.set("latitude", latitude);
    weatherUrl.searchParams.set("longitude", longitude);
    weatherUrl.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,weather_code");
    weatherUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max");
    weatherUrl.searchParams.set("past_days", "21");
    weatherUrl.searchParams.set("forecast_days", "1");
    weatherUrl.searchParams.set("timezone", "auto");

    const [weatherResp, geoResp] = await Promise.all([
      fetch(weatherUrl.toString()),
      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
        { headers: { "User-Agent": "KeepYourPlantsAlive/1.0 (plantslife.netlify.app)" } }
      ),
    ]);

    const weather = await weatherResp.json();
    const geo = geoResp.ok ? await geoResp.json() : null;

    // Build location label
    const city = geo?.address?.city || geo?.address?.town || geo?.address?.village || null;
    const country = geo?.address?.country || null;
    const locationLabel = city && country
      ? `${city}, ${country} (${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E)`
      : `${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`;

    // Summarise daily data
    const daily = weather.daily || {};
    const maxTemps = daily.temperature_2m_max || [];
    const minTemps = daily.temperature_2m_min || [];
    const precip = daily.precipitation_sum || [];
    const humidity = daily.relative_humidity_2m_max || [];

    const totalRain = precip.reduce((s, v) => s + (v || 0), 0).toFixed(1);
    const rainyDays = precip.filter(v => v > 0.5).length;
    const avgHigh = maxTemps.length ? (maxTemps.reduce((s, v) => s + v, 0) / maxTemps.length).toFixed(1) : "?";
    const avgLow = minTemps.length ? (minTemps.reduce((s, v) => s + v, 0) / minTemps.length).toFixed(1) : "?";
    const avgHumidity = humidity.length ? (humidity.reduce((s, v) => s + v, 0) / humidity.length).toFixed(0) : "?";

    const current = weather.current || {};
    const currentTemp = current.temperature_2m ?? "?";
    const currentHumidity = current.relative_humidity_2m ?? "?";
    const currentRain = current.precipitation ?? 0;

    return `LOCATION & WEATHER CONTEXT (use this to calibrate your diagnosis and home remedies):
Location: ${locationLabel}
Current conditions: ${currentTemp}°C, ${currentHumidity}% humidity, ${currentRain}mm rain today
Past 21 days:
  - Total rainfall: ${totalRain}mm (${rainyDays} rainy day${rainyDays !== 1 ? "s" : ""} out of 21)
  - Avg high / low temp: ${avgHigh}°C / ${avgLow}°C
  - Average max humidity: ${avgHumidity}%

Use this context to:
- Adjust drought/overwatering likelihood based on recent rainfall
- Flag heat stress if temperatures are extreme
- Warn about frost risk if overnight lows are near 0°C
- Calibrate fungal/mould risk against humidity levels
- Suggest location-appropriate home remedies (e.g. shade cloth in extreme heat, frost fleece in cold snaps)

`;
  } catch (err) {
    console.warn("Weather fetch failed, proceeding without context:", err.message);
    return "";
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function loadServiceAccount() {
  // Prod: full JSON content as env var string
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }
  // Local dev: path to JSON file
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const content = fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8");
    return JSON.parse(content);
  }
  return null;
}

async function getVertexToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${header}.${body}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(serviceAccount.private_key, "base64url");
  const jwt = `${signingInput}.${signature}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Token exchange failed (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  return data.access_token;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  if (!requestBody.model || !requestBody.messages) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Request body must include model and messages" }),
    };
  }

  // Inject weather context into the last user text message if location provided
  let enrichedBody = requestBody;
  if (requestBody.latitude != null && requestBody.longitude != null) {
    const weatherContext = await fetchWeatherContext(requestBody.latitude, requestBody.longitude);
    if (weatherContext) {
      const { latitude, longitude, ...rest } = requestBody;
      const messages = rest.messages.map((msg, i) => {
        if (i !== rest.messages.length - 1) return msg;
        // Prepend weather context to the last user message's text content
        const content = Array.isArray(msg.content)
          ? msg.content.map(block =>
              block.type === "text"
                ? { ...block, text: weatherContext + block.text }
                : block
            )
          : msg.content;
        return { ...msg, content };
      });
      enrichedBody = { ...rest, messages };
    } else {
      const { latitude, longitude, ...rest } = requestBody;
      enrichedBody = rest;
    }
  }

  let claudeResponse;

  try {
    const serviceAccount = loadServiceAccount();

    if (serviceAccount) {
      // ── Vertex AI mode ──────────────────────────────────────────────────────
      const projectId = process.env.VERTEX_PROJECT_ID || serviceAccount.project_id;
      const location = process.env.VERTEX_LOCATION || "us-east5";

      const token = await getVertexToken(serviceAccount);
      const { model, ...rest } = enrichedBody;
      const vertexBody = { ...rest, anthropic_version: "vertex-2023-10-16" };
      const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/anthropic/models/${model}:rawPredict`;

      claudeResponse = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(vertexBody),
      });
    } else {
      // ── Direct Anthropic API mode ────────────────────────────────────────────
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error("No credentials configured: set GOOGLE_SERVICE_ACCOUNT_JSON or ANTHROPIC_API_KEY");
        return {
          statusCode: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Server config error: no API credentials configured" }),
        };
      }

      claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(enrichedBody),
      });
    }
  } catch (err) {
    console.error("Failed to reach Claude API:", err.message);
    return {
      statusCode: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Could not reach Claude API: ${err.message}` }),
    };
  }

  const responseText = await claudeResponse.text();
  return {
    statusCode: claudeResponse.status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: responseText,
  };
};
