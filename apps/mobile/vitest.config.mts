import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const pkg = (p: string) => resolve(import.meta.dirname, "../../packages", p);

export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    alias: [
      { find: /^@algone\/engine\/(.+)$/, replacement: pkg("engine/src/$1.ts") },
      { find: "@algone/engine", replacement: pkg("engine/src/index.ts") },
      { find: "@algone/core", replacement: pkg("core/src/index.ts") },
      { find: "@algone/rules", replacement: pkg("rules/src/index.ts") },
    ],
  },
  test: { include: ["test/**/*.test.ts"] },
});
