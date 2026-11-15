import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// GitHub Pages では https://<user>.github.io/free-model-radar/ 配下に配信される。
// 開発時はルートで配信し、localhost の URL を素直に保つ。
// BASE_PATH を渡せば独自ドメインでも動く。
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? (process.env.BASE_PATH ?? "/free-model-radar/") : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    // 初回表示を軽くするため、大きすぎる chunk は警告で検知できるようにする
    chunkSizeWarningLimit: 400,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    css: false,
  },
}));
