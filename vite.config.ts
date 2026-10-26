import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    host: '0.0.0.0',
    port: 1420,
    strictPort: true,
    allowedHosts: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 1420,
    strictPort: true,
    allowedHosts: true,
  },
});
