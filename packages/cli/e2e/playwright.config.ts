import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "scaffold.e2e.ts",
  timeout: 60_000,
  use: {
    browserName: "chromium",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
