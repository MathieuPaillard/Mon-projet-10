import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, "../server/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: path.resolve(__dirname, "index.html"),
        register: path.resolve(__dirname, "register.html"),
        connexion: path.resolve(__dirname, "connexion.html"),
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3004",
        changeOrigin: true,
      },
    },
  },
});
