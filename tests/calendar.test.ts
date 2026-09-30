import { describe, expect, it } from "vitest";
import type { Posting } from "../src/types";
import { deadlineEvents, googleCalendarUrl, nextDay, toIcs } from "../src/lib/calendar";

const posting = (over: Partial<Posting>): Posting => ({
  id: "a", company: "Smith, Lee & Co", role: "Audit Intern", link: "https://x.com/job", deadline: "2026-10-31", status: "Saved",
  text: "", createdAt: 0, priority: false, ...over,
});

describe("calendar events", () => {
  it("only includes deadlines you still have to apply for", () => {
    const events = deadlineEvents([posting({}), posting({ id: "b", status: "Applied" }), posting({ id: "c", deadline: "" })]);
    expect(events.map(e => e.uid)).toEqual(["a@gsu-internship-and-planning"]);
  });
  it("rolls all-day end dates over months and years", () => {
    expect(nextDay("2026-10-31")).toBe("2026-11-01");
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
  });
  it("builds a Google Calendar link with the right all-day dates", () => {
    const url = new URL(googleCalendarUrl(deadlineEvents([posting({})])[0]));
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe("20261031/20261101");
    expect(url.searchParams.get("text")).toContain("Smith, Lee & Co");
  });
  it("writes a valid .ics with escaped text, reminders, and CRLF line endings", () => {
    const ics = toIcs(deadlineEvents([posting({})]), new Date(Date.UTC(2026, 8, 30, 12)));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261031");
    expect(ics).toContain("SUMMARY:Apply: Smith\\, Lee & Co · Audit Intern");
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ics.split("\r\n").every(l => l.length <= 75)).toBe(true);
  });
});
