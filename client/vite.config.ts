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
          if (id.includes("chart.js") || id.includes("react-chartjs-2"))
            return "charts";
          if (id.includes("primereact") || id.includes("primeicons"))
            return "primereact";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("styled-components") || id.includes("framer-motion"))
            return "ui-motion";
          if (id.includes("react")) return "react";
          return "vendor";
        },
      },
    },
  },
});
