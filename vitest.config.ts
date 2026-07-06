import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@config": path.resolve(__dirname, "./src/config"),
      "@core": path.resolve(__dirname, "./src/core"),
      "@modules": path.resolve(__dirname, "./src/modules"),
      "@db": path.resolve(__dirname, "./src/db"),
      "@types": path.resolve(__dirname, "./src/types"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
