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
        target: "http://localhost:8082",
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
