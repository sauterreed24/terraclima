import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    // Mixed environment: most lib tests are pure Node, but app-url touches
    // window. Per-file `// @vitest-environment jsdom` overrides the default.
    environment: "node",
    globals: false,
    reporters: process.env.CI ? ["default", "github-actions"] : ["default"],
  },
});
