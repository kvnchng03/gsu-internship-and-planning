// Deadlines & reminders: Google Calendar sync, a calendar file, and deadline alerts, in one dialog
import { deadlineEvents, toIcs } from "../lib/calendar";
import { state, ui } from "../lib/store";
import { alertsOn, alertsSupported, enableAlerts } from "./alerts";
import { dialogHead, dlg } from "./dialogs";
import { h, icon, toast } from "./dom";
import { googleSyncAvailable, syncToGoogle } from "./google-calendar";
import { canPromptInstall, isInstalled, isIos, promptInstall } from "./install";
import { t } from "../lib/i18n";

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
    dialogHead(null, t("Deadlines & reminders"),
      h("p", { class: "muted", style: "font-size:13px" }, !n ? t("None of your saved postings has a deadline you still need to apply by.")
        : n === 1 ? t("1 application deadline still ahead of you. Put it in your calendar so your phone reminds you.")
        : t("{n} application deadlines still ahead of you. Put them in your calendar so your phone reminds you.", { n }))),
  ];
  if (googleSyncAvailable() && state.example) {
    // Example postings must never land in someone's real calendar
    sections.push(h("div", { class: "dlg-sec" },
      h("div", { class: "kicker" }, "Google Calendar"),
      h("p", { class: "note" }, t("These are example postings. Click \u201CStart my own\u201D at the top and add your real postings, then sync them to Google Calendar."))));
  } else if (googleSyncAvailable()) {
    sections.push(h("div", { class: "dlg-sec" },
      h("div", { class: "kicker" }, "Google Calendar"),
      h("p", { class: "note" }, t("Adds each deadline to your Google Calendar, with phone reminders at 9am three days before and the day before. Sync again after changes; it updates the same events instead of adding copies.")),
      h("div", { class: "acts" }, h("button", {
        type: "button", class: "btn primary sm", disabled: busy || !n,
        onclick: async () => {
          drawCalendar(true);
          try {
            const r = await syncToGoogle(events);
            toast(t("Google Calendar updated: {added} added, {updated} updated, {removed} removed.", { added: r.added, updated: r.updated, removed: r.removed }));
          } catch (e) { toast(e instanceof Error ? e.message : t("Google Calendar sync didn't finish.")); }
          if (ui.dialog?.kind === "calendar") drawCalendar();
        },
      }, icon("calendar"), busy ? t("Syncing…") : t("Sync to Google Calendar")))));
  }
  sections.push(h("div", { class: "dlg-sec" },
    h("div", { class: "kicker" }, t("Calendar file")),
    h("p", { class: "note" }, t("Works with Google, Apple, and Outlook calendars. Open the file, or import it at calendar.google.com under Settings → Import. Each posting also has its own “Add to Google Calendar” link.")),
    h("div", { class: "acts" }, h("button", { type: "button", class: "btn sm", disabled: !n, onclick: downloadIcs }, icon("download"), t("Download deadlines (.ics)")))));
  sections.push(h("div", { class: "dlg-sec" },
    h("div", { class: "kicker" }, t("Deadline alerts")),
    !alertsSupported()
      ? h("p", { class: "note" }, isIos() && !isInstalled()
          ? t("On iPhone, alerts work after you add this app to your Home Screen: tap Share, then Add to Home Screen, and open it from there.")
          : t("This browser doesn't support alerts. Calendar reminders still work."))
      : alertsOn()
        ? h("p", { class: "note" }, t("On. You'll get an alert when you open the app and a deadline is within three days or past due. For reminders while the app is closed, use your calendar."))
        : h("div", { class: "acts" },
            h("button", { type: "button", class: "btn sm", onclick: async () => {
              const r = await enableAlerts();
              toast(r === "granted" ? t("Deadline alerts are on.") : t("Alerts are blocked. You can allow them in your browser's site settings."));
              if (ui.dialog?.kind === "calendar") drawCalendar();
            } }, icon("bell"), t("Turn on alerts")),
            h("span", { class: "note" }, t("Alerts show when you open the app. Calendar reminders work even when it's closed.")))));
  if (!isInstalled()) {
    sections.push(h("div", { class: "dlg-sec" },
      h("div", { class: "kicker" }, t("Install on your phone")),
      canPromptInstall()
        ? h("div", { class: "acts" }, h("button", { type: "button", class: "btn sm", onclick: async () => { if (await promptInstall()) toast(t("Installed.")); drawCalendar(); } }, icon("download"), t("Install app")))
        : h("p", { class: "note" }, isIos()
            ? t("In Safari, tap Share, then Add to Home Screen.")
            : t("In Chrome, open the menu and choose Install app (or Add to Home screen)."))));
  }
  dlg().replaceChildren(...sections);
}

function downloadIcs(): void {
  const url = URL.createObjectURL(new Blob([toIcs(deadlineEvents(state.postings))], { type: "text/calendar" }));
  const a = h("a", { href: url, download: "internship-deadlines.ics" });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(t("Calendar file saved. Open it to add your deadlines."));
}
