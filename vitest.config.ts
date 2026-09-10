import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.js", "**/*.test.ts", "qa/**/*.test.js", "qa/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["index.ts"],
      exclude: ["node_modules/**", "slimProducts.cjs", "**/*.test.*", "qa/**"],
    },
  },
});
