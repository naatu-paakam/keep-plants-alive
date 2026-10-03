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

  let claudeResponse;

  try {
    const serviceAccount = loadServiceAccount();

    if (serviceAccount) {
      // ── Vertex AI mode ──────────────────────────────────────────────────────
      const projectId = process.env.VERTEX_PROJECT_ID || serviceAccount.project_id;
      const location = process.env.VERTEX_LOCATION || "us-east5";

      const token = await getVertexToken(serviceAccount);
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
        body: JSON.stringify(requestBody),
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
