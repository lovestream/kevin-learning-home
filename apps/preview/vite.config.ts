import { defineConfig } from "vite";
export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  build: {
    manifest: true,
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        math: new URL("index.html", import.meta.url).pathname,
        english: new URL("english/index.html", import.meta.url).pathname,
      },
    },
  },
  server: { host: "127.0.0.1" },
});
