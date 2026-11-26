import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. They start their own API (port 4100) and client (port 3002), on a separate
 * database called nn_e2e, so they never touch the dev servers on 4000 and 3001 or the
 * NeighborNexus database. Set E2E_MONGO_URI to point at a different MongoDB.
 *
 *   npx playwright install chromium   (once)
 *   npm run test:e2e
 */
export const E2E = {
  api: "http://localhost:4100",
  web: "http://localhost:3002",
  mongo: process.env.E2E_MONGO_URI || "mongodb://127.0.0.1:27017/nn_e2e",
};

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  // Generous, because a busy laptop sometimes stalls a page for about 25 seconds. A real regression
  // still fails; the same tests pass in about 2 seconds when the machine is quiet.
  expect: { timeout: 15_000 },
  // The tests share one seeded database and some build on each other, so they run in order.
  fullyParallel: false,
  workers: 1,
  // One retry, locally too. A retried pass is reported as "flaky", so it stays visible.
  retries: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: E2E.web, trace: "retain-on-failure" },
  webServer: [
    {
      command: "node server/server.js",
      url: `${E2E.api}/health`,
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        MONGO_URI: E2E.mongo,
        JWT_SECRET: "e2e-secret",
        PORT: "4100",
        CORS_ORIGIN: E2E.web,
        REMINDERS: "off",
        LOG_LEVEL: "warn",
      },
    },
    {
      command: "npm --prefix client run dev -- --port 3002 --strictPort",
      url: E2E.web,
      timeout: 60_000,
      reuseExistingServer: false,
      env: { VITE_API_BASE_URL: `${E2E.api}/api` },
    },
  ],
  // The same tests run in each engine: Chromium (Chrome and Edge), Firefox and WebKit (Safari).
  // Run one at a time, because they share a seeded database:  npx playwright test --project=firefox
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // WebKit runs roughly three times slower here (software rendering), so it gets longer per test.
    { name: "webkit", timeout: 120_000, use: { ...devices["Desktop Safari"] } },
  ],
});
