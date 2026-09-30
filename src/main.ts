// Entry point: styles, wiring, and first draw
import "./styles.css";
import { commit, setRenderer, setSave, setState, starterState, state, ui } from "./lib/store";
import { closeDialog, dlg } from "./ui/dialogs";
import { byId, toast } from "./ui/dom";
import { openPalette } from "./ui/palette";
import { render } from "./ui/render";

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
  toast("Started your own plan. First, mark the GSU classes you've taken.");
});

setRenderer(render);
render();
setSave(state.example ? "example" : "local");
