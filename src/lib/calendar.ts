// Calendar: turn application deadlines into calendar events, as Google links or an .ics file
import type { Posting } from "../types";
import { OPEN_STATUSES } from "../data/statuses";

export interface CalEvent {
  /** Stable id, so re-importing or re-syncing updates the event instead of duplicating it. */
  uid: string;
  title: string;
  /** All-day event date, YYYY-MM-DD. */
  date: string;
  details: string;
}

/** A deadline worth a calendar event: one you still have to apply for. */
export function deadlineEvents(postings: Posting[]): CalEvent[] {
  return postings
    .filter(p => p.deadline && OPEN_STATUSES.includes(p.status))
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .map(p => ({
      uid: p.id + "@gsu-internship-and-planning",
      title: "Apply: " + (p.company || "Internship") + (p.role ? " · " + p.role : ""),
      date: p.deadline,
      details: ["Application deadline" + (p.role ? " for " + p.role : "") + ".", p.link].filter(Boolean).join("\n"),
    }));
}

const compact = (date: string) => date.replace(/-/g, "");
/** The day after, since all-day events end on the next day. */
export function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

/** Opens Google Calendar with the event filled in. No sign-in or setup needed. */
export function googleCalendarUrl(e: CalEvent): string {
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: compact(e.date) + "/" + compact(nextDay(e.date)), details: e.details });
  return "https://calendar.google.com/calendar/render?" + q.toString();
}

// RFC 5545 text: escape specials, then fold long lines
const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = " " + rest.slice(74); }
  out.push(rest);
  return out.join("\r\n");
}

/**
 * An .ics file for Google, Apple, or Outlook calendars. Each event reminds you three days and one day
 * before (Apple and Outlook use these; Google uses your default reminders when importing).
 */
export function toIcs(events: CalEvent[], now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GSU Internship & Planning//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Internship deadlines"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + e.uid,
      "DTSTAMP:" + stamp,
      "DTSTART;VALUE=DATE:" + compact(e.date),
      "DTEND;VALUE=DATE:" + compact(nextDay(e.date)),
      "SUMMARY:" + escapeText(e.title),
      "DESCRIPTION:" + escapeText(e.details),
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + escapeText(e.title), "TRIGGER:-P3D", "END:VALARM",
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + escapeText(e.title), "TRIGGER:-P1D", "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
