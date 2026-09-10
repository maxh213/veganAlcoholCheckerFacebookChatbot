export default [
  { ignores: ["node_modules/**", "slimProducts.js", "reports/**"] },
  {
    files: ["index.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "commonjs",
    },
    rules: {
      complexity: ["error", 4],
    },
  },
  {
    files: ["qa/**/*.test.js", "qa/**/*.test.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
    rules: {
      complexity: ["error", 4],
    },
  },
];
