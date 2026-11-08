import { defineConfig } from "vite";
export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  build: { manifest: true, outDir: "dist", emptyOutDir: true },
  server: { host: "127.0.0.1" },
});
