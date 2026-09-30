// The class planner: semesters, placing classes, prerequisite checks, and auto-fill
import type { Course, PlanContext, Term } from "../types";
import { ALIASES, BEFORE_LAST, COURSE_BY_CODE, DEPTH, MAJOR, REQUIRED, UNLOCKS, codesIn, courseLabel, gsuCourseFor } from "../data/courses";
import { addTag, commit, state } from "./store";

// Terms are "YYYY-N" with N = 1 spring, 2 summer, 3 fall. As a number, a term is year * 3 + (N - 1).
const SEASONS = ["Spring", "Summer", "Fall"];
export function termIndex(id: string): number { const [y, n] = id.split("-").map(Number); return y * 3 + (n - 1); }
export function termAt(ix: number): Term { return { id: Math.floor(ix / 3) + "-" + (ix % 3 + 1), codes: [] }; }
export function termName(id: string): string { const ix = termIndex(id); return SEASONS[ix % 3] + " " + Math.floor(ix / 3); }
export function shortTerm(id: string): string { const ix = termIndex(id); return ["Spr", "Sum", "Fall"][ix % 3] + " " + String(Math.floor(ix / 3)).slice(2); }
/** The academic year a term belongs to, named by its fall: Spring 2027 is in 2026-27. */
export function academicYear(id: string): number { const ix = termIndex(id), y = Math.floor(ix / 3); return ix % 3 === 2 ? y : y - 1; }
export const isSummer = (id: string): boolean => id.endsWith("-2");

/** The first term that hasn't started yet. */
export function nextTermIx(now: Date): number {
  const y = now.getFullYear(), m = now.getMonth();
  return m < 4 ? y * 3 + 1 : m < 7 ? y * 3 + 2 : (y + 1) * 3;
}
/** Reads a graduation date like "Dec 2027" or "Spring 2028" as a term. */
export function gradTermIx(text: string): number | null {
  const y = /(\d{4})/.exec(text || "");
  if (!y) return null;
  const t = text.toLowerCase();
  const n = /spring|jan|feb|mar|apr|may/.test(t) ? 0 : /summer|jun|jul/.test(t) ? 1 : /fall|autumn|aug|sep|oct|nov|dec/.test(t) ? 2 : null;
  return n == null ? null : Number(y[1]) * 3 + n;
}

export function planTerms(): Term[] { return state.plan.terms; }
/** Creates every term from the next one through graduation (or six terms when graduation isn't set). */
export function setupTerms(): void {
  const first = nextTermIx(new Date());
  const grad = gradTermIx(state.profile.grad);
  const last = grad != null && grad >= first && grad - first < 15 ? grad : first + 5;
  state.plan.terms = [];
  for (let ix = first; ix <= last; ix++) state.plan.terms.push(termAt(ix));
}
export function addTerm(): void {
  const t = planTerms();
  const ix = t.length ? termIndex(t[t.length - 1].id) + 1 : nextTermIx(new Date());
  t.push(termAt(ix));
}
/** Takes a class out of the plan. A final-semester class takes its partner (the exit exam) with it. */
export function unplace(code: string): void {
  const c = COURSE_BY_CODE[code];
  const gone = [code, ...(c && c.last ? c.co || [] : [])];
  for (const t of planTerms()) t.codes = t.codes.filter(x => !gone.includes(x));
}
export function place(code: string, termId: string): void {
  unplace(code);
  const t = planTerms().find(x => x.id === termId);
  if (t) t.codes.push(code);
  // A course and the one it must be taken with go together
  const c = COURSE_BY_CODE[code];
  for (const co of (c && c.last ? c.co || [] : [])) { unplace(co); if (t) t.codes.push(co); }
}

export function planContext(): PlanContext {
  const taken = new Set<string>();
  for (const cls of state.profile.classes) for (const code of codesIn(cls)) { taken.add(code); if (ALIASES[code]) taken.add(ALIASES[code]); }
  const where: Record<string, number> = {};
  planTerms().forEach((t, i) => { for (const c of t.codes) if (!taken.has(c)) where[c] = i; });
  return { taken, where, lastPos: planTerms().length - 1 };
}

