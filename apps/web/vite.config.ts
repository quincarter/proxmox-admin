import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  base: "/",
  resolve: {
    alias: {
      "@proxmox-admin/types": resolve(
        __dirname,
        "../../packages/types/src/index.ts",
      ),
    },
  },
  server: {
    port: 5173,
    // SPA fallback: serve index.html for all non-asset requests so deep links
    // and page refreshes work correctly with @lit-labs/router's client-side routing.
    historyApiFallback: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // WebSocket proxy for the SSH terminal gateway.
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
