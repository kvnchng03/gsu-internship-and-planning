import { afterEach, describe, expect, it, vi } from "vitest";

// A stand-in for Google's sign-in library and Calendar API, so the event handling can be tested offline
async function loadWith(items: unknown[]) {
  vi.resetModules();
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com");
  window.google = { accounts: { oauth2: { initTokenClient: cfg => ({ requestAccessToken: () => cfg.callback({ access_token: "tok", expires_in: 3600 }) }) } } };
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ items }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const mod = await import("../src/ui/google-calendar");
  return { mod, fetchMock };
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); delete window.google; });

const FROM = new Date("2026-10-04T00:00:00"), TO = new Date("2026-10-18T00:00:00");

describe("reading Google Calendar", () => {
  it("keeps real start and end times, and skips cancelled and app-synced events", async () => {
    const { mod } = await loadWith([
      { id: "a", summary: "ACCT 4101", start: { dateTime: "2026-10-05T09:30:00" }, end: { dateTime: "2026-10-05T10:45:00" } },
      { id: "b", summary: "Career fair", start: { date: "2026-10-07" }, end: { date: "2026-10-09" } },
      { id: "c", summary: "Apply: Firm", start: { date: "2026-10-06" }, end: { date: "2026-10-07" }, extendedProperties: { private: { app: "gsu-planner" } } },
      { id: "d", summary: "Cancelled thing", status: "cancelled", start: { date: "2026-10-06" }, end: { date: "2026-10-07" } },
      { id: "e", start: { dateTime: "2026-10-06T12:00:00" }, end: { dateTime: "2026-10-06T12:00:00" } },
    ]);
    const events = await mod.fetchGoogleEvents(FROM, TO);
    expect(events.map(e => e.id)).toEqual(["a", "b", "e"]);
    const [a, b, e] = events;
    expect(a.allDay).toBe(false);
    expect((a.end.getTime() - a.start.getTime()) / 60_000).toBe(75);
    expect(b.allDay).toBe(true);
    expect(b.end.getTime()).toBe(new Date("2026-10-09T00:00:00").getTime());
    // A zero-length event still gets room to show, and an untitled one gets a title
    expect((e.end.getTime() - e.start.getTime()) / 60_000).toBe(30);
    expect(e.title).toBe("(No title)");
    expect(mod.googleConnected()).toBe(true);
  });
  it("asks Google for exactly the range on screen, as single events", async () => {
    const { mod, fetchMock } = await loadWith([]);
    await mod.fetchGoogleEvents(FROM, TO);
    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.pathname).toBe("/calendar/v3/calendars/primary/events");
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect(url.searchParams.get("timeMax")).toBe(TO.toISOString());
  });
});
