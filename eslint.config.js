export default [
  { ignores: ["node_modules/**", "slimProducts.js", "reports/**", "coverage/**", ".marestail/**"] },
  {
    files: ["index.js", "**/*.test.js", "**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
    rules: {
      complexity: ["error", 4],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
