// Command palette (⌘K): jump to any class, skill, or posting, or run an action
import type { ViewId } from "../types";
import { COURSES } from "../data/courses";
import { SKILLS } from "../data/skills";
import { addTerm } from "../lib/plan";
import { commit, state, ui } from "../lib/store";
import { backup, restore } from "./backup";
import { closeDialog, dlg, openCourse, openPosting, openPostingForm } from "./dialogs";
import { h, icon } from "./dom";
import { fillIn } from "./plan-view";
import { VIEWS, render } from "./render";
import { openSkill } from "./skills-view";
import { copyPlan } from "./summary-view";

interface Command { label: string; hint: string; run: () => void }

export function openPalette(): void {
  ui.dialog = { kind: "palette", live: false };
  const go = (view: ViewId) => () => { ui.view = view; render(); };
  const everything: Command[] = [
    { label: "Fill in remaining classes", hint: "Action", run: () => { ui.view = "plan"; fillIn(); } },
    { label: "Add a posting", hint: "Action", run: () => openPostingForm(null) },
    { label: "Add a term", hint: "Action", run: () => { addTerm(); ui.view = "plan"; commit(); } },
    { label: "Copy plan for my advisor", hint: "Action", run: copyPlan },
    { label: "Back up my data", hint: "Action", run: backup },
    { label: "Restore from a backup", hint: "Action", run: restore },
    ...VIEWS.map(v => ({ label: "Go to " + v.label, hint: "View", run: go(v.id) })),
    ...COURSES.map(c => ({ label: c.code + " " + c.title, hint: "Class", run: () => { ui.view = "plan"; render(); openCourse(c.code); } })),
    ...SKILLS.map(s => ({ label: s.name, hint: "Skill", run: () => openSkill(s.id) })),
    ...state.postings.map(p => ({ label: (p.company || "Untitled posting") + (p.role ? " · " + p.role : ""), hint: "Posting",
      run: () => { ui.view = "postings"; ui.postTab = "board"; render(); openPosting(p.id); } })),
  ];
  const input = h("input", { class: "input", id: "pal-q", type: "search", autocomplete: "off", placeholder: "Search classes, skills, postings, or actions…", "aria-label": "Search everything" });
  const list = h("div", { class: "pal-list", role: "listbox", "aria-label": "Results" });
  let items: Command[] = [], sel = 0;
  const mark = () => [...list.querySelectorAll(".pal-item")].forEach((el, i) => el.setAttribute("aria-selected", String(i === sel)));
  const run = (i: number) => { const it = items[i]; if (!it) return; closeDialog(); it.run(); };
  const draw = () => {
    const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    items = everything.filter(it => words.every(w => (it.label + " " + it.hint).toLowerCase().includes(w))).slice(0, 14);
    sel = Math.min(sel, Math.max(items.length - 1, 0));
    list.replaceChildren(...(items.length
      ? items.map((it, i) => h("button", { type: "button", class: "pal-item", role: "option", "aria-selected": String(i === sel),
          onmousemove: () => { if (sel !== i) { sel = i; mark(); } }, onclick: () => run(i) },
          h("span", { class: "pal-label" }, it.label), h("span", { class: "pal-hint" }, it.hint)))
      : [h("p", { class: "note", style: "padding:12px" }, "No matches.")]));
  };
  input.addEventListener("input", () => { sel = 0; draw(); });
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      sel = Math.max(0, Math.min(items.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1)));
      mark(); const el = list.querySelectorAll(".pal-item")[sel]; if (el) el.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") { e.preventDefault(); run(sel); }
  });
  dlg().classList.add("palette");
  dlg().replaceChildren(h("div", { class: "search pal-search" }, icon("search"), input), list);
  draw();
  if (!dlg().open) dlg().showModal();
  input.focus();
}

