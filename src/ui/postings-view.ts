// Internships view: the application board, one posting's details, resume help, and results across postings
import type { Kid, Posting, SkillHit, Status } from "../types";
import { CATEGORY, CAT_KEY, LINKS, SKILL_BY_ID } from "../data/skills";
import { STATUSES, STATUS_KEY, STATUS_LABEL } from "../data/statuses";
import { boardOrder, dueInfo, jobType, matchOf, setStatus, skillTally, togglePriority, type Due, type Tally } from "../lib/postings";
import { resumeAdvice, setLearning, shown, type HaveMap } from "../lib/skills";
import { commit, state, ui } from "../lib/store";
import { closeDialog, openPosting, openPostingForm } from "./dialogs";
import { STATUS_BADGE, STATUS_TEXT, fmt, h, icon, keyActivate, statusIcon, toast } from "./dom";
import { armLater, render, scroller } from "./render";
import { openSkill } from "./skills-view";

function resumeSection(skills: SkillHit[], have: HaveMap): HTMLElement {
  const clip = (t: string) => t.length > 120 ? t.slice(0, 117) + "…" : t;
  const adv = resumeAdvice(skills, have);
  const kids: HTMLElement[] = [h("div", { class: "kicker" }, "For your resume")];
  if (!adv) {
    kids.push(h("p", { class: "note" }, "Paste your resume bullets under ",
      h("button", { type: "button", style: "text-decoration:underline;text-underline-offset:2px", onclick: () => { ui.view = "skills"; ui.pane.skills = "left"; render(); const el = document.getElementById("p-resume"); if (el) el.focus(); } }, "Skills → Resume bullets"),
      " to see which ones to lead with for this job."));
    return h("div", { class: "card-sec" }, ...kids);
  }
  if (adv.lead.length) kids.push(h("div", { class: "rs-list" }, h("span", { class: "rs-h" }, "Lead with these bullets"),
    ...adv.lead.map(x => h("div", { class: "rs-item" }, h("span", null, clip(x.b)),
      h("span", { class: "chips" }, ...[...x.direct, ...x.implied].map(id => h("span", { class: "badge ok" }, SKILL_BY_ID[id].name)))))));
  if (adv.reword.length) kids.push(h("div", { class: "rs-list" }, h("span", { class: "rs-h" }, "Use this posting's words"),
    ...adv.reword.map(x => h("div", { class: "rs-item warn" },
      h("span", null, "Say ", h("b", null, "\u201C" + x.phrase + "\u201D"), " so resume filters catch it. This bullet already shows it:"),
      h("span", { class: "q" }, clip(x.bullet))))));
  if (adv.unshown.length) kids.push(h("div", { class: "rs-list" }, h("span", { class: "rs-h" }, "You have these, but no bullet shows them"),
    h("span", { class: "chips" }, ...adv.unshown.map(id => h("span", { class: "badge" }, SKILL_BY_ID[id].name)))));
  if (!adv.lead.length && !adv.reword.length && !adv.unshown.length) kids.push(h("p", { class: "note" }, "None of your bullets match what this posting asks for yet. Check the missing skills above."));
  return h("div", { class: "card-sec" }, ...kids);
}

