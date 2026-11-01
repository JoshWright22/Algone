import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 45_000,
  globalTimeout: 20 * 60_000,
  workers: 1,
  reporter: "list",
  projects: [{ name: "e2e", testMatch: "e2e/*.spec.ts" }],
});
