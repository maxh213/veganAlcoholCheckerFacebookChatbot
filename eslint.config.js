export default [
  { ignores: ["node_modules/**", "slimProducts.js", "reports/**", ".marestail/**", "coverage/**"] },
  {
    files: ["index.ts", "index.test.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parser: (await import("@typescript-eslint/parser")).default,
    },
    rules: {
      complexity: ["error", 4],
    },
  },
];