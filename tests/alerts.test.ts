import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Posting } from "../src/types";
import { emptyState, setState, state } from "../src/lib/store";
import { checkDeadlines } from "../src/ui/alerts";

const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const posting = (over: Partial<Posting>): Posting => ({
  id: "p" + Math.random(), company: "Firm", role: "Audit Intern", link: "", deadline: "", status: "Saved", text: "", createdAt: 0, priority: false, ...over,
});

// A stand-in for the browser's notification permission and service worker
let shown: { title: string; options: NotificationOptions }[] = [];
function fakeBrowser(permission: NotificationPermission) {
  shown = [];
  vi.stubGlobal("Notification", { permission, requestPermission: async () => permission });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { ready: Promise.resolve({ showNotification: async (title: string, options: NotificationOptions) => { shown.push({ title, options }); } }) },
  });
}

beforeEach(() => { localStorage.clear(); setState(emptyState()); });
afterEach(() => vi.unstubAllGlobals());

describe("deadline alerts", () => {
  it("notifies about overdue and 3-day deadlines, but not later ones or ones already applied to", async () => {
    fakeBrowser("granted");
    state.postings = [
      posting({ id: "late", company: "Late Co", deadline: day(-1) }),
      posting({ id: "soon", company: "Soon Co", deadline: day(2) }),
      posting({ id: "week", company: "Week Co", deadline: day(6) }),
      posting({ id: "done", company: "Done Co", deadline: day(1), status: "Applied" }),
    ];
    await checkDeadlines();
    expect(shown.map(s => s.title)).toEqual(["Overdue: Late Co", "Due soon: Soon Co"]);
    expect(shown[1].options.body).toContain("Audit Intern");
  });
  it("alerts about each posting once a day, not every time the app opens", async () => {
    fakeBrowser("granted");
    state.postings = [posting({ id: "soon", company: "Soon Co", deadline: day(1) })];
    await checkDeadlines();
    await checkDeadlines();
    expect(shown).toHaveLength(1);
  });
  it("stays quiet without permission, and for the example data", async () => {
    fakeBrowser("default");
    state.postings = [posting({ deadline: day(1) })];
    await checkDeadlines();
    fakeBrowser("granted");
    state.example = true;
    await checkDeadlines();
    expect(shown).toHaveLength(0);
  });
});
