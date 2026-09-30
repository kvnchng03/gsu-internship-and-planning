import { beforeEach, describe, expect, it } from "vitest";
import type { Posting } from "../src/types";
import { emptyState, setState, state } from "../src/lib/store";
import { boardOrder, dueInfo, findDuplicate, linkKey } from "../src/lib/postings";

const posting = (over: Partial<Posting>): Posting => ({
  id: "p" + Math.random(), company: "Firm", role: "Intern", link: "", deadline: "", status: "Saved",
  text: "", createdAt: 0, priority: false, ...over,
});
const NOW = new Date(2026, 8, 30, 13, 0); // Sep 30, 1pm

beforeEach(() => setState(emptyState()));

describe("deadlines", () => {
  it("counts whole calendar days, whatever the time of day", () => {
    expect(dueInfo(posting({ deadline: "2026-10-01" }), NOW)?.days).toBe(1);
    expect(dueInfo(posting({ deadline: "2026-10-02" }), NOW)?.text).toMatch(/^Due in 2d/);
  });
  it("marks overdue, urgent, and soon only before applying", () => {
    expect(dueInfo(posting({ deadline: "2026-09-28" }), NOW)?.level).toBe("overdue");
    expect(dueInfo(posting({ deadline: "2026-10-03" }), NOW)?.level).toBe("urgent");
    expect(dueInfo(posting({ deadline: "2026-10-06" }), NOW)?.level).toBe("soon");
    expect(dueInfo(posting({ deadline: "2026-09-28", status: "Applied" }), NOW)?.level).toBe("");
  });
});

describe("duplicate links", () => {
  it("treats tracking junk, case, www, and trailing slashes as the same link", () => {
    const k = linkKey("https://careers.example.com/jobs/101");
    expect(linkKey("careers.example.com/jobs/101/?utm_source=linkedin&utm_medium=social")).toBe(k);
    expect(linkKey("HTTPS://WWW.Careers.Example.com/jobs/101")).toBe(k);
  });
  it("keeps real query parameters apart", () => {
    expect(linkKey("https://x.com/job?id=1")).not.toBe(linkKey("https://x.com/job?id=2"));
  });
  it("finds a saved posting with the same link, but not the one being edited", () => {
    const saved = posting({ id: "a", link: "https://x.com/job?id=1" });
    state.postings = [saved];
    expect(findDuplicate("x.com/job?id=1&utm_campaign=z")?.id).toBe("a");
    expect(findDuplicate("x.com/job?id=1", "a")).toBeNull();
    expect(findDuplicate("")).toBeNull();
  });
});

describe("board order", () => {
  it("puts overdue first, then urgent, then starred", () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    const starred = posting({ id: "star", priority: true, deadline: day(30) });
    const urgent = posting({ id: "urgent", deadline: day(2) });
    const overdue = posting({ id: "overdue", deadline: day(-1) });
    const plain = posting({ id: "plain" });
    expect([plain, starred, urgent, overdue].sort(boardOrder).map(p => p.id)).toEqual(["overdue", "urgent", "star", "plain"]);
  });
});
