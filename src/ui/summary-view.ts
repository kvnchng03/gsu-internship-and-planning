// Summary view: a calm one-page report of the plan, and a plain-text copy for an advisor
import { CATALOG, COURSES, COURSE_BY_CODE, REQ_GROUPS } from "../data/courses";
import { SKILL_BY_ID } from "../data/skills";
import { STATUSES, statusLabel } from "../data/statuses";
import { inLang, t } from "../lib/i18n";
import { earliestFinish, issuesFor, lastPlannedPos, planContext, planTerms, planVerdict, statusFn, termHours, termName } from "../lib/plan";
import { analyze, type HaveMap } from "../lib/skills";
import { state, ui } from "../lib/store";
import { backup, restore } from "./backup";
import { dialogHead, dlg } from "./dialogs";
import { h, icon, toast } from "./dom";
import { scroller } from "./render";

/** The plan as plain text, ready to paste into an email. Always English: it's written for the advisor. */
export function planText(): string { return inLang("en", planTextNow); }
function planTextNow(): string {
  const ctx = planContext(), terms = planTerms(), status = statusFn(ctx), v = planVerdict(ctx, terms, status), p = state.profile;
  const early = earliestFinish();
  const lines: string[] = [];
  lines.push("Accounting B.B.A. plan" + (p.name ? " for " + p.name : "") + (p.grad ? ", graduating " + p.grad : ""));
  lines.push("Status: " + v.headline + ".");
  if (early && !early.done) lines.push("Earliest possible finish: " + termName(early.id) + (early.stretched ? " (with an 18-hour semester)" : "") + ".");
  const done = COURSES.filter(c => ctx.taken.has(c.code)).map(c => c.code);
  if (done.length) lines.push("", "Done or in progress: " + done.join(", "));
  for (const t of terms) {
    const codes = t.codes.filter(c => !ctx.taken.has(c));
    if (!codes.length) continue;
    lines.push("", termName(t.id) + " (" + termHours(t, ctx) + " hrs)");
    for (const code of codes) lines.push("  " + code + "  " + COURSE_BY_CODE[code].title);
  }
  if (v.open.length) lines.push("", "Not planned yet: " + v.open.join(", "));
  lines.push("", "Based on the " + CATALOG + ".");
  return lines.join("\n");
}
export function copyPlan(): void {
  const text = planText();
  const fallback = () => {
    ui.dialog = { kind: "copy", live: false };
    const ta = h("textarea", { class: "input", id: "copy-text", readonly: true, style: "min-height:260px;font-family:var(--font-mono);font-size:12px" });
    dlg().replaceChildren(dialogHead(null, t("Copy your plan"), h("p", { class: "muted", style: "font-size:13px" }, t("Copy this text and paste it into an email to your advisor."))),
      h("div", { class: "dlg-sec" }, ta));
    ta.value = text;
    if (!dlg().open) dlg().showModal();
    ta.focus(); ta.select();
  };
  try {
    navigator.clipboard.writeText(text).then(() => toast(t("Copied (in English). Paste it into an email to your advisor.")), fallback);
  } catch { fallback(); }
}

/** Course codes as separate tags, easier to scan than a long comma list. */
const codeList = (codes: string[]): HTMLElement => h("span", { class: "codes" }, ...codes.map(c => h("span", { class: "code-tag" }, c)));

