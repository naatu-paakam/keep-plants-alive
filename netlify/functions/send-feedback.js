/**
 * Feedback mailer — NaatuPaakam / keep-plants-live
 *
 * Receives plant diagnosis feedback from the browser and emails it.
 * Uses Resend (resend.com — free tier: 3,000 emails/month).
 *
 * Required env vars (set in .env.local locally, Netlify dashboard in prod):
 *   RESEND_API_KEY   — from resend.com → API Keys
 *   FEEDBACK_EMAIL   — destination address (never hardcode, set in env)
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.FEEDBACK_EMAIL;

  if (!apiKey || !toEmail) {
    console.error("Missing RESEND_API_KEY or FEEDBACK_EMAIL env vars");
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Email service not configured" }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const { feedback, analysis, imageBase64, imageName, imageType } = payload;

  // Note: data: URIs are stripped by Gmail — send image as attachment instead
  const imageSection = imageBase64
    ? `<p style="color:#374151">📎 Plant photo attached as <strong>${imageName || "plant-photo"}</strong></p>`
    : `<p style="color:#6b7280;font-style:italic">No image attached</p>`;

  const analysisSection = analysis
    ? `
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 8px;background:#f0fdf4;font-weight:600;width:140px">Health Score</td><td style="padding:6px 8px">${analysis.health_score}/10</td></tr>
        <tr><td style="padding:6px 8px;background:#f0fdf4;font-weight:600">Status</td><td style="padding:6px 8px">${analysis.status}</td></tr>
        <tr><td style="padding:6px 8px;background:#f0fdf4;font-weight:600">Urgency</td><td style="padding:6px 8px">${analysis.urgency}</td></tr>
        <tr><td style="padding:6px 8px;background:#f0fdf4;font-weight:600">Likely Cause</td><td style="padding:6px 8px">${analysis.likely_cause}</td></tr>
        ${analysis.issues?.length ? `<tr><td style="padding:6px 8px;background:#f0fdf4;font-weight:600">Issues</td><td style="padding:6px 8px">${analysis.issues.join(", ")}</td></tr>` : ""}
        ${analysis.recommended_tools?.length ? `<tr><td style="padding:6px 8px;background:#f0fdf4;font-weight:600">Tools</td><td style="padding:6px 8px">${analysis.recommended_tools.join(", ")}</td></tr>` : ""}
      </table>`
    : `<p style="color:#6b7280;font-style:italic">No analysis data</p>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
      <h2 style="color:#16a34a;border-bottom:2px solid #dcfce7;padding-bottom:8px">🌿 Plant Diagnosis Feedback</h2>

      <h3 style="color:#374151">User Feedback</h3>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;font-size:15px;line-height:1.6">
        ${feedback ? feedback.replace(/\n/g, "<br>") : "<em>No text provided</em>"}
      </div>

      <h3 style="color:#374151;margin-top:24px">Plant Photo</h3>
      ${imageSection}

      <h3 style="color:#374151;margin-top:24px">AI Diagnosis</h3>
      ${analysisSection}

      <p style="color:#9ca3af;font-size:12px;margin-top:32px;border-top:1px solid #f3f4f6;padding-top:12px">
        Sent from Keep Your Plants Live · keepplantsalive.com
      </p>
    </body>
    </html>`;

  let resendResponse;
  try {
    resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "keep-plants-alive@naatupaakam.com",
        to: [toEmail],
        subject: `Plant Diagnosis Feedback — ${analysis?.status ?? "No analysis"}`,
        html,
        ...(imageBase64 && {
          attachments: [{
            filename: imageName || "plant-photo.jpg",
            content: imageBase64,
          }],
        }),
      }),
    });
  } catch (err) {
    console.error("Resend fetch failed:", err);
    return {
      statusCode: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Email service unreachable" }),
    };
  }

  if (!resendResponse.ok) {
    const body = await resendResponse.text();
    console.error("Resend error:", resendResponse.status, body);
    return {
      statusCode: resendResponse.status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to send email" }),
    };
  }

  return {
    statusCode: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  };
};
