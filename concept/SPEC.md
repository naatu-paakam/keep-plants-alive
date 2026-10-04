# Keep Your Plants Alive — Plant Health Diagnosis Feature Spec

**Version:** 1.0 — MVP  
**Author:** Product Architect Agent  
**Date:** 2026-10-03  
**Status:** Developer-ready — build from this directly.

---

## 1. MVP Feature List

This iteration ships a standalone web app at `/diagnose` that lets a user photograph their plant and get an instant AI-powered health diagnosis with product recommendations from the Keep Your Plants Alive catalog.

**In scope:**

1. Home page (`/`) — hero, tagline, single CTA to `/diagnose`
2. Diagnose page (`/diagnose`) — camera/file upload, image preview, "Analyze Plant" trigger
3. Claude vision API call — sends base64 image + weather context, receives structured JSON diagnosis
4. Diagnosis result display — health score, status, issues, likely cause, urgency
5. Home remedies — 2–4 household treatments matched to the plant's specific issues (shown before commercial tools)
6. Product recommendation cards — maps Claude's `recommended_tools` to top-10 SKUs with affiliate/store links
7. Location-aware weather context — optional browser geolocation + Open-Meteo weather (3 weeks) injected into Claude prompt
8. Feedback widget — inline form that emails diagnosis + photo to store owner via Resend
9. Error states — no file, API failure, not a plant, geolocation denied
10. Playwright test suite — TC-001 through TC-013 covering all critical paths

**Out of scope (deferred to R2):**

- User accounts or saved diagnoses
- Shopify or real checkout integration
- Push notifications or PWA install prompt
- Multiple plant submissions in one session

---

## 1b. Location-Aware Weather Context — Design

### Overview

When a user taps "Analyze Plant", the app optionally requests their device location. If granted, the Netlify Function fetches 3 weeks of real weather data from Open-Meteo before calling Claude. This weather context is injected into the Claude prompt so the diagnosis and home remedies are calibrated to actual local conditions.

### Data Flow

```
Browser
 1. User uploads plant photo
 2. Browser requests Geolocation permission (one-time prompt)
 3. If granted: sends { image, latitude, longitude } to claude-proxy
 4. If denied:  sends { image } only — diagnosis works without location

Netlify Function (claude-proxy.js)
 5. If location present:
    a. Fetch Open-Meteo API (free, no API key):
       GET https://api.open-meteo.com/v1/forecast
         ?latitude=X&longitude=Y
         &current=temperature_2m,relative_humidity_2m,precipitation,weather_code
         &daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max
         &past_days=21&forecast_days=1&timezone=auto
    b. Fetch reverse geocoding (Nominatim / OpenStreetMap, free, no key):
       GET https://nominatim.openstreetmap.org/reverse
         ?lat=X&lon=Y&format=json&accept-language=en
    c. Summarise into a weather context string
 6. Build enriched Claude prompt with weather context prepended
 7. Call Vertex AI Claude with image + enriched prompt

Claude
 8. Diagnoses plant with full environmental context
 9. Returns: health_score, status, issues, likely_cause,
             home_remedies (location-aware), recommended_tools, urgency
```

### Weather Context String Format (injected into Claude prompt)

```
LOCATION & WEATHER CONTEXT (use this to calibrate your diagnosis):
Location: Hyderabad, Telangana, India (17.38°N, 78.48°E)
Current conditions: 34°C, 78% humidity, 0mm rain today
Past 21 days:
  - Total rainfall: 12mm (very dry)
  - Avg high / low temp: 41°C / 28°C
  - Average humidity: 65%
  - Rainy days: 3 of 21

Use this context to:
- Adjust drought/overwatering likelihood based on recent rainfall
- Flag heat stress if temps are extreme
- Warn about frost if overnight lows are near 0°C
- Calibrate fungal/mould risk against humidity levels
- Suggest location-appropriate home remedies
```

### Open-Meteo API

- **URL:** `https://api.open-meteo.com/v1/forecast`
- **Cost:** Completely free, no API key required, generous rate limits
- **Data:** Current conditions + daily summaries up to 92 days back
- **Parameters used:** `past_days=21`, `current`, `daily`, `timezone=auto`

### Reverse Geocoding (city name from lat/lng)

- **URL:** `https://nominatim.openstreetmap.org/reverse`
- **Cost:** Free (OpenStreetMap), requires `User-Agent` header with app name
- **Fallback:** If geocoding fails, use raw coordinates (`17.38°N, 78.48°E`)

