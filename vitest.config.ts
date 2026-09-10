import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 15000,
    deps: {
      interopDefault: true,
    },
    include: ["**/*.test.js", "**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["index.ts"],
      exclude: ["node_modules/**", "**/*.test.*"],
    },
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
});
