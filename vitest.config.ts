import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: false,
    // Argon2id derivations (used by kdf + sigil tests) cost ~hundreds of ms
    // each on cold caches; the default 5s timeout flakes on the first run.
    testTimeout: 30_000,
  },
});