export function postingsView(have: HaveMap): HTMLElement[] {
  const posts = state.postings;
  const urgent = (d: Due | null): d is Due => !!d && d.level !== "";
  const attention = posts.filter(p => urgent(dueInfo(p))).sort(boardOrder);
  const working = posts.filter(p => p.status === "In progress").length;
  const bar = h("div", { class: "ptop" },
    h("div", { class: "seg", role: "group", "aria-label": "Internships view" },
      h("button", { type: "button", "aria-pressed": String(ui.postTab === "board"), onclick: () => { ui.postTab = "board"; render(); } }, icon("grid"), h("span", { class: "lbl" }, "Board")),
      h("button", { type: "button", "aria-pressed": String(ui.postTab === "results"), onclick: () => { ui.postTab = "results"; render(); } }, icon("chart"), h("span", { class: "lbl" }, "Results"))),
    h("div", { class: "pstats" },
      h("span", null, h("b", { class: "mono" }, posts.length), " saved"),
      h("span", null, h("b", { class: "mono" }, working), " working on"),
      h("span", { class: attention.some(p => dueInfo(p)?.level !== "soon") ? "hot" : "" }, h("b", { class: "mono" }, attention.length), " due soon")),
    h("span", { class: "spacer" }),
    h("button", { type: "button", class: "btn primary sm", onclick: () => openPostingForm(null) }, icon("plus"), "Add a posting"));
  if (!posts.length) {
    return [bar, h("main", { class: "pane center", style: "flex:1" }, scroller("board-empty", h("div", { class: "empty-state" },
      icon("briefcase", "lg"), h("h3", null, "No postings yet"),
      h("p", null, "Find internships on Handshake, LinkedIn, or firm careers pages, then add them here to track them."),
      h("button", { class: "btn primary", type: "button", onclick: () => openPostingForm(null) }, icon("plus"), "Add a posting"))))];
  }
  if (ui.postTab === "results") return [bar, h("main", { class: "pane center", style: "flex:1" }, ...resultsView(have))];
  const strip = attention.length ? h("div", { class: "attn" },
    h("span", { class: "attn-h" }, icon("alert", "sm"), "Needs attention"),
    ...attention.map(p => { const d = dueInfo(p) as Due; return h("button", { type: "button", class: "attn-item lvl-" + d.level, onclick: () => openPosting(p.id) },
      h("b", null, p.company || "Untitled"), h("span", { class: "mono" }, d.text)); })) : null;
  const cols = STATUSES.map(st => {
    const list = posts.filter(p => p.status === st).sort(boardOrder);
    return h("section", {
      class: "kcol st-" + STATUS_KEY[st], "aria-label": STATUS_LABEL[st],
      ondragover: (e: DragEvent) => {
        if (!e.dataTransfer?.types.includes("text/x-posting")) return;
        e.preventDefault(); (e.currentTarget as HTMLElement).classList.add("drop");
      },
      ondragleave: (e: DragEvent) => { const el = e.currentTarget as HTMLElement; if (!el.contains(e.relatedTarget as Node | null)) el.classList.remove("drop"); },
      ondrop: (e: DragEvent) => {
        e.preventDefault(); (e.currentTarget as HTMLElement).classList.remove("drop");
        const id = e.dataTransfer?.getData("text/x-posting");
        const p = state.postings.find(x => x.id === id);
        if (p) setStatus(p, st);
      },
    },
      h("header", { class: "kcol-head" }, h("i", { class: "sdot" }), h("span", null, STATUS_LABEL[st]), h("span", { class: "n mono" }, list.length)),
      h("div", { class: "kcol-body" }, ...(list.length ? list.map(p => boardCard(p, have)) : [h("p", { class: "kempty" }, "Drag a card here")])));
  });
  return [bar, h("main", { class: "pane center", style: "flex:1" }, scroller("kanban", strip, h("div", { class: "kanban" }, ...cols)))];
}

function boardCard(p: Posting, have: HaveMap): HTMLElement {
  const m = matchOf(p, have), d = dueInfo(p);
  return h("article", {
    class: "kcard st-" + STATUS_KEY[p.status] + (d && d.level ? " lvl-" + d.level : "") + (p.priority ? " prio" : ""),
    role: "button", tabindex: "0", draggable: "true",
    onclick: () => openPosting(p.id), onkeydown: keyActivate(() => openPosting(p.id)),
    ondragstart: (e: DragEvent) => { e.dataTransfer?.setData("text/x-posting", p.id); if (e.dataTransfer) e.dataTransfer.effectAllowed = "move"; },
  },
    h("div", { class: "k1" },
      h("span", { class: "co" }, p.company || "Untitled posting"),
      h("button", { type: "button", class: "star" + (p.priority ? " on" : ""), "aria-pressed": String(p.priority), title: p.priority ? "Remove priority" : "Mark as priority",
        "aria-label": (p.priority ? "Remove priority from " : "Mark as priority: ") + (p.company || "posting"),
        onclick: (e: MouseEvent) => { e.stopPropagation(); togglePriority(p); } }, icon("star", "sm"))),
    p.role ? h("span", { class: "ro" }, p.role) : null,
    h("div", { class: "k3" },
      d ? h("span", { class: "due lvl-" + (d.level || "none") }, d.level === "overdue" || d.level === "urgent" ? icon("alert", "sm") : icon("clock", "sm"), d.text) : h("span", { class: "due lvl-none" }, "No deadline"),
      m.total ? h("span", { class: "mono match", title: "Skills matched" }, fmt(m.score) + "/" + m.total) : null));
}

