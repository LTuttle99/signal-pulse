import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? process.env.PAGES_BASE || "/signal-pulse/" : "/",
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { "/api": "http://127.0.0.1:8787" },
    watch: { ignored: ["**/work/**", "**/.wrangler/**", "**/test-results/**"] },
  },
  build: { chunkSizeWarningLimit: 650 },
}));
