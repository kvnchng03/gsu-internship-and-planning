// The frame: header, view switcher, three-pane layout, and redraws that keep focus and scroll
import type { Kid, PaneId, ViewId } from "../types";
import { haveMap } from "../lib/skills";
import { state, ui } from "../lib/store";
import { renderDialog } from "./dialogs";
import { byId, h, icon } from "./dom";
import { openPalette } from "./palette";
import { canPromptInstall, promptInstall } from "./install";
import { planView } from "./plan-view";
import { postingsView } from "./postings-view";
import { scheduleView } from "./schedule-view";
import { skillsView } from "./skills-view";
import { summaryView } from "./summary-view";

type Tab = [label: string, icon: string];
interface ViewDef { id: ViewId; label: string; icon: string; tabs?: [Tab, Tab, Tab] }
export const VIEWS: ViewDef[] = [
  { id: "plan", label: "Plan", icon: "grid", tabs: [["Library", "list"], ["Plan", "grid"], ["Checks", "check"]] },
  { id: "postings", label: "Internships", icon: "briefcase" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "skills", label: "Skills", icon: "book", tabs: [["Mine", "user"], ["Guide", "book"], ["Studying", "half"]] },
  { id: "summary", label: "Summary", icon: "file" },
];

/** A destructive button asks twice. This disarms it if the second tap doesn't come. */
export function armLater(key: string): void { setTimeout(() => { if (ui.armed === key) { ui.armed = null; render(); } }, 3500); }

function renderTop(): void {
  const brand = byId("brand");
  if (!brand.firstChild) {
    brand.append(icon("cap"), h("span", { class: "name" }, "GSU Internship & Planning"));
    byId("saveState").before(h("button", { type: "button", class: "btn ghost sm", id: "palBtn", title: "Search everything (⌘K)", onclick: openPalette },
      icon("search"), h("span", { class: "kbd" }, "⌘K")));
  }
  const install = document.getElementById("installBtn");
  if (canPromptInstall() && !install) {
    byId("palBtn").before(h("button", { type: "button", class: "btn sm", id: "installBtn", title: "Install this app",
      onclick: async () => { await promptInstall(); render(); } }, icon("download"), h("span", { class: "lbl" }, "Install")));
  } else if (!canPromptInstall() && install) install.remove();
  byId("views").replaceChildren(...VIEWS.map(v =>
    h("button", { type: "button", "aria-pressed": String(ui.view === v.id), onclick: () => { ui.view = v.id; render(); } },
      icon(v.icon), h("span", { class: "lbl" }, v.label))));
}

/** Library | main | side panes. On phones, one pane at a time with tabs at the bottom. */
export function panes(parts: Record<PaneId, Kid[]>): HTMLElement[] {
  const view = ui.view as "plan" | "skills";
  const tabs = VIEWS.find(x => x.id === view)?.tabs;
  if (!tabs) throw new Error("No panes for " + view);
  const show = ui.pane[view];
  const keys: PaneId[] = ["left", "center", "right"];
  return [
    h("div", { class: "panes", "data-show": show },
      h("aside", { class: "pane side left", "aria-label": tabs[0][0] }, ...parts.left),
      h("main", { class: "pane center", "aria-label": tabs[1][0] }, ...parts.center),
      h("aside", { class: "pane side right", "aria-label": tabs[2][0] }, ...parts.right)),
    h("nav", { class: "mobile-tabs", "aria-label": "Sections" }, ...keys.map((k, i) =>
      h("button", { type: "button", "aria-pressed": String(show === k), onclick: () => { ui.pane[view] = k; render(); } },
        icon(tabs[i][1], "lg"), tabs[i][0]))),
  ];
}
/** A scrolling area whose position survives redraws. */
export const scroller = (key: string, ...kids: Kid[]): HTMLDivElement => h("div", { class: "scroll", "data-scroll": key }, ...kids);

export function render(): void {
  // Keep focus, caret and scroll positions across redraws
  const active = document.activeElement as HTMLElement | null, activeId = active && active.id;
  let caret: [number, number] | null = null;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    try { if (active.selectionStart != null && active.selectionEnd != null) caret = [active.selectionStart, active.selectionEnd]; } catch { /* some inputs have no caret */ }
  }
  const scrolls: Record<string, number> = {};
  document.querySelectorAll<HTMLElement>("#view [data-scroll]").forEach(el => { scrolls[el.dataset.scroll || ""] = el.scrollTop; });

  byId("exampleBanner").hidden = !state.example;
  renderTop();
  const have = haveMap(state.profile);
  const parts = ui.view === "plan" ? planView() : ui.view === "postings" ? postingsView(have) : ui.view === "calendar" ? scheduleView()
    : ui.view === "summary" ? summaryView(have) : skillsView(have);
  byId("view").replaceChildren(...parts.filter((x): x is HTMLElement => !!x));

  document.querySelectorAll<HTMLElement>("#view [data-scroll]").forEach(el => {
    const top = scrolls[el.dataset.scroll || ""];
    if (top != null) el.scrollTop = top;
  });
  if (activeId && active && !byId("dlg").contains(active)) {
    const el = document.getElementById(activeId);
    if (el && el !== document.activeElement) {
      el.focus({ preventScroll: true });
      if (caret && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
        try { el.setSelectionRange(caret[0], caret[1]); } catch { /* some inputs have no caret */ }
      }
    }
  }
  if (ui.dialog && ui.dialog.live) renderDialog();
}