### UI — Location Permission Flow

```
Before analysis:
  [📍 Using your location for better diagnosis]   ← shows if permission granted
  [⚠ No location — diagnosis without weather context] ← shows if denied/unavailable

On Diagnose page load:
  - Navigator.geolocation.getCurrentPosition() called automatically
  - 5s timeout — if no response, proceed without location
  - Permission denial is graceful — diagnosis still works
```

### Privacy

- Coordinates are sent to our Netlify Function only, never stored
- The function fetches weather for those coordinates and discards them
- No coordinates or weather data are logged or persisted
- User can deny location and still use the full diagnosis feature

---

## 2. User Stories

**Landing:**
- As a home gardener, I want to land on a clean page that explains the diagnosis tool so that I know within 5 seconds whether this app can help me.
- As a new plant owner, I want to see a single obvious CTA ("Diagnose My Plant") so that I do not have to figure out where to start.

**Camera / Upload:**
- As a mobile user, I want tapping the upload area to open my phone's rear camera directly so that I can photograph my plant without switching apps.
- As a desktop user, I want clicking the upload area to open a file picker so that I can select a photo from my computer.
- As any user, I want to see a preview of the photo I selected before I submit it so that I can confirm I chose the right image.

**Diagnosis:**
- As a plant owner, I want to tap "Analyze Plant" and see a loading indicator so that I know the app is working and I do not tap again.
- As a plant owner, I want to receive a health score (1–10), a status label, a list of issues, and an urgency rating so that I understand my plant's condition at a glance.
- As a plant owner, I want to see the likely cause of the problem stated in plain language so that I can act on it without Googling further.

**Product Recommendations:**
- As a plant owner, I want to see 1–3 product recommendations matched to my diagnosis so that I can buy the right tool immediately.
- As a shopper, I want each recommended product to show its name, the problem it solves, and a link to purchase so that I can complete the action in one tap.

**Error handling:**
- As a user who forgot to select an image, I want a clear inline message telling me to choose a photo so that I am not confused by a silent failure.
- As a developer running the app without a key, I want a visible banner saying the API key is missing so that misconfiguration is obvious immediately.

---

## 3. Tech Stack & Architecture

### Stack

Matches pkeep's pattern exactly:

| Layer | Technology |
|---|---|
| Build tool | Vite 7.x |
| Framework | React 18 + TypeScript (strict) |
| Styling | Tailwind CSS 3.x |
| Icons | lucide-react |
| Routing | react-router-dom v6 |
| Package manager | pnpm |
| Testing | Playwright |
| Linting | TypeScript strict mode (noEmit typecheck) |

### Port

**5180** — next available in NaatuPaakam (5173–5179 are taken by existing projects).

### Project layout

```
keep-plants-live/
├── client/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── vite-env.d.ts
│       ├── pages/
│       │   ├── Home.tsx          # Hero, CTA
│       │   └── Diagnose.tsx      # Upload + result flow
│       ├── components/
│       │   ├── Nav.tsx           # Top nav (brand + "Shop All" link)
│       │   ├── CameraUpload.tsx  # File input + preview
│       │   ├── DiagnosisResult.tsx  # Score, issues, urgency display
│       │   └── ProductCard.tsx   # Single product recommendation tile
│       └── services/
│           └── plantDiagnosis.ts # Claude API call + JSON parsing
├── e2e/
│   └── diagnose.spec.ts          # TC-001 through TC-006
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js
├── netlify.toml
├── .env.example                  # placeholder values only — committed
├── .gitignore                    # covers .env, .env.local, .env.*.local
└── concept/
    └── SPEC.md                   # this file
```

### Routing

```
/           → Home.tsx
/diagnose   → Diagnose.tsx
```

No backend server for MVP. This is a pure SPA. The Claude API is called directly from the browser.

### Data flow

```
User selects image
  → CameraUpload.tsx (FileReader → base64 string)
  → Diagnose.tsx holds state: { imageBase64, mediaType, diagnosis, loading, error }
  → User taps "Analyze Plant"
  → plantDiagnosis.ts: fetch() → api.anthropic.com/v1/messages
  → Claude returns JSON block in text
  → parseClaudeDiagnosis() extracts JSON
  → DiagnosisResult.tsx renders score + issues
  → mapToolsToProducts() returns matching SKUs
  → ProductCard.tsx renders 1–3 cards
```

---

## 4. Security Decisions (CRITICAL)

### API key handling

