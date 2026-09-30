// Calendar view: two weeks of the student's Google Calendar events alongside their application deadlines
import type { Posting } from "../types";
import { STATUS_LABEL } from "../data/statuses";
import { dueInfo } from "../lib/postings";
import { state, ui } from "../lib/store";
import { openPosting } from "./dialogs";
import { h, icon, toast } from "./dom";
import { fetchGoogleEvents, googleConnected, googleSyncAvailable, type ScheduleEvent } from "./google-calendar";
import { render, scroller } from "./render";

const DAYS = 14;
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const parse = (day: string) => new Date(day + "T00:00:00");
const addDays = (day: string, n: number) => { const d = parse(day); d.setDate(d.getDate() + n); return iso(d); };
/** The Sunday that starts the week containing a day. */
const weekStart = (d: Date) => { const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()); s.setDate(s.getDate() - s.getDay()); return iso(s); };

// What Google returned for the range on screen; kept for this visit only
let google: { from: string; events: ScheduleEvent[]; at: Date } | null = null;
let loading = false;
let error = "";

async function loadGoogle(from: string): Promise<void> {
  loading = true; error = ""; render();
  try {
    google = { from, events: await fetchGoogleEvents(from, addDays(from, DAYS - 1)), at: new Date() };
  } catch (e) {
    error = e instanceof Error ? e.message : "Couldn't load Google Calendar.";
  }
  loading = false;
  render();
}

function move(days: number | "today"): void {
  ui.calFrom = days === "today" ? weekStart(new Date()) : addDays(ui.calFrom || weekStart(new Date()), days);
  // Once connected, changing weeks loads that range without asking Google again
  if (googleConnected()) void loadGoogle(ui.calFrom); else render();
}

export function scheduleView(): HTMLElement[] {
  const from = ui.calFrom || (ui.calFrom = weekStart(new Date()));
  const to = addDays(from, DAYS - 1);
  const today = iso(new Date());
  const fmt = (day: string, opts: Intl.DateTimeFormatOptions) => parse(day).toLocaleDateString(undefined, opts);
  const title = fmt(from, { month: "short", day: "numeric" }) + " – " + fmt(to, { month: "short", day: "numeric", year: "numeric" });

  const deadlines = new Map<string, Posting[]>();
  for (const p of state.postings) if (p.deadline >= from && p.deadline <= to) deadlines.set(p.deadline, [...(deadlines.get(p.deadline) || []), p]);
  const events = new Map<string, ScheduleEvent[]>();
  const shown = google && google.from === from ? google.events : [];
  for (const e of shown) events.set(e.day, [...(events.get(e.day) || []), e]);
  if (googleConnected() && !loading && (!google || google.from !== from) && !error) void loadGoogle(from);

  const googleBar = !googleSyncAvailable() ? null
    : googleConnected() || google
      ? h("span", { class: "gstatus" }, loading ? "Loading Google Calendar…" : google ? "Google Calendar · updated " + google.at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "",
          h("button", { type: "button", class: "btn sm", disabled: loading, onclick: () => void loadGoogle(from) }, "Refresh"))
      : h("button", { type: "button", class: "btn primary sm", disabled: loading, onclick: () => void loadGoogle(from).then(() => { if (!error) toast("Google Calendar connected for this visit."); }) },
          icon("calendar"), loading ? "Connecting…" : "Show my Google Calendar");

  const bar = h("div", { class: "ptop" },
    h("div", { class: "calnav" },
      h("button", { type: "button", class: "icon-btn", "aria-label": "Previous week", onclick: () => move(-7) }, icon("chevron-left")),
      h("button", { type: "button", class: "btn sm", onclick: () => move("today") }, "Today"),
      h("button", { type: "button", class: "icon-btn", "aria-label": "Next week", onclick: () => move(7) }, icon("chevron-right")),
      h("b", { class: "calrange" }, title)),
    h("span", { class: "spacer" }),
    googleBar);

  const days: HTMLElement[] = [];
  for (let i = 0; i < DAYS; i++) {
    const day = addDays(from, i);
    const dl = deadlines.get(day) || [], ev = events.get(day) || [];
    const items = [
      ...dl.map(p => {
        const d = dueInfo(p);
        return h("button", { type: "button", class: "ev deadline lvl-" + (d?.level || "none"), title: "Deadline · " + STATUS_LABEL[p.status], onclick: () => openPosting(p.id) },
          icon("alert", "sm"), h("span", { class: "evt" }, "Apply: " + (p.company || "Internship")));
      }),
      ...ev.sort((a, b) => Number(b.allDay) - Number(a.allDay)).map(e => h(e.link ? "a" : "span", {
        class: "ev google" + (e.allDay ? " allday" : ""), href: e.link || null, target: e.link ? "_blank" : null, rel: e.link ? "noopener" : null,
        title: [e.time, e.title, e.location].filter(Boolean).join(" · "),
      }, e.time ? h("span", { class: "evtime mono" }, e.time) : null, h("span", { class: "evt" }, e.title))),
    ];
    days.push(h("section", { class: "calday" + (day === today ? " today" : "") + (day < today ? " past" : "") + (items.length ? "" : " empty") },
      h("header", null, h("span", { class: "dow" }, fmt(day, { weekday: "short" })), h("span", { class: "dnum" }, fmt(day, { day: "numeric" })),
        i === 0 || fmt(day, { day: "numeric" }) === "1" ? h("span", { class: "dmon" }, fmt(day, { month: "short" })) : null),
      h("div", { class: "calitems" }, ...items)));
  }

  const notes = [
    error ? h("p", { class: "alert", style: "margin:12px 16px 0" }, error) : null,
    !googleSyncAvailable() ? null : !googleConnected() && !google
      ? h("p", { class: "note", style: "margin:12px 16px 0" }, "Your application deadlines are shown. Tap “Show my Google Calendar” to see your classes, work, and other events here too. Nothing from your calendar is saved in the app.")
      : null,
  ];
  return [bar, h("main", { class: "pane center solo", style: "flex:1" }, scroller("calendar", ...notes, h("div", { class: "calgrid" }, ...days)))];
}
