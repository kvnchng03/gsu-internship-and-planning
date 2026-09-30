// Plan view: requirement progress, class library, semester board, and the "can I graduate?" checklist
import type { Course, Kid, PlanContext, ReqGroup, Term } from "../types";
import { CATALOG, COURSES, COURSE_BY_CODE, REQUIRED, REQ_GROUPS, UNLOCKS } from "../data/courses";
import {
  academicYear, addTerm, autoPlan, earliestFinish, goalCheck, isSummer, issuesFor, lastPlannedPos, listOf, place,
  planContext, planTerms, planVerdict, setupTerms, shortTerm, statusFn, termHours, termName, unplace, type CourseStatus,
} from "../lib/plan";
import { commit, state, ui } from "../lib/store";
import { openCourse } from "./dialogs";
import { h, icon, keyActivate, toast, type Attrs } from "./dom";
import { armLater, panes, render, scroller } from "./render";
import { k, t } from "../lib/i18n";

type StatusOf = (code: string) => CourseStatus;
type CheckItem = [text: string, run: (() => void) | null];

export function planView(): HTMLElement[] {
  const ctx = planContext(), terms = planTerms();
  if (!terms.some(t => t.id === ui.focusTerm)) ui.focusTerm = terms.length ? terms[0].id : null;
  const status = statusFn(ctx);
  return [rail(ctx, status), ...panes({ left: libraryPane(ctx, terms, status), center: boardPane(ctx, terms), right: checksPane(ctx, terms, status) })];
}

/** Lets a class be dragged onto a semester. */
function dragProps(code: string): Attrs {
  return {
    draggable: "true",
    ondragstart: (e: DragEvent) => { e.dataTransfer?.setData("text/plain", code); if (e.dataTransfer) e.dataTransfer.effectAllowed = "move"; document.body.classList.add("dragging"); },
    ondragend: () => { document.body.classList.remove("dragging"); document.querySelectorAll(".term.drop").forEach(el => el.classList.remove("drop")); },
  };
}

