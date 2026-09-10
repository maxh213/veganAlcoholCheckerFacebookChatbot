import tseslint from "@typescript-eslint/parser";

export default [
  { ignores: ["node_modules/**", "slimProducts.cjs", "reports/**", ".marestail/**"] },
  {
    files: ["index.ts", "**/*.test.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parser: tseslint,
    },
    rules: {
      complexity: ["error", 4],
    },
  },
];
