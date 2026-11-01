import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts", "scripts/ci/*.test.mjs", "tests/static/*.test.ts"],
  },
});
