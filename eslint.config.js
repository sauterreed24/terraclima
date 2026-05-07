// Flat config (ESLint v9). Strict-but-friendly preset for the existing
// codebase: TypeScript + React hooks + jsx-a11y as warnings (so they
// surface in PRs without blocking the existing baseline).
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
      // jsx-a11y is warn-only so the existing codebase isn't gated on it;
      // new violations still show up in editor + CI output.
      ...Object.fromEntries(
        Object.entries(jsxA11y.configs.recommended.rules ?? {}).map(([k, v]) => [
          k,
          Array.isArray(v) ? ["warn", ...v.slice(1)] : "warn",
        ]),
      ),
      // Keep the unused-var signal but allow leading-underscore opt-out so
      // call-site clarity (e.g. `(_e) => …`) isn't punished.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // The codebase intentionally uses `any` in a handful of bridging spots
      // (e.g. URL state validators that take `Record<string, unknown>`).
      // Flag new uses without breaking the build.
      "@typescript-eslint/no-explicit-any": "warn",
      // Regex-heavy modules (units.ts in particular) keep extra escapes inside
      // character classes for visual clarity. Removing them is a no-op
      // semantically but harms readability — warn, don't error.
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
