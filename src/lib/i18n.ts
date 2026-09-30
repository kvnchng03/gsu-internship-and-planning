// The app's own words in English or Vietnamese. Content the student needs in English stays English on purpose:
// class codes and titles, skill names and the skill guide, posting text, and anything sent to an advisor or synced
// to a calendar. The English text is the lookup key, so a missing translation falls back to English.
import { VI } from "./vi";

export type Lang = "en" | "vi";
const KEY = "gsu-planner-lang";

function saved(): Lang {
  try { return localStorage.getItem(KEY) === "vi" ? "vi" : "en"; } catch { return "en"; }
}
let current: Lang = saved();

export const lang = (): Lang => current;
export function setLang(next: Lang): void {
  current = next;
  try { localStorage.setItem(KEY, next); } catch { /* storage blocked: the choice lasts for this visit */ }
  document.documentElement.lang = next;
}
/** Runs fn with the words in one language, e.g. English for the plan an advisor reads. */
export function inLang<T>(l: Lang, fn: () => T): T {
  const was = current;
  current = l;
  try { return fn(); } finally { current = was; }
}

/** The app's wording for `en` in the chosen language, with {name} filled in from vars. */
export function t(en: string, vars?: Record<string, string | number>): string {
  const text = (current === "vi" && VI[en]) || en;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;
}
/** Marks English wording kept in a table for t() to translate when it's shown. */
export const k = (en: string): string => en;

/** The locale for dates: Vietnamese date wording in Vietnamese, the phone's own format in English. */
export const dateLocale = (): string | undefined => (current === "vi" ? "vi-VN" : undefined);
/** A date in the chosen language; Vietnamese month and weekday names start lowercase, so the first letter is raised. */
export function fmtDate(d: Date, opts: Intl.DateTimeFormatOptions): string {
  const s = d.toLocaleDateString(dateLocale(), opts);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
