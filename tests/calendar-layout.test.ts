import { describe, expect, it } from "vitest";
import { isoDay, layoutDay, step, visibleDays } from "../src/lib/calendar-layout";

const at = (t: string) => new Date("2026-10-05T" + t + ":00");
const ev = (id: string, s: string, e: string) => ({ id, start: at(s), end: at(e) });
const DAY = new Date("2026-10-05T00:00:00"); // a Monday

describe("visible days", () => {
  it("starts weeks on Sunday and shows six weeks for a month", () => {
    expect(visibleDays("week", DAY).map(isoDay)).toEqual(["2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"]);
    const month = visibleDays("month", DAY);
    expect(month).toHaveLength(42);
    expect(isoDay(month[0])).toBe("2026-09-27");
  });
  it("steps by a day, a week, or a month", () => {
    expect(isoDay(step("day", DAY, 1))).toBe("2026-10-06");
    expect(isoDay(step("week", DAY, -1))).toBe("2026-09-28");
    expect(isoDay(step("month", new Date("2026-12-15T00:00:00"), 1))).toBe("2027-01-01");
  });
});

describe("laying out a day", () => {
  it("positions events by minutes from midnight", () => {
    const [p] = layoutDay([ev("a", "09:30", "10:45")], DAY);
    expect(p.top).toBe(570);
    expect(p.height).toBe(75);
    expect(p.lanes).toBe(1);
  });
  it("puts overlapping events side by side and lets later ones reuse free lanes", () => {
    const placed = layoutDay([ev("a", "09:00", "11:00"), ev("b", "10:00", "10:30"), ev("c", "10:30", "12:00"), ev("d", "13:00", "14:00")], DAY);
    const by = Object.fromEntries(placed.map(p => [p.item.id, p]));
    expect([by.a.lane, by.b.lane, by.c.lane]).toEqual([0, 1, 1]);
    expect(by.a.lanes).toBe(2);
    expect(by.d.lanes).toBe(1);
  });
  it("clips events that cross midnight to the day shown", () => {
    const late = { id: "x", start: new Date("2026-10-05T23:00:00"), end: new Date("2026-10-06T01:00:00") };
    expect(layoutDay([late], DAY)[0]).toMatchObject({ top: 1380, height: 60 });
    expect(layoutDay([late], new Date("2026-10-06T00:00:00"))[0]).toMatchObject({ top: 0, height: 60 });
  });
});
