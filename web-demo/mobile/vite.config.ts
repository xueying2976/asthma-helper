// Isolated static SPA build for the iOS WKWebView shell. Does not affect the web app.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { copyFileSync, mkdirSync } from "node:fs";

const root = fileURLToPath(new URL(".", import.meta.url));
const src = fileURLToPath(new URL("../src", import.meta.url));
const outDir = fileURLToPath(new URL("../dist-mobile", import.meta.url));

/** Ship the bundled font's OFL license alongside the offline bundle. */
const fontLicense = {
  name: "aeriday-font-license",
  closeBundle() {
    mkdirSync(`${outDir}/licenses`, { recursive: true });
    copyFileSync(`${root}fonts/noto-sans-sc/OFL.txt`, `${outDir}/licenses/NotoSansSC-OFL.txt`);
  },
};

export default defineConfig({
  root,
  base: "./", // relative URLs so file:// / bundled loading works offline
  plugins: [react(), tailwindcss(), fontLicense],
  resolve: { alias: { "@": src } },
  build: {
    outDir,
    emptyOutDir: true,
    target: "safari16",
    assetsInlineLimit: 0,
  },
});
