import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.js", "qa/**/*.test.js", "qa/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["index.ts"],
      exclude: ["node_modules/**", "slimProducts.js", "**/*.test.*", "qa/**", "**/lcov-report/**"],
      reporter: ["json"],
    },
  },
});
