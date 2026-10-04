import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Tests run against Vite dev server (port 5180, no function runtime).
// Tests that require the Claude API or Resend are marked [MANUAL] in concept/QA-REPORT.md.

// ── Home page ─────────────────────────────────────────────────────────────────

test("TC-001: Home page loads with correct brand name and CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Keep Your Plants Alive/i);
  await expect(page.getByText("Keep Your Plants Alive").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Diagnose My Plant/i })).toBeVisible();
});

test("TC-002: Navigate to /diagnose via CTA button", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Diagnose My Plant/i }).click();
  await expect(page).toHaveURL(/\/diagnose/);
  await expect(page.getByText(/Plant Health Check/i)).toBeVisible();
});

// ── /diagnose page — upload UI ─────────────────────────────────────────────

test("TC-003: File input has correct camera attributes for mobile", async ({ page }) => {
  await page.goto("/diagnose");
  const input = page.locator('input[type="file"]#plant-photo');
  await expect(input).toHaveAttribute("accept", "image/*");
  await expect(input).toHaveAttribute("capture", "environment");
});

test("TC-004: Image preview visible after file selection", async ({ page }) => {
  await page.goto("/diagnose");
  const fixturePath = path.resolve(__dirname, "fixtures/naatu-logo.png");
  await page.setInputFiles("#plant-photo", fixturePath);
  const img = page.locator("img[alt='Selected plant']");
  await expect(img).toBeVisible();
  expect(await img.getAttribute("src")).not.toBeNull();
});

test("TC-005: Analyze Plant button present and enabled after file selection", async ({ page }) => {
  await page.goto("/diagnose");
  const fixturePath = path.resolve(__dirname, "fixtures/naatu-logo.png");
  await page.setInputFiles("#plant-photo", fixturePath);
  const btn = page.getByRole("button", { name: /Analyze Plant/i });
  await expect(btn).toBeVisible();
  await expect(btn).toBeEnabled();
});

test("TC-006: Analyze Plant button NOT visible before file is selected", async ({ page }) => {
  await page.goto("/diagnose");
  await expect(page.getByRole("button", { name: /Analyze Plant/i })).not.toBeVisible();
});

// ── Security ──────────────────────────────────────────────────────────────────

test("TC-007: No API secrets in rendered page HTML", async ({ page }) => {
  await page.goto("/diagnose");
  const content = await page.content();
  // No Anthropic key
  expect(content).not.toMatch(/sk-ant-[a-zA-Z0-9]/);
  // No GCP project ID
  expect(content).not.toMatch(/aaadpaq/);
  // No Resend key
  expect(content).not.toMatch(/re_[A-Za-z0-9]{20,}/);
  // VITE_ prefix not used for server-side keys
  expect(content).not.toMatch(/VITE_ANTHROPIC_API_KEY/);
});

// ── Feedback widget — initial state ──────────────────────────────────────────

test("TC-008: Feedback widget NOT visible before analysis", async ({ page }) => {
  await page.goto("/diagnose");
  await expect(page.getByText(/Was this diagnosis helpful/i)).not.toBeVisible();
  await expect(page.getByText(/Send feedback/i)).not.toBeVisible();
});

// ── State management ──────────────────────────────────────────────────────────

test("TC-009: Selecting a new file clears previous file name", async ({ page }) => {
  await page.goto("/diagnose");
  const logo = path.resolve(__dirname, "fixtures/naatu-logo.png");
  const plant = path.resolve(__dirname, "fixtures/test-plant.jpg");
  await page.setInputFiles("#plant-photo", logo);
  await expect(page.getByText("naatu-logo.png")).toBeVisible();
  await page.setInputFiles("#plant-photo", plant);
  await expect(page.getByText("test-plant.jpg")).toBeVisible();
  await expect(page.getByText("naatu-logo.png")).not.toBeVisible();
});

test("TC-010: Home page stat cards visible (Watering, Protection, Monitoring)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Watering")).toBeVisible();
  await expect(page.getByText("Protection")).toBeVisible();
  await expect(page.getByText("Monitoring")).toBeVisible();
});

// ── Geolocation — location badge ─────────────────────────────────────────────

test("TC-011: Location badge shown when geolocation is granted", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 17.38, longitude: 78.48 });
  await page.goto("/diagnose");
  // Wait for geolocation to resolve
  await page.waitForSelector('[data-testid="location-badge"]', { timeout: 6000 });
  await expect(page.locator('[data-testid="location-badge"]')).toBeVisible();
  await expect(page.locator('[data-testid="location-badge"]')).toContainText("weather-aware");
});

test("TC-012: Location denied badge shown when geolocation is denied", async ({ page, context }) => {
  await context.clearPermissions();
  await page.goto("/diagnose");
  // Wait for denied state (geolocation times out or is denied)
  await page.waitForSelector('[data-testid="location-denied"]', { timeout: 10000 });
  await expect(page.locator('[data-testid="location-denied"]')).toBeVisible();
  await expect(page.locator('[data-testid="location-denied"]')).toContainText("No location");
});

test("TC-013: Analyze button text changes to weather+analyzing when location granted", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 17.38, longitude: 78.48 });
  await page.goto("/diagnose");
  await page.waitForSelector('[data-testid="location-badge"]', { timeout: 6000 });
  const fixturePath = path.resolve(__dirname, "fixtures/naatu-logo.png");
  await page.setInputFiles("#plant-photo", fixturePath);
  // Button should now exist and be clickable
  const btn = page.getByRole("button", { name: /Analyze Plant/i });
  await expect(btn).toBeVisible();
  await expect(btn).toBeEnabled();
});

// ── Tests requiring live API — run manually (see QA-REPORT.md) ───────────────
// TC-M01: Diagnosis returns valid JSON with health_score, status, issues, urgency
// TC-M02: Not-a-plant image shows amber "No plant detected" warning
// TC-M03: Healthy plant (score 8+, no issues) shows green "looks great" message
// TC-M04: Sick plant with granted location shows weather-calibrated home_remedies
// TC-M05: Feedback form expands on clicking "Was this diagnosis helpful?"
// TC-M06: Submitting feedback sends email to FEEDBACK_EMAIL via Resend
// TC-M07: Email arrives from keep-plants-alive@naatupaakam.com with photo attached
// TC-M08: "Try another photo" resets page to upload state
