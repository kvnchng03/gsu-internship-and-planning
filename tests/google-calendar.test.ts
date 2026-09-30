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

describe("reading Google Calendar", () => {
  it("places timed, all-day, and multi-day events on the right days", async () => {
    const { mod } = await loadWith([
      { id: "a", summary: "ACCT 4101", start: { dateTime: "2026-10-05T09:30:00" }, end: { dateTime: "2026-10-05T10:45:00" } },
      { id: "b", summary: "Career fair", start: { date: "2026-10-07" }, end: { date: "2026-10-09" } },
      { id: "c", summary: "Apply: Firm", start: { date: "2026-10-06" }, end: { date: "2026-10-07" }, extendedProperties: { private: { app: "gsu-planner" } } },
      { id: "d", summary: "Cancelled thing", status: "cancelled", start: { date: "2026-10-06" }, end: { date: "2026-10-07" } },
    ]);
    const events = await mod.fetchGoogleEvents("2026-10-04", "2026-10-17");
    expect(events.map(e => [e.title, e.day, e.allDay])).toEqual([
      ["ACCT 4101", "2026-10-05", false],
      ["Career fair", "2026-10-07", true],
      ["Career fair", "2026-10-08", true],
    ]);
    expect(events[0].time).toMatch(/9:30/);
    expect(mod.googleConnected()).toBe(true);
  });
  it("asks for the right range and only upcoming single events", async () => {
    const { mod, fetchMock } = await loadWith([]);
    await mod.fetchGoogleEvents("2026-10-04", "2026-10-17");
    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.pathname).toBe("/calendar/v3/calendars/primary/events");
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect(new Date(url.searchParams.get("timeMax") || "").getTime()).toBe(new Date("2026-10-18T00:00:00").getTime());
  });
});