- `VITE_ANTHROPIC_API_KEY` is the environment variable name. The `VITE_` prefix is required for Vite to expose the value to the browser bundle.
- The key lives in `.env.local` only — this file is **never committed** and must appear in `.gitignore`.
- `.env.example` is committed with a placeholder: `VITE_ANTHROPIC_API_KEY=your_claude_api_key_here`
- `.gitignore` must include:
  ```
  .env
  .env.local
  .env.*.local
  ```

### Pre-commit safety rule

Before every `git push`, verify with: `git grep -r "sk-ant-" .` — if any match, abort immediately. The security gate from project memory applies: block credentials from repo files and history.

### MVP vs production note

**MVP (this build):** The Claude API is called directly from the browser using `fetch()`. The `VITE_ANTHROPIC_API_KEY` ends up in the compiled JS bundle, which means a determined user can extract it from browser DevTools. This is acceptable **only for personal use or demo purposes** — the app is not public-facing with anonymous users.

**Production upgrade (R1):** Route all Claude API calls through a Netlify Function (`/api/diagnose`). The function holds the key as a Netlify environment variable (server-side, never in the bundle). The browser sends only the base64 image to the Netlify Function; the function calls Claude and returns the diagnosis JSON. No key ever reaches the client.

---

## 5. Claude API Integration Design

### Model

`claude-opus-4-5`

### Request shape

```typescript
// services/plantDiagnosis.ts

export interface DiagnosisResult {
  health_score: number;       // 1–10, where 10 = perfectly healthy
  status: string;             // e.g. "Overwatered", "Healthy", "Nutrient deficient"
  issues: string[];           // e.g. ["yellowing leaves", "soggy soil"]
  likely_cause: string;       // plain-language explanation
  recommended_tools: string[]; // e.g. ["moisture sensor", "drainage", "fertilizer"]
  urgency: "low" | "medium" | "high";
}
```

```typescript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
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
              media_type: mediaType,   // "image/jpeg" or "image/png"
              data: imageBase64,       // base64 string, no data: prefix
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
```

### Prompt

```typescript
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
```

### JSON parsing

Claude sometimes wraps JSON in a markdown code block. `parseClaudeDiagnosis()` must handle both cases:

```typescript
function parseClaudeDiagnosis(text: string): DiagnosisResult {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```(?:json)?\n?/g, "").trim();
  return JSON.parse(cleaned) as DiagnosisResult;
}
```

### Error states

| Condition | User-facing message |
|---|---|
| `VITE_ANTHROPIC_API_KEY` is empty or missing | Yellow banner: "API key not configured. Add VITE_ANTHROPIC_API_KEY to .env.local." |
| No image selected when user taps Analyze | Inline red text below input: "Please select or take a photo first." |
| `fetch()` throws (network error) | "Could not reach the diagnosis service. Check your connection." |
| HTTP 4xx/5xx from Claude API | "Diagnosis failed (API error {status}). Try again." |
| Response text contains no parseable JSON | "Could not read diagnosis response. Try a clearer photo." |

---

## 6. Camera / Upload UX

### Input element

```html
<input
  type="file"
  accept="image/*"
  capture="environment"
  id="plant-photo"
