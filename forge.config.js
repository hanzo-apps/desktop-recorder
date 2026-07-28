// Electron Forge + Vite. Three bundles — main, preload, renderer — because
// contextIsolation is on and the renderer never sees Node.
export default {
  packagerConfig: { asar: true, icon: "icons/icon" },
  makers: [
    { name: "@electron-forge/maker-squirrel", config: {} },
    { name: "@electron-forge/maker-zip", platforms: ["darwin"] },
    { name: "@electron-forge/maker-deb", config: {} },
    { name: "@electron-forge/maker-rpm", config: {} },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-vite",
      config: {
        build: [
          { entry: "src/main.ts", config: "vite.main.config.ts", target: "main" },
          { entry: "src/preload.ts", config: "vite.preload.config.ts", target: "preload" },
        ],
        renderer: [{ name: "main_window", config: "vite.renderer.config.ts" }],
      },
    },
  ],
};