export const listOf = (xs: string[]): string =>
  xs.length <= 2 ? xs.join(" and ") : xs.slice(0, -1).join(", ") + ", and " + xs[xs.length - 1];

export interface Issues { hard: string[]; soft: string[] }
/** Problems with taking a course in the term at position pos. Hard ones break a rule; soft ones are advice. */
export function issuesFor(c: Course, pos: number, ctx: PlanContext): Issues {
  const before = (code: string) => ctx.taken.has(code) || (ctx.where[code] !== undefined && ctx.where[code] < pos);
  const byThen = (code: string) => ctx.taken.has(code) || (ctx.where[code] !== undefined && ctx.where[code] <= pos);
  const hard: string[] = [], soft: string[] = [];
  const missing = (c.pre || []).filter(x => !before(x));
  for (const alts of c.any || []) if (!alts.some(before)) missing.push(alts.join(" or "));
  if (missing.length) hard.push("Needs " + listOf(missing) + " first");
  const co = (c.co || []).filter(x => !byThen(x));
  if (co.length) hard.push("Take with " + listOf(co));
  if (c.majorCount) {
    const n = MAJOR.filter(before).length;
    if (n < c.majorCount) hard.push("Needs " + c.majorCount + " accounting major classes first (you'd have " + n + ")");
  }
  if (c.last && pos < ctx.lastPos) soft.push("Best in your final semester");
  return { hard, soft };
}
export function termHours(t: Term, ctx: PlanContext): number {
  return t.codes.filter(c => !ctx.taken.has(c)).reduce((n, c) => n + COURSE_BY_CODE[c].hrs, 0);
}
/** Where a class stands: taken, planned in a good spot, planned too early, or not planned. */
export type CourseStatus = "done" | "planned" | "bad" | "open";
export function statusFn(ctx: PlanContext): (code: string) => CourseStatus {
  return code => ctx.taken.has(code) ? "done"
    : ctx.where[code] !== undefined ? (issuesFor(COURSE_BY_CODE[code], ctx.where[code], ctx).hard.length ? "bad" : "planned")
    : "open";
}

export interface AutoPlanResult { left: string[]; stretched: boolean }
/**
 * Fills in the required classes that are left, earliest possible term first. The first pass keeps
 * semesters at 15 hours (6 in summer); only if that can't fit everything does a second pass go to 18 (9).
 */
export function autoPlan(): AutoPlanResult {
  if (!planTerms().length) setupTerms();
  const ctx = planContext();
  const terms = planTerms(), final = terms.length - 1;
  const pending = REQUIRED.filter(code => !ctx.taken.has(code) && ctx.where[code] === undefined
    && !COURSE_BY_CODE[code].co?.some(x => COURSE_BY_CODE[x].last));
  let stretched = false;
  for (const [full, summer] of [[15, 6], [18, 9]]) {
    if (!pending.length) break;
    if (full === 18) stretched = true;
    terms.forEach((t, pos) => {
      let hrs = termHours(t, ctx);
      const cap = isSummer(t.id) ? summer : full;
      const ready = pending
        .filter(code => !issuesFor(COURSE_BY_CODE[code], pos, ctx).hard.some(x => !x.startsWith("Take with")))
        .filter(code => COURSE_BY_CODE[code].last ? pos === final : !(pos === final && BEFORE_LAST.has(code)))
        .sort((a, b) => DEPTH[b] - DEPTH[a] || UNLOCKS[b] - UNLOCKS[a] || a.localeCompare(b));
      for (const code of ready) {
        const c = COURSE_BY_CODE[code];
        if (hrs + c.hrs > cap) continue;
        place(code, t.id); hrs += c.hrs;
        ctx.where[code] = pos;
        for (const co of c.last ? c.co || [] : []) ctx.where[co] = pos;
        pending.splice(pending.indexOf(code), 1);
      }
    });
  }
  return { left: pending, stretched: stretched && !pending.length };
}

