// Calendar view, laid out like Google Calendar: day, week, and month, with a mini month to jump around.
// Shows application deadlines always, and the student's Google Calendar events once they connect.
import { addDays, dayStart, isoDay, layoutDay, parseDay, sameDay, step, visibleDays, type CalMode } from "../lib/calendar-layout";
import { dueInfo } from "../lib/postings";
import { state, ui } from "../lib/store";
import { openPosting } from "./dialogs";
import { h, icon, toast } from "./dom";
import { fetchGoogleEvents, googleConnected, googleSyncAvailable, type CalendarEvent } from "./google-calendar";
import { render, scroller } from "./render";

const HOUR = 48; // pixels per hour in day and week views
const MODES: [CalMode, string][] = [["day", "Day"], ["week", "Week"], ["month", "Month"]];

// What Google returned for the days on screen; kept for this visit only
let google: { key: string; events: CalendarEvent[]; at: Date } | null = null;
let loading = false;
let error = "";
const scrolled = new Set<string>();

const anchor = (): Date => (ui.calFrom ? parseDay(ui.calFrom) : dayStart(new Date()));
const narrow = (): boolean => window.matchMedia("(max-width: 560px)").matches;
const mode = (): CalMode => ui.calMode || (ui.calMode = narrow() ? "day" : "week");
const rangeOf = (m: CalMode, a: Date) => { const days = visibleDays(m, a); return { days, from: days[0], to: addDays(days[days.length - 1], 1) }; };
const keyOf = (m: CalMode, a: Date) => { const r = rangeOf(m, a); return isoDay(r.from) + "/" + isoDay(r.to); };

async function loadGoogle(): Promise<void> {
  const m = mode(), a = anchor(), { from, to } = rangeOf(m, a), key = keyOf(m, a);
  loading = true; error = ""; render();
  try { google = { key, events: await fetchGoogleEvents(from, to), at: new Date() }; }
  catch (e) { error = e instanceof Error ? e.message : "Couldn't load Google Calendar."; }
  loading = false;
  render();
}
function go(to: Date, m: CalMode = mode()): void {
  ui.calFrom = isoDay(to); ui.calMode = m;
  // Once connected, moving around loads the new days without asking Google again
  if (googleConnected()) void loadGoogle(); else render();
}

/** Deadlines from saved postings, as all-day events colored by urgency. */
function deadlineEvents(): CalendarEvent[] {
  return state.postings.filter(p => p.deadline).map(p => {
    const start = parseDay(p.deadline);
    return { id: "dl-" + p.id, title: "Apply: " + (p.company || "Internship"), start, end: addDays(start, 1), allDay: true, source: "deadline" as const, postingId: p.id, level: dueInfo(p)?.level || "" };
  });
}

const fmtTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).replace(":00", "").replace(" ", "").toLowerCase();
const evClass = (e: CalendarEvent) => "gev " + (e.source === "deadline" ? "dl lvl-" + (e.level || "none") : "g") + (e.end.getTime() < Date.now() ? " past" : "");
const open = (e: CalendarEvent) => {
  if (e.postingId) openPosting(e.postingId);
  else if (e.link) window.open(e.link, "_blank", "noopener");
};
function chip(e: CalendarEvent, withTime: boolean): HTMLElement {
  return h("button", { type: "button", class: evClass(e) + " chip-ev" + (e.allDay ? " allday" : ""), title: e.title + (e.location ? " · " + e.location : ""), onclick: () => open(e) },
    !e.allDay && withTime ? h("span", { class: "gt" }, fmtTime(e.start)) : null,
    h("span", { class: "gn" }, e.title));
}

