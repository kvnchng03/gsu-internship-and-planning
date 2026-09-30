import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Generates the favicon, Apple touch icon, and PWA icons from public/icon.svg
export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0.1, resizeOptions: { background: "#1f3fa6" } },
    apple: { ...minimal2023Preset.apple, padding: 0.1, resizeOptions: { background: "#1f3fa6" } },
  },
  images: ["public/icon.svg"],
});