/** The full view of one posting, shown in a dialog from the board. */
export function postingCard(p: Posting, have: HaveMap): HTMLElement {
  const m = matchOf(p, have), due = dueInfo(p);
  const view = (s: SkillHit) => shown(s.id, s.have);
  const order = { yes: 0, learning: 1, partly: 2, no: 3 };
  const skills = m.skills.slice().sort((a, b) => order[view(a)] - order[view(b)]);
  const armKey = "del-" + p.id, armed = ui.armed === armKey;
  const secs: HTMLElement[] = [];
  secs.push(h("div", { class: "card-head st-" + STATUS_KEY[p.status], style: "border-top:4px solid var(--s);border-radius:14px 14px 0 0" },
    h("div", { class: "t" },
      state.example ? h("span", { class: "kicker" }, "Example") : null,
      h("h2", null, p.company || "Untitled posting"),
      p.role ? h("p", { class: "muted", style: "font-size:13px" }, p.role) : null,
      h("div", { class: "chips", style: "margin-top:4px" },
        due ? h("span", { class: "due lvl-" + (due.level || "none") }, due.text) : null,
        p.link ? h("a", { class: "badge", href: p.link, target: "_blank", rel: "noopener", style: "text-decoration:none" }, "Open posting", icon("external", "sm")) : null)),
    h("button", { type: "button", class: "star" + (p.priority ? " on" : ""), "aria-pressed": String(p.priority), title: p.priority ? "Remove priority" : "Mark as priority", onclick: () => togglePriority(p) }, icon("star")),
    h("select", { class: "input", id: "status-" + p.id, style: "width:auto;height:28px;font-size:12px", "aria-label": "Status",
      onchange: (e: Event) => setStatus(p, (e.target as HTMLSelectElement).value as Status) }, ...STATUSES.map(s => h("option", { value: s, selected: s === p.status }, STATUS_LABEL[s]))),
    h("button", { type: "button", class: "icon-btn", "aria-label": "Edit posting", title: "Edit", onclick: () => openPostingForm(p) }, icon("pencil", "sm")),
    h("button", { type: "button", class: "icon-btn", style: armed ? "color:var(--destructive)" : null, "aria-label": armed ? "Confirm delete" : "Delete posting", title: armed ? "Tap again to delete" : "Delete",
      onclick: () => {
        if (!armed) { ui.armed = armKey; render(); armLater(armKey); return; }
        ui.armed = null; state.postings = state.postings.filter(x => x.id !== p.id); closeDialog(); commit(); toast("Posting deleted.");
      } }, icon(armed ? "alert" : "trash", "sm")),
    h("button", { type: "button", class: "icon-btn", "aria-label": "Close", onclick: closeDialog }, icon("x"))));
  if (m.total) {
    secs.push(h("div", { class: "card-sec" },
      h("div", { class: "meter" },
        h("span", { class: "big" }, fmt(m.score) + "/" + m.total),
        h("div", { style: "display:grid;gap:4px" }, h("span", { class: "kicker" }, "Skills matched"),
          h("div", { class: "ticks", "aria-hidden": "true" }, ...skills.map(s => h("span", { class: "tick " + view(s), title: s.name }))))),
      h("div", null, ...skills.map(s => h("button", {
        type: "button", class: "skill-line", title: SKILL_BY_ID[s.id] ? "Open in the skill guide" : null,
        onclick: () => { if (SKILL_BY_ID[s.id]) openSkill(s.id); },
      }, statusIcon(view(s)), h("span", { class: "nm" }, s.name), h("span", { class: "st" }, STATUS_TEXT[view(s)]))))));
  } else {
    secs.push(h("div", { class: "card-sec" }, h("p", { class: "muted" }, p.text.trim()
      ? "No skills from the accounting list turned up in this text."
      : "Edit the posting and paste its text to see which skills it asks for.")));
  }
  secs.push(resumeSection(m.skills, have));
  if (p.text.trim()) secs.push(h("div", { class: "card-sec" }, h("details", { class: "raw" }, h("summary", null, "Posting text"), h("pre", null, p.text))));
  return h("article", null, ...secs);
}

