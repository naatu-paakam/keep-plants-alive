import type { DiagnosisResponse } from "../types/diagnosis";

const DIAGNOSIS_PROMPT = `
You are a plant health expert. Analyze this photo of a plant and respond ONLY with a valid JSON object — no markdown, no explanation, just the JSON.

{
  "health_score": <integer 1-10, where 10 is perfectly healthy>,
  "status": "<one short phrase describing the plant's condition>",
  "issues": ["<issue 1>", "<issue 2>"],
  "likely_cause": "<plain-language explanation of what is causing the problem>",
  "recommended_tools": ["<tool category 1>", "<tool category 2>"],
  "urgency": "<low|medium|high>"
}

For recommended_tools, use terms from this list when applicable:
watering, overwatering, drainage, moisture, sensor, frost, protection, timer, irrigation, fertilizer, nutrition, germination, seedling.

If the plant looks healthy, return health_score 8–10, empty issues array, and empty recommended_tools.
`;

function parseClaudeDiagnosis(text: string): DiagnosisResponse {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```(?:json)?\n?/g, "").trim();
  return JSON.parse(cleaned) as DiagnosisResponse;
}

function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // dataUrl format: data:<mediaType>;base64,<data>
      const [header, data] = dataUrl.split(",");
      const mediaType = header.split(":")[1].split(";")[0] || "image/jpeg";
      resolve({ base64: data, mediaType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function analyzePlant(imageFile: File): Promise<DiagnosisResponse> {
  const { base64, mediaType } = await fileToBase64(imageFile);

  let response: Response;
  try {
    response = await fetch("/.netlify/functions/claude-proxy", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: DIAGNOSIS_PROMPT,
              },
            ],
          },
        ],
      }),
    });
  } catch {
    throw new Error("Could not reach the diagnosis service. Check your connection and try again.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Diagnosis failed (${response.status}). Try again.`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>;
  };

  const textContent = data.content.find((c) => c.type === "text");
  if (!textContent) {
    throw new Error("Could not read diagnosis response. Try a clearer photo.");
  }

  try {
    return parseClaudeDiagnosis(textContent.text);
  } catch {
    throw new Error("Could not read diagnosis response. Try a clearer photo.");
  }
}
