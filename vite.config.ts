import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Terraclima Vite configuration.
 *
 * Tuned to run efficiently on low-memory hardware (e.g. Surface Pro 5, 8 GB):
 *   - Heavy atlas JSON (us-atlas, world-atlas) and large libs are pulled out
 *     into their own chunks so the main entry parses quickly and the browser
 *     (and Vite's dev transform cache) can reuse them between reloads.
 *   - Dev-server warms up the hot-path modules so the first navigation doesn't
 *     pay the full transform cost.
 *   - Prod sourcemaps are off by default — they double the build's memory
 *     footprint and are rarely needed for this static SPA.
 */
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    host: true,
    warmup: {
      clientFiles: [
        "./src/main.tsx",
        "./src/App.tsx",
        "./src/components/AtlasMap.tsx",
        "./src/lib/scoring.ts",
        "./src/lib/units.ts",
        "./src/data/places.ts",
      ],
    },
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "framer-motion",
      "lucide-react",
      "d3-geo",
      "topojson-client",
    ],
  },

  build: {
    target: "es2022",
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Split the bundle so the main entry stays lean and big, cacheable
        // libraries live in their own long-lived chunks.
        //
        // Place-data chunks are by far the heaviest thing the app ships
        // (500 kB+ of rich per-place prose, climate arrays, and scoring
        // metadata). Isolating them into per-country chunks lets the
        // browser:
        //   1. Download the three countries *in parallel* alongside the
        //      tiny main entry, instead of serialising everything through
        //      one huge index.js.
        //   2. Cache each country independently — tweaking USA prose
        //      doesn't invalidate the Canada / Mexico payloads.
        //   3. Parse/compile each chunk on a separate task, which keeps the
        //      main thread free for React hydration on the Surface Pro 5.
        manualChunks(id) {
          // Place data — per country, so we get three parallel downloads
          // instead of one 500 kB blob.
          if (id.includes("/data/places.usa")) return "places-usa";
          if (id.includes("/data/places.canada")) return "places-canada";
          if (id.includes("/data/places.mexico")) return "places-mexico";
          // Curated / reference data — smaller, but still belongs out of
          // the main entry so the entry compiles fast and these can be
          // cached independently as the rest of the UI evolves.
          if (
            id.includes("/data/collections") ||
            id.includes("/data/archetypes") ||
            id.includes("/data/glossary")
          ) return "data-curated";

          if (!id.includes("node_modules")) return undefined;
          if (id.includes("world-atlas") || id.includes("us-atlas")) return "atlas-data";
          if (id.includes("d3-geo") || id.includes("topojson-client")) return "geo";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react-dom") || id.includes("scheduler") || id.includes("/react/")) return "react";
          return "vendor";
        },
      },
    },
  },
});