/** What all saved postings ask for, and what to study next. */
function resultsView(have: HaveMap): HTMLElement[] {
  const posts = state.postings, n = posts.length;
  const rows = skillTally(have, posts);
  const pct = (c: number) => Math.round(100 * c / n);
  const status = (r: Tally) => shown(r.id, r.have);
  const next = rows.filter(r => SKILL_BY_ID[r.id] && !["yes", "learning"].includes(status(r))).slice(0, 3);
  const matches = posts.map(p => matchOf(p, have)).filter(m => m.total);
  const avg = matches.length ? Math.round(100 * matches.reduce((a, m) => a + m.score / m.total, 0) / matches.length) : null;
  const haveCount = rows.filter(r => status(r) === "yes").length;

  const tile = (label: string, value: string, sub: string) => h("div", { class: "tile" }, h("span", { class: "kicker" }, label), h("span", { class: "tv mono" }, value), sub ? h("span", { class: "note" }, sub) : null);
  const kids: Kid[] = [
    h("div", { style: "display:grid;gap:2px" }, h("span", { class: "kicker" }, "Results"),
      h("h2", { style: "font-size:20px;font-weight:600;letter-spacing:-0.01em" }, "What your " + n + " posting" + (n === 1 ? " asks" : "s ask") + " for"),
      n < 5 ? h("p", { class: "note" }, "Add at least 5 postings for results you can rely on.") : null),
    h("div", { class: "tiles" },
      tile("Average match", avg == null ? "–" : avg + "%", "of each posting's skills"),
      tile("Skills asked for", String(rows.length), "across all postings"),
      tile("You have", haveCount + "/" + rows.length, "of those skills")),
  ];

  if (next.length) kids.push(h("section", { class: "card" },
    h("div", { class: "card-sec", style: "border-top:0" }, h("div", { class: "kicker" }, "Study next"),
      h("p", { class: "note" }, "The skills these postings ask for most that you don't have yet.")),
    ...next.map((r, i) => {
      const link = LINKS[r.id] && LINKS[r.id][0];
      return h("div", { class: "card-sec next-row" },
        h("span", { class: "rank mono" }, i + 1),
        h("div", { style: "display:grid;gap:2px;min-width:0;flex:1" },
          h("button", { type: "button", class: "nm", onclick: () => openSkill(r.id) }, r.name),
          h("span", { class: "note" }, "Asked for in " + r.count + " of " + n + " postings (" + pct(r.count) + "%)" + (status(r) === "partly" ? ". You're partly there from your classes." : "."))),
        link ? h("a", { class: "badge", href: link[1], target: "_blank", rel: "noopener", style: "text-decoration:none" }, "Learn free", icon("external", "sm")) : null,
        h("button", { type: "button", class: "btn sm", onclick: () => { setLearning(r.id, true); commit(); toast("Added " + r.name + " to Studying now."); } }, icon("half"), "Start studying"));
    })));

  kids.push(h("section", { class: "card" },
    h("div", { class: "card-sec", style: "border-top:0" }, h("div", { class: "kicker" }, "Most requested skills"),
      h("p", { class: "note" }, "Every skill these postings ask for, from most to least common. Tap one to learn about it.")),
    h("div", { class: "card-sec", style: "gap:2px" }, ...rows.map(r => h("button", { type: "button", class: "freq-row", onclick: () => { if (SKILL_BY_ID[r.id]) openSkill(r.id); } },
      statusIcon(status(r)),
      h("span", { class: "nm" }, r.name),
      CAT_KEY[r.id] ? h("span", { class: "cat cat-" + CAT_KEY[r.id] }, CATEGORY[r.id]) : h("span"),
      h("span", { class: "fbar" }, h("span", { class: "s-" + status(r), style: "width:" + pct(r.count) + "%" })),
      h("span", { class: "mono fn" }, r.count + "/" + n),
      h("span", { class: "badge " + STATUS_BADGE[status(r)][0] }, STATUS_BADGE[status(r)][1]))))));

  const byType: Record<string, Posting[]> = {};
  for (const p of posts) (byType[jobType(p)] = byType[jobType(p)] || []).push(p);
  const types = Object.entries(byType).sort((a, b) => b[1].length - a[1].length);
  kids.push(h("section", { class: "card" },
    h("div", { class: "card-sec", style: "border-top:0" }, h("div", { class: "kicker" }, "By type of internship"),
      h("p", { class: "note" }, "Different jobs look for different things. Sorted from the type you've saved most.")),
    ...types.map(([name, list]) => {
      const top = skillTally(have, list).slice(0, 6);
      return h("div", { class: "card-sec" },
        h("div", { style: "display:flex;justify-content:space-between;gap:8px" }, h("b", { style: "font-size:13.5px" }, name),
          h("span", { class: "mono muted", style: "font-size:12px" }, list.length + (list.length === 1 ? " posting" : " postings"))),
        h("div", { class: "chips" }, ...top.map(r => h("button", { type: "button", class: "chip", onclick: () => { if (SKILL_BY_ID[r.id]) openSkill(r.id); } },
          statusIcon(status(r)), r.name, h("span", { class: "mono muted", style: "font-size:11px" }, r.count + "/" + list.length)))));
    })));
  kids.push(h("section", { class: "card" }, h("div", { class: "card-sec", style: "border-top:0" },
    h("div", { class: "kicker" }, "Where to find more postings"),
    h("p", { class: "note" }, "Handshake (GSU's job board) and Robinson career fairs · Big 4 and national firm careers pages (RSM, Grant Thornton, BDO, Crowe) · Atlanta CPA firms via the Georgia Society of CPAs · GSU groups: Beta Alpha Psi, Tau Alpha Chi, NABA, ALPFA, ASCEND."),
    h("p", { class: "note" }, "Many firms fill next summer's internships in the fall of junior year. Busy-season internships run about January to April."))));
  return [scroller("results", h("div", { class: "post-detail" }, ...kids))];
}