const SHORT_GROUP: Record<Exclude<ReqGroup, "elective">, string> = { lower: "Lower-division", foundation: "Foundation", core: "Junior core", major: "Accounting major", senior: "Senior" };
function rail(ctx: PlanContext, status: StatusOf): HTMLElement {
  const done = REQUIRED.filter(c => ctx.taken.has(c)).length;
  const planned = REQUIRED.filter(c => ["planned", "bad"].includes(status(c))).length;
  const early = earliestFinish();
  const pct = (n: number, of: number) => (100 * n / of).toFixed(1) + "%";
  const groups = REQ_GROUPS.filter((g): g is { id: Exclude<ReqGroup, "elective">; name: string } => g.id !== "elective").map(g => {
    const cs = COURSES.filter(c => c.req === g.id).map(c => status(c.code));
    const d = cs.filter(x => x === "done").length, pl = cs.filter(x => x === "planned").length, b = cs.filter(x => x === "bad").length;
    return h("button", {
      type: "button", class: "rg grp-" + g.id, title: SHORT_GROUP[g.id] + ": " + t("{done} done, {planned} planned, {open} not planned", { done: d, planned: pl + b, open: cs.length - d - pl - b }),
      onclick: () => {
        ui.libFilter = "all"; ui.libQuery = ""; ui.pane.plan = "left"; render();
        const el = document.getElementById("lib-g-" + g.id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    },
      h("span", { class: "top" }, h("span", { class: "gl" }, h("i", { class: "gdot" }), h("span", { class: "gn" }, SHORT_GROUP[g.id])), h("span", { class: "mono" }, (d + pl + b) + "/" + cs.length)),
      h("span", { class: "bar" },
        h("span", { class: "d", style: "width:" + pct(d, cs.length) }),
        h("span", { class: "p", style: "width:" + pct(pl, cs.length) }),
        h("span", { class: "b", style: "width:" + pct(b, cs.length) })));
  });
  return h("div", { class: "rail" },
    h("div", { class: "rail-groups" }, ...groups),
    h("div", { class: "rail-stats" },
      h("span", null, h("b", { class: "mono" }, done), " " + t("done")),
      h("span", null, h("b", { class: "mono" }, planned), " " + t("planned")),
      early && !early.done ? h("span", { style: "display:inline-flex;align-items:center;gap:5px", title: t("Earliest you could graduate") }, icon("cap", "sm"), t("Earliest finish") + " ", h("b", { class: "mono" }, shortTerm(early.id))) : null));
}

function libraryPane(ctx: PlanContext, terms: Term[], status: StatusOf): Kid[] {
  const q = ui.libQuery.trim().toLowerCase();
  const FILTERS: [typeof ui.libFilter, string][] = [["all", k("All")], ["open", k("To place")], ["elective", k("Electives")], ["done", k("Done")]];
  const match = (c: Course) => {
    if (q && !(c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q))) return false;
    const st = status(c.code);
    if (ui.libFilter === "open") return st === "open" && c.req !== "elective";
    if (ui.libFilter === "elective") return c.req === "elective";
    if (ui.libFilter === "done") return st === "done";
    return true;
  };
  const rows: HTMLElement[] = [];
  let shown = 0;
  for (const g of REQ_GROUPS) {
    const cs = COURSES.filter(c => c.req === g.id && match(c));
    if (!cs.length) continue;
    rows.push(h("div", { class: "group-label grp-" + g.id, id: "lib-g-" + g.id }, h("i", { class: "gdot" }), g.name));
    for (const c of cs) { shown++; rows.push(libRow(c, ctx, terms, status)); }
  }
  return [
    h("div", { class: "pane-head" },
      h("div", { class: "search" }, icon("search"),
        h("input", { class: "input", id: "lib-q", type: "search", placeholder: t("Search classes…"), value: ui.libQuery, "aria-label": t("Search classes"),
          oninput: (e: Event) => { ui.libQuery = (e.target as HTMLInputElement).value; render(); } })),
      h("div", { class: "toggles", role: "group", "aria-label": t("Show") }, ...FILTERS.map(([key, l]) =>
        h("button", { type: "button", class: "toggle", "aria-pressed": String(ui.libFilter === key), onclick: () => { ui.libFilter = key; render(); } }, t(l))))),
    scroller("lib", ...(rows.length ? rows : [h("p", { class: "empty-state" }, t("Nothing matches."))])),
    h("div", { class: "pane-foot" }, t("{shown} of {total}", { shown, total: COURSES.length }),
      ui.focusTerm ? " · " + t("+ adds to {term}", { term: termName(ui.focusTerm) }) : ""),
  ];
}

function libRow(c: Course, ctx: PlanContext, terms: Term[], status: StatusOf): HTMLElement {
  const st = status(c.code), pos = ctx.where[c.code];
  let end: HTMLElement | null = null;
  const focus = ui.focusTerm;
  if (st === "done") end = h("span", { class: "badge ok" }, icon("check", "sm"), t("Done"));
  else if (pos !== undefined) end = h("span", { class: "badge mono" + (st === "bad" ? " bad" : "") }, shortTerm(terms[pos].id));
  else if (focus) end = h("button", {
    type: "button", class: "icon-btn", title: t("Add to {term}", { term: termName(focus) }), "aria-label": t("Add {code} to {term}", { code: c.code, term: termName(focus) }),
    onclick: (e: MouseEvent) => { e.stopPropagation(); place(c.code, focus); commit(); toast(t("Added {code} to {term}.", { code: c.code, term: termName(focus) })); },
  }, icon("plus"));
  const meta = [h("span", null, t("{n} hrs", { n: c.hrs }))];
  if (st !== "done" && UNLOCKS[c.code] >= 2) meta.push(h("span", { title: t("Classes that need this one first") }, t("unlocks {n}", { n: UNLOCKS[c.code] })));
  if (st === "open") {
    const need = (c.pre || []).filter(p => !ctx.taken.has(p)).length + (c.any || []).filter(a => !a.some(x => ctx.taken.has(x))).length;
    if (need) meta.push(h("span", { class: "needs" }, need === 1 ? t("needs 1 class first") : t("needs {n} classes first", { n: need })));
  }
  if (c.req === "elective") meta.push(h("span", null, t("optional")));
  return h("div", { class: "lib-row grp-" + c.req + (st !== "open" ? " on" : ""), role: "button", tabindex: "0", onclick: () => openCourse(c.code), onkeydown: keyActivate(() => openCourse(c.code)),
    ...(st === "done" ? {} : dragProps(c.code)) },
    h("div", { class: "l1" }, h("span", { class: "code" }, c.code), h("span", { class: "title" }, c.title)),
    h("div", { class: "l2" }, ...meta),
    h("div", { class: "end" }, end));
}

function boardPane(ctx: PlanContext, terms: Term[]): Kid[] {
  if (!terms.length) {
    return [scroller("board", h("div", { class: "empty-state" },
      icon("cap", "lg"),
      h("h3", null, t("Plan your semesters")),
      h("p", null, t("Add every semester from now until graduation, then fill them with classes.")),
      h("button", { class: "btn primary", type: "button", onclick: setUpSemesters }, t("Set up my semesters"))))];
  }
  // Academic years (fall through summer) become a thin labeled line, not a header row
  const years = new Map<number, [Term, number][]>();
  terms.forEach((t, pos) => { const y = academicYear(t.id); years.set(y, [...(years.get(y) || []), [t, pos]]); });
  return [scroller("board", h("div", { class: "board" },
    ...[...years].map(([y, list]) => h("section", { class: "year" },
      h("div", { class: "year-label" }, y + "–" + String(y + 1).slice(2)),
      h("div", { class: "terms" }, ...list.map(([t, pos]) => termCard(t, pos, ctx, terms))))),
    h("button", { type: "button", class: "btn dashed sm", onclick: () => { addTerm(); commit(); } }, icon("plus"), t("Add term"))))];
}

function termCard(term: Term, pos: number, ctx: PlanContext, terms: Term[]): HTMLElement {
  const codes = term.codes.filter(c => !ctx.taken.has(c));
  const hrs = termHours(term, ctx), heavy = hrs > (isSummer(term.id) ? 9 : 18);
  const focused = ui.focusTerm === term.id, armKey = "term-" + term.id, armed = ui.armed === armKey;
  const rows = codes.map(code => {
    const c = COURSE_BY_CODE[code], iss = issuesFor(c, pos, ctx);
    const note = [...iss.hard, ...iss.soft].join(". ");
    return h("div", {
      class: "slot grp-" + c.req + (c.req !== "elective" ? " req" : "") + (iss.hard.length ? " bad" : ""),
      role: "button", tabindex: "0", title: note || null,
      onclick: (e: MouseEvent) => { e.stopPropagation(); openCourse(code); }, onkeydown: keyActivate(() => openCourse(code)),
      ...dragProps(code),
    },
      h("span", { class: "code" }, c.code),
      h("span", { class: "title" }, c.title),
      iss.hard.length ? h("span", { class: "warn" }, icon("alert", "sm"), h("span", { class: "sr-only" }, note))
        : iss.soft.length ? h("span", { class: "muted", style: "display:inline-flex" }, icon("info", "sm"), h("span", { class: "sr-only" }, note)) : null,
      h("button", { type: "button", class: "icon-btn rm", "aria-label": t("Remove {code}", { code: c.code }), onclick: (e: MouseEvent) => { e.stopPropagation(); unplace(code); commit(); } }, icon("trash", "sm")));
  });
  return h("section", {
    class: "term" + (focused ? " focus" : "") + (heavy ? " over" : ""), "aria-label": termName(term.id),
    onclick: () => { if (ui.focusTerm !== term.id) { ui.focusTerm = term.id; render(); } },
    ondragover: (e: DragEvent) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "move"; (e.currentTarget as HTMLElement).classList.add("drop"); },
    ondragleave: (e: DragEvent) => { const el = e.currentTarget as HTMLElement; if (!el.contains(e.relatedTarget as Node | null)) el.classList.remove("drop"); },
    ondrop: (e: DragEvent) => {
      e.preventDefault(); (e.currentTarget as HTMLElement).classList.remove("drop");
      const code = e.dataTransfer?.getData("text/plain") || "";
      if (!COURSE_BY_CODE[code] || planContext().taken.has(code)) return;
      place(code, term.id); ui.focusTerm = term.id; commit();
      toast(t("{code} planned for {term}.", { code, term: termName(term.id) }));
    },
  },
    h("header", { class: "term-head" },
      h("h3", null, termName(term.id)),
      h("span", { class: "term-meta" + (heavy ? " over" : ""), title: heavy ? t("More than {n} hours is a very heavy load.", { n: isSummer(term.id) ? 9 : 18 }) : t("{n} classes, {hrs} credit hours", { n: codes.length, hrs }) },
        icon("book", "sm"), h("span", { class: "mono" }, codes.length), h("span", { style: "opacity:.4" }, "·"), h("span", { class: "mono" }, hrs + "h")),
      h("button", {
        type: "button", class: "icon-btn", style: armed ? "color:var(--destructive)" : null,
        title: armed ? t("Tap again to remove this term") : t("Remove term"), "aria-label": armed ? t("Confirm removing {term}", { term: termName(term.id) }) : t("Remove {term}", { term: termName(term.id) }),
        onclick: (e: MouseEvent) => {
          e.stopPropagation();
          if (codes.length && !armed) { ui.armed = armKey; render(); armLater(armKey); return; }
          ui.armed = null; state.plan.terms = terms.filter(x => x.id !== term.id); commit();
        },
      }, icon(armed ? "alert" : "trash", "sm"))),
    h("div", { class: "term-body" }, ...(rows.length ? rows : [h("p", { class: "empty-slot" }, focused ? t("Drag a class here, or use + in the library") : t("Empty"))])));
}

