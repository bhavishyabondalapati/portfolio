import { defineConfig, devices } from "@playwright/test";

// The click test runs against the built site (the `out` folder) served locally, or against any address you give
// it:  BASE_URL=https://your-site.vercel.app npm run test:e2e
const BASE_URL = process.env.BASE_URL;
const LOCAL = "http://localhost:4173";

export default defineConfig({
  testDir: "e2e",
  timeout: 600_000,
  retries: 0,
  workers: 1, // Boston draws a 3D scene; two at once starve each other and cause false failures
  reporter: [["list"]],
  use: { baseURL: BASE_URL ?? LOCAL, trace: "retain-on-failure", actionTimeout: 8000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: BASE_URL
    ? undefined
    : {
        command: "npx serve@14.2.5 out -l 4173 -n",
        url: LOCAL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
