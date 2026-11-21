import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const allowedHosts = process.env.VITE_ALLOWED_HOSTS?.split(",").map(host => host.trim()).filter(Boolean);

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  server: { host: "::", port: 8080, ...(allowedHosts?.length ? { allowedHosts } : {}) },
  preview: { host: "::", port: 8080, ...(allowedHosts?.length ? { allowedHosts } : {}) },
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules[\\/](react|react-dom|scheduler)/.test(id)) return "react";
          if (id.includes("@dnd-kit")) return "dnd";
          return "vendor";
        },
      },
    },
  },
});
