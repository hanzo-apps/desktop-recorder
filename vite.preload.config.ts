import { defineConfig } from "vite";

// preload bundle. @electron-forge/plugin-vite supplies the entry, the CJS output
// format and the Electron/node externals; this file exists so a fork has one
// obvious place to add to that.
export default defineConfig({});
