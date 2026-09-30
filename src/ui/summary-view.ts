// Summary view: a calm one-page report of the plan, and a plain-text copy for an advisor
import { CATALOG, COURSES, COURSE_BY_CODE, REQ_GROUPS } from "../data/courses";
import { SKILL_BY_ID } from "../data/skills";
import { STATUSES, STATUS_LABEL } from "../data/statuses";
import { earliestFinish, issuesFor, lastPlannedPos, planContext, planTerms, planVerdict, statusFn, termHours, termName } from "../lib/plan";
import { analyze, type HaveMap } from "../lib/skills";
import { state, ui } from "../lib/store";
import { backup, restore } from "./backup";
import { dialogHead, dlg } from "./dialogs";
import { h, icon, toast } from "./dom";
import { scroller } from "./render";

/** The plan as plain text, ready to paste into an email. */
export function planText(): string {
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
    dlg().replaceChildren(dialogHead(null, "Copy your plan", h("p", { class: "muted", style: "font-size:13px" }, "Copy this text and paste it into an email to your advisor.")),
      h("div", { class: "dlg-sec" }, ta));
    ta.value = text;
    if (!dlg().open) dlg().showModal();
    ta.focus(); ta.select();
  };
  try {
    navigator.clipboard.writeText(text).then(() => toast("Copied. Paste it into an email to your advisor."), fallback);
  } catch { fallback(); }
}

/** Course codes as separate tags, easier to scan than a long comma list. */
const codeList = (codes: string[]): HTMLElement => h("span", { class: "codes" }, ...codes.map(c => h("span", { class: "code-tag" }, c)));

export function summaryView(have: HaveMap): HTMLElement[] {
  const ctx = planContext(), terms = planTerms(), status = statusFn(ctx), v = planVerdict(ctx, terms, status), p = state.profile;
  const early = earliestFinish(), last = lastPlannedPos(ctx, terms);
  const facts: [string, string][] = [
    ["Status", v.headline],
    ["Planned through", last >= 0 ? termName(terms[last].id) : "Nothing planned yet"],
    ["Earliest possible", early ? (early.done ? "All required classes are done" : termName(early.id) + (early.stretched ? " (with an 18-hour semester)" : "")) : "More than 12 semesters out"],
    ["Graduation goal", p.grad || "Not set"],
  ];
  const reqRows = REQ_GROUPS.filter(g => g.id !== "elective").map(g => {
    const cs = COURSES.filter(c => c.req === g.id), open = cs.filter(c => status(c.code) === "open");
    return h("div", { class: "sum-row" }, h("span", { class: "k", style: "display:flex;align-items:center;gap:7px" }, h("i", { class: "gdot grp-" + g.id }), g.name),
      h("span", { class: "v" }, open.length ? [h("span", { class: "v-lbl" }, "Still to place"), codeList(open.map(c => c.code))] : "Done or planned"),
      h("span", { class: "n" }, (cs.length - open.length) + "/" + cs.length));
  });
  const termBlocks = terms.map((t, pos) => {
    const codes = t.codes.filter(c => !ctx.taken.has(c));
    return h("div", { class: "sum-term" },
      h("div", { class: "hd" }, h("span", null, termName(t.id)), h("span", { class: "mono muted", style: "font-weight:400;font-size:12px" }, codes.length + " classes · " + termHours(t, ctx) + "h")),
      ...(codes.length ? codes.map(code => {
        const c = COURSE_BY_CODE[code], iss = issuesFor(c, pos, ctx);
        return h("div", { class: "ln" }, h("span", { class: "mono" }, code), h("span", null, c.title),
          iss.hard.length ? h("span", { style: "color:var(--destructive);font-size:12px" }, iss.hard[0]) : h("span", { class: "mono muted", style: "font-size:12px" }, c.hrs + "h"));
      }) : [h("span", { class: "muted", style: "font-size:13px" }, "Nothing planned")]));
  });
  const done = COURSES.filter(c => ctx.taken.has(c.code));
  const byStatus = STATUSES.map((s): [string, number] => [STATUS_LABEL[s], state.postings.filter(x => x.status === s).length]).filter(([, n]) => n);
  const gaps: Record<string, number> = {};
  for (const post of state.postings) for (const s of analyze(post, have)) if (s.have !== "yes" && SKILL_BY_ID[s.id] && !have[s.id]) gaps[s.id] = (gaps[s.id] || 0) + 1;
  const topGaps = Object.entries(gaps).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => SKILL_BY_ID[id].name);
  return [scroller("summary", h("div", { class: "summary" },
    h("div", { class: "summary-head" },
      h("div", null, h("div", { class: "kicker" }, "Summary"),
        h("h1", null, (p.name ? p.name + "'s " : "") + "Accounting B.B.A. plan"),
        h("p", { class: "muted", style: "font-size:13px" }, [p.year, p.grad ? "graduating " + p.grad : null, "Georgia State University"].filter(Boolean).join(" · "))),
      h("div", { class: "acts" },
        h("button", { type: "button", class: "btn sm", onclick: backup }, "Back up"),
        h("button", { type: "button", class: "btn sm", onclick: restore }, "Restore"),
        h("button", { type: "button", class: "btn primary sm", onclick: copyPlan }, icon("copy"), "Copy for my advisor"))),
    h("section", { class: "card" }, ...facts.map(([k, val]) => h("div", { class: "sum-row" }, h("span", { class: "k" }, k), h("span", { class: "v" }, val), h("span")))),
    h("div", { class: "kicker", style: "margin-top:6px" }, "Requirements"),
    h("section", { class: "card" }, ...reqRows),
    h("div", { class: "kicker", style: "margin-top:6px" }, "Semesters"),
    h("section", { class: "card" }, ...(termBlocks.length ? termBlocks : [h("div", { class: "sum-term" }, h("span", { class: "muted" }, "No semesters yet. Set them up in Plan."))])),
    h("div", { class: "kicker", style: "margin-top:6px" }, "Done or in progress"),
    h("section", { class: "card" }, h("div", { class: "sum-row" }, h("span", { class: "k" }, done.length + " classes"),
      h("span", { class: "v" }, done.length ? codeList(done.map(c => c.code)) : "None marked yet"), h("span"))),
    h("div", { class: "kicker", style: "margin-top:6px" }, "Internships"),
    h("section", { class: "card" },
      h("div", { class: "sum-row" }, h("span", { class: "k" }, state.postings.length + " postings"),
        h("span", { class: "v" }, byStatus.length ? byStatus.map(([s, n]) => n + " " + s.toLowerCase()).join(" · ") : "None added yet"), h("span")),
      h("div", { class: "sum-row" }, h("span", { class: "k" }, "Skills to work on"),
        h("span", { class: "v" }, !state.postings.length ? "Add postings to see which skills they ask for" : topGaps.length ? topGaps.join(", ") : "Nothing missing from your postings"), h("span"))),
    h("p", { class: "note" }, "Based on the " + CATALOG + ". Confirm the plan with a Robinson advisor.")))];
}