function checkRow(key: string, kind: "ok" | "bad" | "open", label: Kid, n: string, items: CheckItem[]): HTMLDetailsElement {
  const ic = icon(kind === "ok" ? "check" : kind === "bad" ? "alert" : "dashed", kind === "ok" ? "i-ok" : kind === "bad" ? "i-bad" : "i-open");
  const d = h("details", { class: "check", open: items.length > 0 && ui.openChecks.has(key) },
    h("summary", null, ic, h("span", { class: "lbl" }, label), n ? h("span", { class: "n" }, n) : null),
    items.length ? h("div", { class: "check-body" }, ...items.map(([text, fn]) => fn ? h("button", { type: "button", onclick: fn }, text) : h("span", null, text))) : null);
  d.addEventListener("toggle", () => { if (d.open) ui.openChecks.add(key); else ui.openChecks.delete(key); });
  return d;
}

function checksPane(ctx: PlanContext, terms: Term[], status: StatusOf): Kid[] {
  const { bad, headline, detail, tone } = planVerdict(ctx, terms, status);
  const heavy = terms.filter(t => termHours(t, ctx) > (isSummer(t.id) ? 9 : 18));
  const cap = COURSES.find(c => c.last) as Course;
  const capOk = ctx.taken.has(cap.code) || (ctx.where[cap.code] !== undefined && ctx.where[cap.code] === lastPlannedPos(ctx, terms));

  const goal = goalCheck();
  const checks = goal ? [checkRow("goal", goal.kind, goal.label, goal.n, goal.items)] : [];
  checks.push(...REQ_GROUPS.filter(g => g.id !== "elective").map(g => {
    const cs = COURSES.filter(c => c.req === g.id), open = cs.filter(c => status(c.code) === "open");
    return checkRow("g-" + g.id, open.length ? "open" : "ok", [h("i", { class: "gdot grp-" + g.id, style: "margin-right:6px" }), g.name], (cs.length - open.length) + "/" + cs.length,
      open.map((c): CheckItem => [c.code + " " + c.title, () => openCourse(c.code)]));
  }));
  checks.push(
    checkRow("prereq", bad.length ? "bad" : "ok", t("Prerequisites in order"), bad.length ? String(bad.length) : "",
      bad.map((b): CheckItem => [b.code + ": " + b.msg, () => openCourse(b.code)])),
    checkRow("cap", capOk ? "ok" : "open", t("Capstone in the last semester"), "",
      capOk ? [] : [[t("BUSA 4980 and BUSA 4990 go last"), () => openCourse(cap.code)]]),
    checkRow("load", heavy.length ? "bad" : "ok", t("No semester over 18 hours"), heavy.length ? String(heavy.length) : "",
      heavy.map((term): CheckItem => [termName(term.id) + ": " + t("{n} hours", { n: termHours(term, ctx) }), () => { ui.focusTerm = term.id; ui.pane.plan = "center"; render(); }])));

  return [scroller("checks",
    h("div", { class: "verdict" },
      h("div", { class: "kicker" }, t("Can I graduate?")),
      h("div", { class: "headline " + tone }, headline),
      h("div", { class: "detail" }, detail)),
    h("div", { class: "checks" }, ...checks),
    h("div", { class: "side-block" },
      terms.length
        ? h("button", { class: "btn primary", type: "button", onclick: fillIn, title: t("Puts each class in the earliest semester its prerequisites allow, at up to 15 hours (6 in summer)") }, icon("sparkles"), t("Fill in remaining classes"))
        : h("button", { class: "btn primary", type: "button", onclick: setUpSemesters }, t("Set up my semesters")),
      h("p", { class: "note" }, t("Based on the {catalog}. Confirm your plan with a Robinson advisor.", { catalog: CATALOG }))))];
}

export function setUpSemesters(): void {
  setupTerms(); commit();
  toast(state.profile.grad ? t("Added your semesters through {grad}.", { grad: state.profile.grad }) : t("Added your semesters through graduation."));
}
export function fillIn(): void {
  const r = autoPlan(); commit();
  toast(r.left.length
    ? t("Couldn't fit {list}, even at 18 hours a semester. Add a term, or check the red notes.", { list: listOf(r.left) })
    : r.stretched ? t("Everything fits, but only with some 18-hour semesters. Another term would lighten the load.")
    : t("Filled in your remaining required classes."));
}
