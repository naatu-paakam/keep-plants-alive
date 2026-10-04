import type { DiagnosisResponse } from "../types/diagnosis";

const DIAGNOSIS_PROMPT = `
You are a plant health expert. Analyze this photo of a plant and respond ONLY with a valid JSON object — no markdown, no explanation, just the JSON.

{
  "health_score": <integer 1-10, where 10 is perfectly healthy>,
  "status": "<one short phrase describing the plant's condition>",
  "issues": ["<issue 1>", "<issue 2>"],
  "likely_cause": "<plain-language explanation of what is causing the problem>",
  "home_remedies": ["<simple home remedy 1>", "<simple home remedy 2>"],
  "recommended_tools": ["<tool category 1>", "<tool category 2>"],
  "urgency": "<low|medium|high>"
}

For home_remedies, suggest 2–4 simple, practical treatments using household items. Examples of the style:
- "Sprinkle crushed eggshells around the base to add calcium and deter pests"
- "Mix 1 tsp baking soda in 1 litre of water and spray on leaves for fungal spots"
- "Add a thin layer of used coffee grounds to the soil surface for nitrogen"
- "Spray diluted neem oil (5 drops per 500ml water) to tackle pests or mildew"
- "Water with cooled, unsalted rice water once a week for gentle nutrients"
- "Sprinkle cinnamon powder on the soil surface to prevent fungal growth"
- "Place a few crushed garlic cloves near the base to deter insects"
- "Wipe yellowing leaves with a cloth dipped in diluted milk (1:9 ratio) for fungal control"
- "Add a pinch of Epsom salt to water once a month to boost magnesium"
- "Place fresh ginger slices on the soil surface — its antifungal compounds help root health"

Match remedies to the specific issues found. If the plant looks healthy, return an empty array for home_remedies.
If the image is not a plant, return empty arrays for both home_remedies and recommended_tools.

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

export interface LocationContext {
  latitude: number;
  longitude: number;
}

export async function analyzePlant(
  imageFile: File,
  location?: LocationContext
): Promise<DiagnosisResponse> {
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
        ...(location && { latitude: location.latitude, longitude: location.longitude }),
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
