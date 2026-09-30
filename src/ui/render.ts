// The frame: header, view switcher, three-pane layout, and redraws that keep focus and scroll
import type { Kid, PaneId, ViewId } from "../types";
import { haveMap } from "../lib/skills";
import { state, ui } from "../lib/store";
import { renderDialog } from "./dialogs";
import { byId, h, icon, rich } from "./dom";
import { k, lang, setLang, t } from "../lib/i18n";
import { setSave } from "../lib/store";
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
  { id: "plan", label: k("Plan"), icon: "grid", tabs: [[k("Library"), "list"], [k("Plan"), "grid"], [k("Checks"), "check"]] },
  { id: "postings", label: k("Internships"), icon: "briefcase" },
  { id: "calendar", label: k("Calendar"), icon: "calendar" },
  { id: "skills", label: k("Skills"), icon: "book", tabs: [[k("Mine"), "user"], [k("Guide"), "book"], [k("Studying"), "half"]] },
  { id: "summary", label: k("Summary"), icon: "file" },
];

/** A destructive button asks twice. This disarms it if the second tap doesn't come. */
export function armLater(key: string): void { setTimeout(() => { if (ui.armed === key) { ui.armed = null; render(); } }, 3500); }

function renderTop(): void {
  const brand = byId("brand");
  if (!brand.firstChild) {
    brand.append(icon("cap"), h("span", { class: "name" }, "GSU Internship & Planning"));
    byId("saveState").before(h("button", { type: "button", class: "btn ghost sm", id: "palBtn", onclick: openPalette },
      icon("search"), h("span", { class: "kbd" }, "⌘K")));
  }
  byId("palBtn").title = t("Search everything (⌘K)");
  // Rebuilt each time so their words follow the language
  document.getElementById("installBtn")?.remove();
  document.getElementById("langBtn")?.remove();
  if (canPromptInstall()) {
    byId("palBtn").before(h("button", { type: "button", class: "btn sm", id: "installBtn", title: t("Install this app"),
      onclick: async () => { await promptInstall(); render(); } }, icon("download"), h("span", { class: "lbl" }, t("Install"))));
  }
  // Each language is named in itself, so the button makes sense to whoever needs it
  const vi = lang() === "vi";
  byId("palBtn").before(h("button", {
    type: "button", class: "btn ghost sm lang-btn", id: "langBtn", lang: vi ? "en" : "vi",
    title: vi ? "Switch to English" : "Chuyển sang tiếng Việt", "aria-label": vi ? "Switch to English" : "Chuyển sang tiếng Việt",
    onclick: () => { setLang(vi ? "en" : "vi"); setSave(state.example ? "example" : "local"); render(); },
  }, h("span", { class: "long" }, vi ? "English" : "Tiếng Việt"), h("span", { class: "short" }, vi ? "EN" : "VI")));
  byId("bannerWide").replaceChildren(...rich(t("You're looking at **example data**. Nothing here is saved.")));
  byId("bannerNarrow").replaceChildren(...rich(t("**Example data.** Nothing is saved.")));
  byId("startOwn").textContent = t("Start my own");
  const pick = (v: ViewDef) => () => { ui.view = v.id; render(); };
  // Computers switch views in the header; phones use the tab bar at the bottom and show the view's name up top
  byId("views").replaceChildren(...VIEWS.map(v =>
    h("button", { type: "button", "aria-pressed": String(ui.view === v.id), onclick: pick(v) },
      icon(v.icon), h("span", { class: "lbl" }, t(v.label)))));
  byId("tabbar").replaceChildren(...VIEWS.map(v =>
    h("button", { type: "button", "aria-pressed": String(ui.view === v.id), onclick: pick(v) }, icon(v.icon, "lg"), t(v.label))));
  byId("viewTitle").textContent = t(VIEWS.find(v => v.id === ui.view)?.label || "");
}

/** Library | main | side panes. On phones, one pane at a time, picked with tabs at the top. */
export function panes(parts: Record<PaneId, Kid[]>): HTMLElement[] {
  const view = ui.view as "plan" | "skills";
  const tabs = VIEWS.find(x => x.id === view)?.tabs;
  if (!tabs) throw new Error("No panes for " + view);
  const show = ui.pane[view];
  const keys: PaneId[] = ["left", "center", "right"];
  return [
    h("nav", { class: "pane-tabs", "aria-label": t("Sections") }, h("div", { class: "seg" }, ...keys.map((key, i) =>
      h("button", { type: "button", "aria-pressed": String(show === key), onclick: () => { ui.pane[view] = key; render(); } },
        icon(tabs[i][1]), t(tabs[i][0]))))),
    h("div", { class: "panes", "data-show": show },
      h("aside", { class: "pane side left", "aria-label": t(tabs[0][0]) }, ...parts.left),
      h("main", { class: "pane center", "aria-label": t(tabs[1][0]) }, ...parts.center),
      h("aside", { class: "pane side right", "aria-label": t(tabs[2][0]) }, ...parts.right)),
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
