export default [
  { ignores: ["node_modules/**", "slimProducts.js", "reports/**", ".marestail/**", "coverage/**"] },
  {
    files: ["index.js", "**/*.test.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "commonjs",
    },
    rules: {
      complexity: ["error", 4],
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
    rules: {
      complexity: ["error", 4],
    },
  },
];
