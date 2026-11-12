import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: "/app/",
  envDir: "../",
  plugins: [vue()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
