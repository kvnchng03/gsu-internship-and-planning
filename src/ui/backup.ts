// Back up and restore. On a static site the data lives only in this browser, so a file is how to keep it or move it.
import { commit, normalize, setState, state, ui } from "../lib/store";
import type { State } from "../types";
import { closeDialog, dialogHead, dlg } from "./dialogs";
import { h, toast } from "./dom";

export function backupText(): string {
  const { example: _example, ...data } = state;
  return JSON.stringify({ app: "internship-ledger", version: 1, savedAt: new Date().toISOString(), ...data }, null, 2);
}
export function backup(): void {
  const url = URL.createObjectURL(new Blob([backupText()], { type: "application/json" }));
  const a = h("a", { href: url, download: "internship-ledger-backup-" + new Date().toISOString().slice(0, 10) + ".json" });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("Backup saved. Check your Downloads folder.");
}
/** Asks for a backup file, shows what's in it, and replaces the data only after the student confirms. */
export function restore(): void {
  const input = h("input", { type: "file", accept: "application/json,.json" });
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let next: State;
      try {
        const raw: unknown = JSON.parse(String(reader.result));
        if (!raw || typeof raw !== "object" || !("profile" in raw)) throw new Error("not a backup");
        next = normalize(raw);
      } catch { toast("That file isn't an Internship Ledger backup."); return; }
      ui.dialog = { kind: "restore", live: false };
      dlg().classList.remove("palette", "wide");
      dlg().replaceChildren(
        dialogHead(null, "Restore this backup?", h("p", { class: "muted", style: "font-size:13px" },
          file.name + ": " + next.profile.classes.length + " classes, " + next.plan.terms.length + " semesters, " + next.postings.length
          + " postings. This replaces everything in the app now.")),
        h("div", { class: "dlg-foot" },
          h("button", { type: "button", class: "btn ghost", onclick: closeDialog }, "Cancel"),
          h("button", { type: "button", class: "btn primary", onclick: () => { setState(next); closeDialog(); commit(); toast("Backup restored."); } }, "Replace my data")));
      if (!dlg().open) dlg().showModal();
    };
    reader.readAsText(file);
  });
  input.click();
}
