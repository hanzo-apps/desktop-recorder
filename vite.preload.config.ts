import { defineConfig } from "vite";

// preload bundle: CommonJS, externals left to Electron's own require.
export default defineConfig({
  build: { rollupOptions: { external: ["electron"] }, lib: { formats: ["cjs"] } },
});
