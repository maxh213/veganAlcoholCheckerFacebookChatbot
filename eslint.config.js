export default [
  { ignores: ["node_modules/**", "slimProducts.js", "reports/**"] },
  {
    files: ["index.js", "**/*.test.js", "**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "commonjs",
    },
    rules: {
      complexity: ["error", 4],
    },
  },
];
