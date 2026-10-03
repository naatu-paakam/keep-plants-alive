# Keep Your Plants Alive — QA Report

**Last updated:** 2026-10-03  
**Status:** All automated tests pass. Manual API tests verified via Playwright browser session.

---

## Automated Tests (Playwright — `npx playwright test`)

Run against Vite dev server on port 5180. No API credentials required.

| TC | Description | Result |
|---|---|---|
| TC-001 | Home page loads, title = "Keep Your Plants Alive", CTA button visible | PASS |
| TC-002 | CTA button navigates to /diagnose | PASS |
| TC-003 | File input has `accept="image/*"` and `capture="environment"` | PASS |
| TC-004 | Selecting a file shows image preview | PASS |
| TC-005 | Analyze Plant button present and enabled after file selection | PASS |
| TC-006 | Analyze Plant button NOT visible before file selection | PASS |
| TC-007 | No API secrets (sk-ant-, aaadpaq, re_..., VITE_ANTHROPIC_API_KEY) in page HTML | PASS |
| TC-008 | Feedback widget not visible before analysis | PASS |
| TC-009 | Selecting new file replaces filename shown | PASS |
| TC-010 | Home page shows Watering, Protection, Monitoring stat cards | PASS |

---

## Manual Tests (require `npm run netlify:dev` + real credentials)

Run against netlify dev on port 8888. Credentials in `.env.local` (gitignored).

| TC | Description | Result |
|---|---|---|
| TC-M01 | Uploading a real plant photo returns valid JSON with health_score, status, issues, urgency, recommended_tools | PASS (verified 2026-10-03) |
| TC-M02 | Non-plant image (logo/illustration) shows amber "No plant detected" warning in Recommended Tools | PASS (verified with NaatuPaakam logo) |
| TC-M03 | Healthy plant (score 8+, no issues) shows green "looks great" message | PASS (test fixture returned 10/10) |
| TC-M04 | After analysis, Analyze Plant button is hidden; result + feedback widget appear | PASS |
| TC-M05 | "Was this diagnosis helpful?" expands inline feedback form | PASS |
| TC-M06 | Submitting feedback sends email via Resend; "Thank you — feedback sent!" confirmation shown | PASS (email received) |
| TC-M07 | Email arrives from keep-plants-alive@naatupaakam.com with plant photo as attachment | PASS (2026-10-03) |
| TC-M08 | "Try another photo" resets page to clean upload state | PASS |

---

## Architecture Verified

| Component | Detail |
|---|---|
| Claude API | Via Vertex AI (GCP project `aaadpaq-acn-caledonia`, location `us-east5`) |
| Auth | GCP service account — key in `.env.local` / Netlify dashboard env var only |
| Proxy function | `netlify/functions/claude-proxy.js` — server-side key, never in browser bundle |
| Feedback email | `netlify/functions/send-feedback.js` → Resend → `keep-plants-alive@naatupaakam.com` |
| Photo delivery | Email attachment (not inline base64 — Gmail strips data: URIs) |
| Port | Vite dev: 5180 / netlify dev proxy: 8888 |
| Brand name | "Keep Your Plants Alive" (fixed from "Keep Your Plants Live") |

---

## Known Limitations

1. **Automated tests don't cover API flows** — Playwright spec runs against Vite only (no function runtime). TC-M01 through TC-M08 require manual runs with `netlify dev`.
2. **Blank/minimal JPEG returns parse error** — the test fixture (`test-plant.jpg`, 332 bytes) is not a real plant image. Claude returns unstructured text → "Could not read diagnosis response." This is correct behaviour; use a real photo.
3. **Double score card in dev screenshots** — React StrictMode + Playwright screenshot timing can show mid-render state. DOM inspection confirms single render; not reproducible in production build.

---

## Running Tests

```bash
# Automated (UI only — no credentials needed)
npx playwright test

# Interactive mode
npx playwright test --ui

# Manual E2E (requires .env.local with credentials)
npm run netlify:dev          # start server at http://localhost:8888
# then open browser and test TC-M01 through TC-M08 manually
```

---

## Pre-push Security Gate

Run before every `git push`:

```bash
# Scan source files only (not .md docs — those contain grep patterns, not real secrets)
# Must all return CLEAN

grep -rE "sk-ant-[a-zA-Z]{20,}|AKIA[A-Z0-9]{16}|BEGIN PRIVATE KEY" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" \
  --include="*.toml" --include="*.html" --include="*.example" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.netlify -l .

grep -r "pavan\|bijjala\|pbijjala\|/Users/" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --include="*.html" --include="*.toml" --include="*.example" \
  --exclude-dir=node_modules --exclude-dir=dist -l .
```
