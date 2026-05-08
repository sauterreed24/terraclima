import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
    // Default: Node. Files that need DOM set `// @vitest-environment jsdom` (app-url, App shell).
    environment: "node",
    globals: false,
    reporters: process.env.CI ? ["default", "github-actions"] : ["default"],
  },
});
