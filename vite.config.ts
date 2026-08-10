import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/cadastromedicao/",
  plugins: [
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      // but-unzip (shpjs dep) has no export condition for the worker runtime
      "but-unzip": fileURLToPath(
        new URL("./node_modules/but-unzip/index.browser.min.mjs", import.meta.url),
      ),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("leaflet")) return "leaflet";
          if (id.includes("xlsx") || id.includes("jszip") || id.includes("papaparse")) return "excel";
          if (id.includes("react-select") || id.includes("lucide-react")) return "ui-vendor";
        },
      },
    },
  },
});