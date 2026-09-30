import { defineConfig } from "vitest/config";

// GitHub Pages serves the site under /<repo>/
export default defineConfig({
  base: "/gsu-internship-and-planning/",
  test: { environment: "jsdom" },
});
