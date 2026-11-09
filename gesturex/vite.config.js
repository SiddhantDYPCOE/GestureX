
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],

  build: {
    outDir: "dist",

    emptyOutDir: true,

    rollupOptions: {
      input: {
        dashboard: resolve(__dirname, "index.html"),

        offscreen: resolve(
          __dirname,
          "src/extension/offscreen.js"
        )
      },

      output: {
        entryFileNames: "extension/[name].js",

        chunkFileNames: "extension/chunks/[name]-[hash].js",

        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
