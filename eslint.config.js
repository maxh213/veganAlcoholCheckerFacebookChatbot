export default [
  { ignores: ["node_modules/**", "slimProducts.js", "reports/**", ".marestail/**"] },
  {
    files: ["index.js", "**/*.test.js", "**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
    rules: {
      complexity: ["error", 4],
    },
  },
];
