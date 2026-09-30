// Entry point: styles, wiring, and first draw
import "./styles.css";
import { commit, setRenderer, setSave, setState, starterState, state, ui } from "./lib/store";
import { closeDialog, dlg } from "./ui/dialogs";
import { byId, toast } from "./ui/dom";
import { openPalette } from "./ui/palette";
import { render } from "./ui/render";
import { registerSW } from "virtual:pwa-register";
import { checkDeadlines } from "./ui/alerts";
import { watchInstall } from "./ui/install";
import { VIEWS } from "./ui/render";
import { watchSwipe } from "./ui/swipe";
import { lang, t } from "./lib/i18n";

dlg().addEventListener("close", () => { ui.dialog = null; dlg().classList.remove("palette"); });
dlg().addEventListener("click", e => { if (e.target === dlg()) closeDialog(); });
document.addEventListener("keydown", e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if (ui.dialog && ui.dialog.kind === "palette") closeDialog(); else openPalette();
  }
});
byId("startOwn").addEventListener("click", () => {
  setState(starterState()); ui.view = "plan"; ui.libFilter = "all"; ui.pane.plan = "left"; commit();
  toast(t("Started your own plan. First, mark the GSU classes you've taken."));
});

document.documentElement.lang = lang();
setRenderer(render);
render();
setSave(state.example ? "example" : "local");

// Works offline and updates itself in the background. An installed phone app is usually resumed rather than
// reloaded, so it also checks for a new version each time it comes back to the front.
registerSW({ immediate: true, onRegisteredSW: (_url, reg) => {
  if (reg) document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void reg.update(); });
} });
// Phones: swipe sideways to move between the views in the tab bar
watchSwipe(byId("view"), () => getComputedStyle(byId("tabbar")).display !== "none", step => {
  const next = VIEWS[VIEWS.findIndex(v => v.id === ui.view) + step];
  if (!next || ui.dialog) return false;
  ui.view = next.id; render();
  return true;
});
watchInstall(render);
// Alert about urgent deadlines when the app opens or comes back to the front
void checkDeadlines();
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void checkDeadlines(); });