export function summaryView(have: HaveMap): HTMLElement[] {
  const ctx = planContext(), terms = planTerms(), status = statusFn(ctx), v = planVerdict(ctx, terms, status), p = state.profile;
  const early = earliestFinish(), last = lastPlannedPos(ctx, terms);
  const facts: [string, string][] = [
    [t("Status"), v.headline],
    [t("Planned through"), last >= 0 ? termName(terms[last].id) : t("Nothing planned yet")],
    [t("Earliest possible"), early ? (early.done ? t("All required classes are done") : early.stretched ? t("{term} (with an 18-hour semester)", { term: termName(early.id) }) : termName(early.id)) : t("More than 12 semesters out")],
    [t("Graduation goal"), p.grad || t("Not set")],
  ];
  const reqRows = REQ_GROUPS.filter(g => g.id !== "elective").map(g => {
    const cs = COURSES.filter(c => c.req === g.id), open = cs.filter(c => status(c.code) === "open");
    return h("div", { class: "sum-row" }, h("span", { class: "k", style: "display:flex;align-items:center;gap:7px" }, h("i", { class: "gdot grp-" + g.id }), g.name),
      h("span", { class: "v" }, open.length ? [h("span", { class: "v-lbl" }, t("Still to place")), codeList(open.map(c => c.code))] : t("Done or planned")),
      h("span", { class: "n" }, (cs.length - open.length) + "/" + cs.length));
  });
  const termBlocks = terms.map((term, pos) => {
    const codes = term.codes.filter(c => !ctx.taken.has(c));
    return h("div", { class: "sum-term" },
      h("div", { class: "hd" }, h("span", null, termName(term.id)), h("span", { class: "mono muted", style: "font-weight:400;font-size:12px" }, t("{n} classes", { n: codes.length }) + " · " + termHours(term, ctx) + "h")),
      ...(codes.length ? codes.map(code => {
        const c = COURSE_BY_CODE[code], iss = issuesFor(c, pos, ctx);
        return h("div", { class: "ln" }, h("span", { class: "mono" }, code), h("span", null, c.title),
          iss.hard.length ? h("span", { style: "color:var(--destructive);font-size:12px" }, iss.hard[0]) : h("span", { class: "mono muted", style: "font-size:12px" }, c.hrs + "h"));
      }) : [h("span", { class: "muted", style: "font-size:13px" }, t("Nothing planned"))]));
  });
  const done = COURSES.filter(c => ctx.taken.has(c.code));
  const byStatus = STATUSES.map((s): [string, number] => [statusLabel(s), state.postings.filter(x => x.status === s).length]).filter(([, n]) => n);
  const gaps: Record<string, number> = {};
  for (const post of state.postings) for (const s of analyze(post, have)) if (s.have !== "yes" && SKILL_BY_ID[s.id] && !have[s.id]) gaps[s.id] = (gaps[s.id] || 0) + 1;
  const topGaps = Object.entries(gaps).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => SKILL_BY_ID[id].name);
  return [scroller("summary", h("div", { class: "summary" },
    h("div", { class: "summary-head" },
      h("div", null, h("div", { class: "kicker" }, t("Summary")),
        h("h1", null, p.name ? t("{name}'s Accounting B.B.A. plan", { name: p.name }) : t("Accounting B.B.A. plan")),
        h("p", { class: "muted", style: "font-size:13px" }, [p.year ? t(p.year) : null, p.grad ? t("graduating {grad}", { grad: p.grad }) : null, "Georgia State University"].filter(Boolean).join(" · "))),
      h("div", { class: "acts" },
        h("button", { type: "button", class: "btn sm", onclick: backup }, t("Back up")),
        h("button", { type: "button", class: "btn sm", onclick: restore }, t("Restore")),
        h("button", { type: "button", class: "btn primary sm", onclick: copyPlan, title: t("Copies the plan in English, for your advisor") }, icon("copy"), t("Copy for my advisor")))),
    h("section", { class: "card" }, ...facts.map(([key, val]) => h("div", { class: "sum-row" }, h("span", { class: "k" }, key), h("span", { class: "v" }, val), h("span")))),
    h("div", { class: "kicker", style: "margin-top:6px" }, t("Requirements")),
    h("section", { class: "card" }, ...reqRows),
    h("div", { class: "kicker", style: "margin-top:6px" }, t("Semesters")),
    h("section", { class: "card" }, ...(termBlocks.length ? termBlocks : [h("div", { class: "sum-term" }, h("span", { class: "muted" }, t("No semesters yet. Set them up in Plan.")))])),
    h("div", { class: "kicker", style: "margin-top:6px" }, t("Done or in progress")),
    h("section", { class: "card" }, h("div", { class: "sum-row" }, h("span", { class: "k" }, t("{n} classes", { n: done.length })),
      h("span", { class: "v" }, done.length ? codeList(done.map(c => c.code)) : t("None marked yet")), h("span"))),
    h("div", { class: "kicker", style: "margin-top:6px" }, t("Internships")),
    h("section", { class: "card" },
      h("div", { class: "sum-row" }, h("span", { class: "k" }, t("{n} postings", { n: state.postings.length })),
        h("span", { class: "v" }, byStatus.length ? byStatus.map(([s, n]) => n + " " + s.toLowerCase()).join(" · ") : t("None added yet")), h("span")),
      h("div", { class: "sum-row" }, h("span", { class: "k" }, t("Skills to work on")),
        h("span", { class: "v" }, !state.postings.length ? t("Add postings to see which skills they ask for") : topGaps.length ? topGaps.join(", ") : t("Nothing missing from your postings")), h("span"))),
    h("p", { class: "note" }, t("Based on the {catalog}. Confirm your plan with a Robinson advisor.", { catalog: CATALOG }))))];
}
