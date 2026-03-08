import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@proxmox-admin/types": resolve(
        __dirname,
        "../../packages/types/src/index.ts",
      ),
      // @open-wc/testing imports @esm-bundle/chai which has a nested path issue
      // in yarn workspaces. Alias to the standard chai package for happy-dom.
      "@esm-bundle/chai": resolve(
        __dirname,
        "../../node_modules/chai/index.js",
      ),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["src/**/*.test.ts"],
    // Lit components register via customElements.define; each test file gets
    // its own happy-dom window so there are no double-registration errors.
    isolate: true,
  },
});
