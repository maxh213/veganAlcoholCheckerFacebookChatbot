const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.js", "**/*.test.ts", "**/*.test.mjs", "qa/**/*.test.js", "qa/**/*.test.ts", "qa/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      include: ["index.js", "app.ts"],
      exclude: ["node_modules/**", "slimProducts.js", "**/*.test.*", "qa/**"],
    },
  },
});
