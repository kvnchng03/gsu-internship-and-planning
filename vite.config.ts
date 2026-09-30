import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  // GitHub Pages serves the site under /<repo name>/. The deploy build reads the name from GitHub, so renaming the
  // repo can't leave the site asking for its files at the old address.
  const REPO = loadEnv(mode, ".", "").GITHUB_REPOSITORY?.split("/")[1] || "school-and-planning";
  const BASE = "/" + REPO + "/";

  return {
    base: BASE,
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png", "icon.svg"],
        manifest: {
          name: "GSU Internship & Planning",
          short_name: "GSU Planner",
          description: "Plan Georgia State accounting classes, track internship applications, and see which skills to learn next.",
          start_url: BASE,
          scope: BASE,
          display: "standalone",
          orientation: "any",
          background_color: "#ffffff",
          theme_color: "#1f3fa6",
          icons: [
            { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          // Everything the app needs ships with it, so it works offline after the first visit
          globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
          navigateFallback: BASE + "index.html",
          // Handles taps on deadline notifications
          importScripts: ["sw-notify.js"],
        },
      }),
    ],
    test: { environment: "jsdom" },
  };
});
