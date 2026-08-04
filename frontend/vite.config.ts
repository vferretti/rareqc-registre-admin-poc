import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        // API en dev local (`go run ./cmd/api/`). Si l'API tourne en docker :
        // VITE_API_PROXY_TARGET=http://localhost:8082 npm run dev
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8080",
        bypass(req) {
          // Don't proxy requests for the generated API client (frontend/api/)
          if (req.url?.match(/\.(ts|js|map)(\?|$)/)) {
            return req.url;
          }
        },
      },
    },
  },
});
