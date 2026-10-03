/**
 * Generic Claude API proxy — NaatuPaakam shared pattern
 *
 * Supports two auth modes (auto-detected from env vars):
 *   1. Vertex AI  — uses GOOGLE_APPLICATION_CREDENTIALS (local file path) or
 *                   GOOGLE_SERVICE_ACCOUNT_JSON (JSON string, for Netlify prod)
 *   2. Direct API — uses ANTHROPIC_API_KEY
 *
 * Browser calls /.netlify/functions/claude-proxy with a Claude Messages API body.
 * The key/token is added server-side — never reaches the browser bundle.
 *
 * Copy this file into any NaatuPaakam project's netlify/functions/ directory.
 *
 * Required env vars (set in .env.local locally, Netlify dashboard in prod):
 *   Vertex AI mode:  GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json  (local)
 *                    GOOGLE_SERVICE_ACCOUNT_JSON=<json string>           (prod)
 *                    VERTEX_PROJECT_ID=your-gcp-project-id
 *                    VERTEX_LOCATION=us-east5  (optional, defaults to us-east5)
 *   Direct API mode: ANTHROPIC_API_KEY=sk-ant-...
 */

import { GoogleAuth } from "google-auth-library";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function getVertexToken() {
  // Prod: JSON content stored as env var string
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    return tokenResponse.token;
  }

  // Local: GOOGLE_APPLICATION_CREDENTIALS points to a JSON file path
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token;
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

  const useVertexAI =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  let claudeResponse;

  try {
    if (useVertexAI) {
      // ── Vertex AI mode ──────────────────────────────────────────────────────
      const projectId = process.env.VERTEX_PROJECT_ID;
      const location = process.env.VERTEX_LOCATION || "us-east5";

      if (!projectId) {
        console.error("VERTEX_PROJECT_ID is not set");
        return {
          statusCode: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Server config error: missing VERTEX_PROJECT_ID" }),
        };
      }

      const token = await getVertexToken();
      const { model, ...rest } = requestBody;
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
        console.error("Neither Vertex AI credentials nor ANTHROPIC_API_KEY are set");
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
        body: JSON.stringify(requestBody),
      });
    }
  } catch (err) {
    console.error("Failed to reach Claude API:", err);
    return {
      statusCode: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Could not reach Claude API" }),
    };
  }

  const responseText = await claudeResponse.text();
  return {
    statusCode: claudeResponse.status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: responseText,
  };
};
