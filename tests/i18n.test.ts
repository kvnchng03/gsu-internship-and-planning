import { afterEach, describe, expect, it } from "vitest";
import { inLang, setLang, t } from "../src/lib/i18n";
import { VI } from "../src/lib/vi";
import { planText } from "../src/ui/summary-view";

// Every English phrase the app shows goes through t("...") or k("..."); collect them from the source
const sources = import.meta.glob<string>("../src/**/*.ts", { query: "?raw", import: "default", eager: true });
const keys = new Set<string>();
for (const text of Object.values(sources)) {
  for (const m of text.matchAll(/\b[tk]\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.add(JSON.parse('"' + m[1] + '"') as string);
}
const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

describe("Vietnamese wording", () => {
  afterEach(() => setLang("en"));

  it("covers every phrase the app shows", () => {
    expect(keys.size).toBeGreaterThan(100);
    expect([...keys].filter(key => !VI[key])).toEqual([]);
  });

  it("keeps the same {placeholders} as the English", () => {
    expect(Object.keys(VI).filter(key => holes(key).join() !== holes(VI[key]).join())).toEqual([]);
  });

  it("has no translations left over for phrases the app no longer shows", () => {
    expect(Object.keys(VI).filter(key => !keys.has(key))).toEqual([]);
  });

  it("switches languages, fills in values, and falls back to English", () => {
    expect(t("Plan")).toBe("Plan");
    setLang("vi");
    expect(t("Plan")).toBe(VI["Plan"]);
    expect(t("{n} postings", { n: 3 })).toBe("3 tin");
    expect(t("A phrase with no translation")).toBe("A phrase with no translation");
    expect(inLang("en", () => t("Plan"))).toBe("Plan");
    expect(t("Plan")).toBe(VI["Plan"]);
  });

  it("keeps the plan for the advisor in English while the app is in Vietnamese", () => {
    setLang("vi");
    const text = planText();
    expect(text).toMatch(/^Accounting B\.B\.A\. plan/);
    expect(text).toContain("Status: ");
    expect(text).not.toMatch(/môn|học kỳ|tín chỉ/);
    expect(t("Plan")).toBe(VI["Plan"]);
  });
});
