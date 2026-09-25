import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI runners have 2 vCPUs, so the default (half the cores) runs one test at
  // a time. The specs mostly wait on the remote Supabase project rather than
  // burn CPU, so a few workers overlap that waiting.
  workers: process.env.CI ? 3 : undefined,
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /firefox-auth\.spec\.ts/,
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testMatch: /firefox-auth\.spec\.ts/,
    },
  ],
  webServer: {
    // CI builds before this step, so serve that build: no per-route dev
    // compilation eating into assertion timeouts. Locally, reuse `next dev`.
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