/>
```

- On iOS Safari: tapping opens native camera (rear lens, `capture="environment"`).
- On Android Chrome: tapping opens a sheet — camera or file picker.
- On desktop: opens OS file picker.

### CameraUpload.tsx behavior

1. User taps / clicks the upload zone (styled label wrapping the hidden input).
2. On file selection: `FileReader.readAsDataURL()` converts to base64.
3. Strip the `data:image/jpeg;base64,` prefix before sending to Claude — only the raw base64 string goes in the API request body.
4. Set `mediaType` from `file.type` — default to `"image/jpeg"` if type is empty.
5. Show image preview using `<img src={dataUrl} />` where `dataUrl` is the full data URL (with prefix) for display.
6. Show "Analyze Plant" button once a file is loaded. Button is disabled while `loading === true`.

### Loading state

Show a spinner (Tailwind `animate-spin` on a `Loader2` lucide icon) and disable the button. Replace button text with "Analyzing...".

### Layout — Diagnose page flow

```
[ Upload zone / Preview image ]
[ "Analyze Plant" button       ]
--- results appear below ---
[ DiagnosisResult card         ]
[ ProductCard  ProductCard     ]
```

---

## 7. Product Recommendation Mapping

`mapToolsToProducts(recommendedTools: string[]): Product[]`

Map each string from Claude's `recommended_tools` array against the keyword table below. Return unique matches, max 3 products.

| Keywords (any substring match) | Product | SKU # |
|---|---|---|
| `watering` | Ceramic watering stakes (8", 2-pack) | SKU-01 |
| `overwatering`, `drainage` | Fabric grow bags (5-gal, 5-pack) | SKU-06 |
| `moisture`, `sensor` | XLUX soil moisture meter | SKU-04 |
| `frost`, `protection` | Pop-up garden cloche (4-pack) | SKU-02 |
| `timer`, `irrigation` | Orbit 1-outlet mechanical hose timer | SKU-03 |
| `fertilizer`, `nutrition` | Jobe's fertilizer spikes (30-pack) | SKU-08 |
| `germination`, `seedling` | Seedling heat mat (10"x20") | SKU-09 |

Matching is case-insensitive substring: `recommended_tools.some(t => t.toLowerCase().includes(keyword))`.

If Claude returns no `recommended_tools` (healthy plant), render a single card: "Your plant looks great! Browse our full collection to keep it that way." with a link to the shop root.

### ProductCard.tsx props

```typescript
interface Product {
  name: string;
  problemSolved: string;
  estimatedPrice: string;    // e.g. "$14–18"
  linkUrl: string;           // affiliate or store link (placeholder "#" for MVP)
  skuId: string;             // e.g. "SKU-01"
}
```

---

## 8. Test Cases (Playwright)

File: `e2e/diagnose.spec.ts`

All tests run against `http://localhost:5180`.

| ID | Test | Assertion |
|---|---|---|
| TC-001 | Home page loads | Page title contains "Keep Your Plants Alive"; hero text is visible; a button/link with text "Diagnose My Plant" exists |
| TC-002 | Navigate to /diagnose | Clicking the CTA navigates to `/diagnose`; page contains an element with text "Analyze" or "Upload" |
| TC-003 | File input attributes | The `<input type="file">` on `/diagnose` has `accept="image/*"` and `capture="environment"` |
| TC-004 | Image preview visible after file selection | After `page.setInputFiles('#plant-photo', 'e2e/fixtures/test-plant.jpg')`, an `<img>` with non-empty src appears in the DOM |
| TC-005 | Analyze button present | On `/diagnose`, a button with text "Analyze Plant" is present and initially enabled (before loading) |
| TC-006 | No API key in rendered HTML | `page.content()` does not match `/sk-ant-[a-zA-Z0-9]/` — no Anthropic secret key string in HTML source |

Fixture file `e2e/fixtures/test-plant.jpg` — a small (~50 KB) JPEG of a green plant — must be committed alongside tests. Use a royalty-free stock image.

---

## 9. Deployment Notes

### Netlify config

`netlify.toml` committed in repo root:

```toml
[build]
  command   = "npm run build"
  publish   = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```

**Do not put `VITE_ANTHROPIC_API_KEY` in `netlify.toml` or in source.** Set it exclusively in the Netlify dashboard: Site settings → Environment variables → Add variable.

### Environment variable checklist

| Variable | Where set | Committed? |
|---|---|---|
| `VITE_ANTHROPIC_API_KEY` | `.env.local` (dev) + Netlify dashboard (prod) | Never |
| *(none others for MVP)* | — | — |

### Vite config

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 5180,
    fs: {
      allow: [".", "./client"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**"],
    },
  },
  build: {
    outDir: "dist",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
    },
  },
});
```

### Brand theme

Keep Your Plants Alive uses **green** as primary accent — suggested: `#22c55e` (Tailwind green-500). Do not use the Daycare Portal orange (`#f97316`) or one-family pink (`#F72585`). Per-project brand, never mixed.

---

## 10. Definition of Done

A feature is not done until all of the following are true:

- [ ] `npm run typecheck` passes with zero errors
- [ ] TC-001 through TC-006 pass (`npx playwright test`)
- [ ] TC-006 confirms no API key visible in rendered HTML
- [ ] `.env.local` is in `.gitignore` and not staged
- [ ] `git grep -r "sk-ant-" .` returns zero matches
- [ ] Image preview works on iOS Safari (manual test or screenshot)
- [ ] Product cards render for at least one mapped keyword
- [ ] `netlify.toml` committed; `VITE_ANTHROPIC_API_KEY` absent from it
- [ ] Impact analysis surfaced: any new route, new env var, new component type, or new test fixture has been reviewed for ripple effects

---

*End of spec. Developer agent: build from Section 3 layout, implement Section 5 integration, wire Section 7 mapping, ship Section 8 tests in the same commit.*
