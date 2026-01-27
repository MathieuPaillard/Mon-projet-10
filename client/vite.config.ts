import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, "../server/public"),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:3003",
    },
  },
});
