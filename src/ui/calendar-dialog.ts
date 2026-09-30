// Deadlines & reminders: Google Calendar sync, a calendar file, and deadline alerts, in one dialog
import { deadlineEvents, toIcs } from "../lib/calendar";
import { state, ui } from "../lib/store";
import { alertsOn, alertsSupported, enableAlerts } from "./alerts";
import { dialogHead, dlg } from "./dialogs";
import { h, icon, toast } from "./dom";
import { googleSyncAvailable, syncToGoogle } from "./google-calendar";
import { canPromptInstall, isInstalled, isIos, promptInstall } from "./install";

export function openCalendar(): void {
  dlg().classList.remove("palette", "wide");
  ui.dialog = { kind: "calendar", live: false };
  drawCalendar();
  if (!dlg().open) dlg().showModal();
}

function drawCalendar(busy = false): void {
  const events = deadlineEvents(state.postings);
  const n = events.length;
  const sections: HTMLElement[] = [
    dialogHead(null, "Deadlines & reminders",
      h("p", { class: "muted", style: "font-size:13px" }, n
        ? n + " application deadline" + (n === 1 ? "" : "s") + " still ahead of you. Put them in your calendar so your phone reminds you."
        : "None of your saved postings has a deadline you still need to apply by.")),
  ];
  if (googleSyncAvailable()) {
    sections.push(h("div", { class: "dlg-sec" },
      h("div", { class: "kicker" }, "Google Calendar"),
      h("p", { class: "note" }, "Adds each deadline to your Google Calendar, with phone reminders at 9am three days before and the day before. Sync again after changes; it updates the same events instead of adding copies."),
      h("div", { class: "acts" }, h("button", {
        type: "button", class: "btn primary sm", disabled: busy || !n,
        onclick: async () => {
          drawCalendar(true);
          try {
            const r = await syncToGoogle(events);
            toast("Google Calendar updated: " + r.added + " added, " + r.updated + " updated, " + r.removed + " removed.");
          } catch (e) { toast(e instanceof Error ? e.message : "Google Calendar sync didn't finish."); }
          if (ui.dialog?.kind === "calendar") drawCalendar();
        },
      }, icon("calendar"), busy ? "Syncing…" : "Sync to Google Calendar"))));
  }
  sections.push(h("div", { class: "dlg-sec" },
    h("div", { class: "kicker" }, "Calendar file"),
    h("p", { class: "note" }, "Works with Google, Apple, and Outlook calendars. Open the file, or import it at calendar.google.com under Settings → Import. Each posting also has its own “Add to Google Calendar” link."),
    h("div", { class: "acts" }, h("button", { type: "button", class: "btn sm", disabled: !n, onclick: downloadIcs }, icon("download"), "Download deadlines (.ics)"))));
  sections.push(h("div", { class: "dlg-sec" },
    h("div", { class: "kicker" }, "Deadline alerts"),
    !alertsSupported()
      ? h("p", { class: "note" }, isIos() && !isInstalled()
          ? "On iPhone, alerts work after you add this app to your Home Screen: tap Share, then Add to Home Screen, and open it from there."
          : "This browser doesn't support alerts. Calendar reminders still work.")
      : alertsOn()
        ? h("p", { class: "note" }, "On. You'll get an alert when you open the app and a deadline is within three days or past due. For reminders while the app is closed, use your calendar.")
        : h("div", { class: "acts" },
            h("button", { type: "button", class: "btn sm", onclick: async () => {
              const r = await enableAlerts();
              toast(r === "granted" ? "Deadline alerts are on." : "Alerts are blocked. You can allow them in your browser's site settings.");
              if (ui.dialog?.kind === "calendar") drawCalendar();
            } }, icon("bell"), "Turn on alerts"),
            h("span", { class: "note" }, "Alerts show when you open the app. Calendar reminders work even when it's closed."))));
  if (!isInstalled()) {
    sections.push(h("div", { class: "dlg-sec" },
      h("div", { class: "kicker" }, "Install on your phone"),
      canPromptInstall()
        ? h("div", { class: "acts" }, h("button", { type: "button", class: "btn sm", onclick: async () => { if (await promptInstall()) toast("Installed."); drawCalendar(); } }, icon("download"), "Install app"))
        : h("p", { class: "note" }, isIos()
            ? "In Safari, tap Share, then Add to Home Screen."
            : "In Chrome, open the menu and choose Install app (or Add to Home screen).")));
  }
  dlg().replaceChildren(...sections);
}

function downloadIcs(): void {
  const url = URL.createObjectURL(new Blob([toIcs(deadlineEvents(state.postings))], { type: "text/calendar" }));
  const a = h("a", { href: url, download: "internship-deadlines.ics" });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("Calendar file saved. Open it to add your deadlines.");
}
