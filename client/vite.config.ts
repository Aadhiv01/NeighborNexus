import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

// Port is pinned so the API's CORS allow-list stays predictable.
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  server: {
    port: 3001,
    strictPort: true,
  },
  preview: {
    port: 3001,
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split vendor code so a change to app code doesn't invalidate the
        // whole bundle for returning visitors.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
          if (id.includes("react-router") || id.includes("@remix-run")) return "router";
          if (id.includes("@base-ui")) return "base-ui";
          if (id.includes("maplibre-gl")) return "maplibre";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("motion")) return "motion";
          return "vendor";
        },
      },
    },
  },
});
