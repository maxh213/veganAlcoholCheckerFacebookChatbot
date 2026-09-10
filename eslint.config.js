import parser from "@typescript-eslint/parser";

export default [
  { ignores: ["node_modules/**", "reports/**", ".marestail/**"] },
  {
    files: ["**/*.test.js"],
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
      ecmaVersion: 2022,
      sourceType: "module",
      parser,
    },
    rules: {
      complexity: ["error", 4],
    },
  },
];