export function setTaken(code: string, on: boolean): void {
  if (on) { unplace(code); addTag("classes", courseLabel(COURSE_BY_CODE[code])); }
  else {
    state.profile.classes = state.profile.classes.filter(x => { const k = gsuCourseFor(x); return !(k && k.code === code); });
    commit();
  }
}

export interface Verdict { open: string[]; bad: { code: string; msg: string }[]; headline: string; detail: string; tone: "" | "ok" | "bad" }
/** The "can I graduate?" answer, shared by the checklist and the summary. */
export function planVerdict(ctx: PlanContext, terms: Term[], status: (code: string) => CourseStatus): Verdict {
  const open = REQUIRED.filter(c => status(c) === "open");
  const bad: Verdict["bad"] = [];
  terms.forEach((t, pos) => t.codes.forEach(code => {
    if (ctx.taken.has(code)) return;
    const iss = issuesFor(COURSE_BY_CODE[code], pos, ctx);
    if (iss.hard.length) bad.push({ code, msg: iss.hard[0] });
  }));
  if (bad.length) {
    return { open, bad, headline: bad.length + (bad.length === 1 ? " class is" : " classes are") + " out of order", detail: "Planned before a prerequisite is done.", tone: "bad" };
  }
  if (open.length) {
    return { open, bad, headline: open.length + (open.length === 1 ? " class" : " classes") + " left to place",
      detail: terms.length ? "Place them yourself, or let the planner fill them in." : "Set up your semesters to start.", tone: "" };
  }
  return { open, bad, headline: "Every requirement is covered", detail: "Done or planned, in an order that works.", tone: "ok" };
}

export type Earliest = { done: true } | { done?: false; id: string; stretched: boolean } | null;
let earliestMemo: { key: string; value: Earliest } | null = null;
/** The earliest semester the remaining required classes could all be done, planning from scratch. */
export function earliestFinish(): Earliest {
  const first = nextTermIx(new Date());
  const key = JSON.stringify([state.profile.classes, first]);
  if (earliestMemo && earliestMemo.key === key) return earliestMemo.value;
  let value: Earliest = null;
  const taken = planContext().taken;
  if (!REQUIRED.some(c => !taken.has(c))) value = { done: true };
  else {
    const saved = state.plan;
    try {
      for (let n = 1; n <= 12 && !value; n++) {
        state.plan = { terms: Array.from({ length: n }, (_, i) => termAt(first + i)) };
        const r = autoPlan();
        if (!r.left.length) value = { id: state.plan.terms[n - 1].id, stretched: r.stretched };
      }
    } finally { state.plan = saved; }
  }
  earliestMemo = { key, value };
  return value;
}

export interface GoalCheck { kind: "ok" | "bad" | "open"; label: string; n: string; items: [string, null][] }
export function goalCheck(): GoalCheck | null {
  const early = earliestFinish(), goal = gradTermIx(state.profile.grad);
  if (!early || early.done) return null;
  const name = termName(early.id) + (early.stretched ? " (needs an 18-hour semester)" : "");
  if (goal == null) {
    return { kind: "open", label: "Earliest possible finish", n: shortTerm(early.id),
      items: [["Set your graduation date under Skills to check it.", null], ["Earliest possible: " + name, null]] };
  }
  const ok = termIndex(early.id) <= goal;
  return { kind: ok ? "ok" : "bad", label: "Graduate by " + termName(termAt(goal).id), n: shortTerm(early.id),
    items: [[(ok ? "Reachable. " : "Not reachable at these loads. ") + "Earliest possible: " + name + ".", null]] };
}

export function lastPlannedPos(ctx: PlanContext, terms: Term[]): number {
  let last = -1;
  terms.forEach((t, i) => { if (t.codes.some(c => !ctx.taken.has(c))) last = i; });
  return last;
}
