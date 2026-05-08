// ESLint v9 flat config for Terraclima.
//
// Several rules use severity "warn", but `npm run lint` passes `--max-warnings 0`
// (see package.json), so **any warning fails CI** — treat warns like errors when fixing issues.
//
// jsx-a11y rules remain mapped to "warn" so `recommended` presets stay readable in config,
// but the warning budget is zero in practice.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "*.tsbuildinfo",
      "public/**",
      "coverage/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Mapped to warn for parity with jsx-a11y recommended; CI still fails on any warning.
      ...Object.fromEntries(
        Object.entries(jsxA11y.configs.recommended.rules ?? {}).map(([k, v]) => [
          k,
          Array.isArray(v) ? ["warn", ...v.slice(1)] : "warn",
        ]),
      ),
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      // Prefer fixing escapes; CI fails while this warning exists (`--max-warnings 0`).
      "no-useless-escape": "warn",
    },
  },
  {
    files: ["scripts/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-useless-escape": "warn",
    },
  },
);
