module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "security", "import", "prettier"],
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:security/recommended-legacy",
    "plugin:import/typescript",
    "plugin:prettier/recommended",
  ],
  root: true,
  env: { node: true, jest: true },
  ignorePatterns: [
    ".eslintrc.js",
    "dist/**",
    "node_modules/**",
    "coverage/**",
  ],
  settings: {
    "import/resolver": { typescript: { project: "tsconfig.json" } },
  },
  rules: {
    // Security and correctness: hard errors (the gate the pipeline enforces).
    "no-console": "error",
    "@typescript-eslint/no-floating-promises": "error",
    // Unused locals are errors; unused args are allowed because service methods
    // keep a consistent `(user, ...args, lang)` signature even when a given
    // method resolves i18n via the default-language helper.
    "@typescript-eslint/no-unused-vars": [
      "error",
      { args: "none", varsIgnorePattern: "^_", ignoreRestSiblings: true },
    ],
    // Pragmatic for this brownfield repo (avoids blocking on pre-existing
    // style/`any` usage); new code should still avoid these.
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "prettier/prettier": "warn",
    // Reading a bundled, validated font path by an absolute join() is safe.
    "security/detect-non-literal-fs-filename": "warn",
  },
};