export function scheduleView(): HTMLElement[] {
  const m = mode(), a = anchor(), { days, from, to } = rangeOf(m, a);
  const today = dayStart(new Date());
  const key = keyOf(m, a);
  if (googleConnected() && !loading && !error && (!google || google.key !== key)) void loadGoogle();
  const events = [...deadlineEvents(), ...(google && google.key === key ? google.events : [])]
    .filter(e => e.start < to && e.end > from);

  // Title like Google's: "October 2026", or "Sep – Oct 2026" when a week spans two months
  const first = days[0], last = days[days.length - 1];
  const title = m === "month" ? a.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : m === "day" ? a.toLocaleDateString(undefined, narrow() ? { weekday: "short", month: "short", day: "numeric", year: "numeric" } : { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : first.getMonth() === last.getMonth() ? first.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : first.toLocaleDateString(undefined, { month: "short" }) + " – " + last.toLocaleDateString(undefined, { month: "short", year: "numeric" });

  const googleCtl = !googleSyncAvailable() ? null
    : googleConnected() || google
      ? h("button", { type: "button", class: "icon-btn", title: google ? "Updated " + fmtTime(google.at) + ". Refresh" : "Refresh", "aria-label": "Refresh Google Calendar", disabled: loading, onclick: () => void loadGoogle() },
          icon(loading ? "clock" : "refresh"))
      : h("button", { type: "button", class: "btn primary sm", disabled: loading, onclick: () => void loadGoogle().then(() => { if (!error) toast("Showing your Google Calendar for this visit."); }) },
          icon("calendar"), loading ? "Connecting…" : [h("span", { class: "wide-only" }, "Show "), "Google Calendar"]);

  const toolbar = h("div", { class: "gcal-bar" },
    h("button", { type: "button", class: "btn sm", onclick: () => go(today) }, "Today"),
    h("button", { type: "button", class: "icon-btn", "aria-label": "Previous", onclick: () => go(step(m, a, -1)) }, icon("chevron-left")),
    h("button", { type: "button", class: "icon-btn", "aria-label": "Next", onclick: () => go(step(m, a, 1)) }, icon("chevron-right")),
    h("h2", { class: "gcal-title" }, title),
    h("span", { class: "spacer" }),
    // Phones: dates and arrows on the first line, the view switch and Google on the second
    h("span", { class: "gcal-break" }),
    h("div", { class: "seg", role: "group", "aria-label": "View" }, ...MODES.map(([id, label]) =>
      h("button", { type: "button", "aria-pressed": String(m === id), onclick: () => go(a, id) }, label))),
    googleCtl);

  const main = m === "month" ? monthGrid(days, a, events, today) : timeGrid(days, events, today, m);
  return [toolbar, h("div", { class: "gcal-body" }, sidebar(a, today), h("main", { class: "gcal-main" },
    error ? h("p", { class: "alert", style: "margin:8px 12px 0" }, error) : null, main))];
}

function sidebar(a: Date, today: Date): HTMLElement {
  const month = new Date(a.getFullYear(), a.getMonth(), 1);
  const cells = visibleDays("month", month);
  const busy = new Set(deadlineEvents().map(e => isoDay(e.start)));
  const selected = new Set(visibleDays(mode() === "month" ? "day" : mode(), a).map(isoDay));
  return h("aside", { class: "gcal-side" },
    h("div", { class: "mini" },
      h("div", { class: "mini-head" },
        h("b", null, month.toLocaleDateString(undefined, { month: "long", year: "numeric" })),
        h("span", { class: "spacer" }),
        h("button", { type: "button", class: "icon-btn", "aria-label": "Previous month", onclick: () => go(new Date(month.getFullYear(), month.getMonth() - 1, 1)) }, icon("chevron-left", "sm")),
        h("button", { type: "button", class: "icon-btn", "aria-label": "Next month", onclick: () => go(new Date(month.getFullYear(), month.getMonth() + 1, 1)) }, icon("chevron-right", "sm"))),
      h("div", { class: "mini-grid" },
        ...["S", "M", "T", "W", "T", "F", "S"].map(d => h("span", { class: "mini-dow" }, d)),
        ...cells.map(d => h("button", {
          type: "button", "aria-label": d.toDateString(),
          class: "mini-day" + (d.getMonth() !== month.getMonth() ? " out" : "") + (sameDay(d, today) ? " today" : "") + (selected.has(isoDay(d)) ? " sel" : "") + (busy.has(isoDay(d)) ? " busy" : ""),
          onclick: () => go(d),
        }, String(d.getDate()))))),
    h("div", { class: "legend-cal" },
      h("div", { class: "kicker" }, "Calendars"),
      h("div", { class: "lg" }, h("i", { class: "sw dl" }), "Application deadlines"),
      googleSyncAvailable() ? h("div", { class: "lg" }, h("i", { class: "sw g" }), "Google Calendar",
        h("span", { class: "muted", style: "margin-left:auto;font-size:11px" }, googleConnected() || google ? "shown" : "not connected")) : null,
      h("p", { class: "note" }, "Red is due within 3 days or overdue, amber within a week. Nothing from Google Calendar is saved in the app.")));
}

function timeGrid(days: Date[], events: CalendarEvent[], today: Date, m: CalMode): HTMLElement[] {
  const cols = "var(--gutter) repeat(" + days.length + ", minmax(0, 1fr))";
  const head = h("div", { class: "tg-head", style: "grid-template-columns:" + cols },
    h("span"),
    ...days.map(d => h("button", { type: "button", class: "tg-date" + (sameDay(d, today) ? " today" : ""), onclick: () => go(d, "day") },
      h("span", { class: "dow" }, d.toLocaleDateString(undefined, { weekday: "short" })),
      h("span", { class: "num" }, String(d.getDate())))));
  const allDayFor = (d: Date) => events.filter(e => (e.allDay || e.end.getTime() - e.start.getTime() >= 864e5) && e.start < addDays(d, 1) && e.end > d);
  const allDay = h("div", { class: "tg-allday", style: "grid-template-columns:" + cols },
    h("span", { class: "tg-gutter-label" }, "all-day"),
    ...days.map(d => h("div", { class: "tg-allday-cell" }, ...allDayFor(d).map(e => chip(e, false)))));

  const hours = h("div", { class: "tg-hours" }, ...Array.from({ length: 24 }, (_, i) =>
    h("span", { class: "tg-hour", style: "top:" + i * HOUR + "px" }, i === 0 ? "" : new Date(2000, 0, 1, i).toLocaleTimeString(undefined, { hour: "numeric" }))));
  const timed = events.filter(e => !e.allDay && e.end.getTime() - e.start.getTime() < 864e5);
  const columns = days.map(d => {
    const placed = layoutDay(timed, d);
    const col = h("div", { class: "tg-col" + (sameDay(d, today) ? " today" : "") },
      ...placed.map(p => {
        const e = p.item;
        return h("button", {
          type: "button", class: evClass(e) + " block",
          style: "top:" + (p.top / 60) * HOUR + "px;height:" + Math.max((p.height / 60) * HOUR - 2, 18) + "px;left:calc(" + (100 * p.lane) / p.lanes + "% + 1px);width:calc(" + 100 / p.lanes + "% - 3px)",
          title: e.title + " · " + fmtTime(e.start) + " – " + fmtTime(e.end) + (e.location ? " · " + e.location : ""),
          onclick: () => open(e),
        }, h("span", { class: "gn" }, e.title), p.height >= 40 ? h("span", { class: "gt" }, fmtTime(e.start) + " – " + fmtTime(e.end)) : null);
      }));
    if (sameDay(d, today)) {
      const now = new Date();
      col.append(h("div", { class: "now", style: "top:" + ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR + "px" }));
    }
    return col;
  });
  const key = "gcal-" + m;
  // Headers live inside the scrolling area, pinned to the top, so their columns line up with the grid
  const body = scroller(key, h("div", { class: "tg-sticky" }, head, allDay),
    h("div", { class: "tg-body", style: "grid-template-columns:" + cols + ";height:" + 24 * HOUR + "px" }, hours, ...columns));
  // Open scrolled to the morning, the way Google Calendar does
  if (!scrolled.has(key)) {
    scrolled.add(key);
    requestAnimationFrame(() => { body.scrollTop = 7 * HOUR - 12; }); // a little above 7 AM so its label isn't cut in half
  }
  return [body];
}

function monthGrid(days: Date[], a: Date, events: CalendarEvent[], today: Date): HTMLElement[] {
  const head = h("div", { class: "mg-head" }, ...days.slice(0, 7).map(d => h("span", null, d.toLocaleDateString(undefined, { weekday: "short" }))));
  const cells = days.map(d => {
    const dayEvents = events
      .filter(e => e.start < addDays(d, 1) && e.end > d)
      .sort((x, y) => Number(y.allDay) - Number(x.allDay) || x.start.getTime() - y.start.getTime());
    const shown = dayEvents.slice(0, 3), more = dayEvents.length - shown.length;
    return h("div", { class: "mg-cell" + (d.getMonth() !== a.getMonth() ? " out" : "") },
      h("button", { type: "button", class: "mg-num" + (sameDay(d, today) ? " today" : ""), onclick: () => go(d, "day"), "aria-label": d.toDateString() },
        d.getDate() === 1 ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : String(d.getDate())),
      ...shown.map(e => chip(e, true)),
      more > 0 ? h("button", { type: "button", class: "mg-more", onclick: () => go(d, "day") }, more + " more") : null);
  });
  return [head, scroller("gcal-month", h("div", { class: "mg-grid" }, ...cells))];
}

// Keep the red "now" line moving
setInterval(() => { if (ui.view === "calendar" && !document.hidden && mode() !== "month") render(); }, 60_000);
