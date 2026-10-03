import { defineConfig } from "@playwright/test";

// UI tests run against the Vite dev server (port 5180, no function runtime).
// To test the Claude proxy and feedback email end-to-end, run `npm run netlify:dev`
// and point baseURL to http://localhost:8888 manually.

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:5180",
    headless: true,
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5180",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
