import { beforeEach, describe, expect, it } from "vitest";
import { emptyState, setState, state } from "../src/lib/store";
import {
  autoPlan, gradTermIx, issuesFor, nextTermIx, place, planContext, planTerms, shortTerm, termAt, termIndex, termName,
} from "../src/lib/plan";
import { COURSE_BY_CODE, REQUIRED, courseLabel } from "../src/data/courses";

const take = (...codes: string[]) => { state.profile.classes = codes.map(c => courseLabel(COURSE_BY_CODE[c])); };
const FOUNDATION_DONE = ["ENGL 1101", "ENGL 1102", "MATH 1111", "MATH 1401", "BUSA 1105", "ECON 2105", "ECON 2106", "ACCT 2101", "ACCT 2102", "CIS 2010"];

beforeEach(() => setState(emptyState()));

describe("terms", () => {
  it("round-trips a term id through its index", () => {
    expect(termAt(termIndex("2027-1")).id).toBe("2027-1");
    expect(termName("2027-3")).toBe("Fall 2027");
    expect(shortTerm("2027-2")).toBe("Sum 27");
  });
  it("starts planning at the next term that hasn't begun", () => {
    expect(termAt(nextTermIx(new Date(2026, 8, 30))).id).toBe("2027-1"); // late September -> Spring
    expect(termAt(nextTermIx(new Date(2027, 1, 10))).id).toBe("2027-2"); // February -> Summer
  });
  it("reads graduation dates by month or season", () => {
    expect(termAt(gradTermIx("Dec 2027") as number).id).toBe("2027-3");
    expect(termAt(gradTermIx("May 2028") as number).id).toBe("2028-1");
    expect(gradTermIx("someday")).toBeNull();
  });
});

describe("prerequisites", () => {
  it("flags a class planned before its prerequisite", () => {
    state.plan.terms = [termAt(termIndex("2027-1")), termAt(termIndex("2027-3"))];
    take(...FOUNDATION_DONE);
    place("ACCT 4102", "2027-1");
    place("ACCT 4101", "2027-3");
    const issues = issuesFor(COURSE_BY_CODE["ACCT 4102"], 0, planContext());
    expect(issues.hard[0]).toContain("ACCT 4101");
  });
  it("accepts either course in an any-of prerequisite", () => {
    take(...FOUNDATION_DONE, "ACCT 4101", "ACCT 4102");
    state.plan.terms = [termAt(termIndex("2027-1"))];
    // ACCT 4750 needs MATH 1401 or MATH 1070; MATH 1401 is taken
    expect(issuesFor(COURSE_BY_CODE["ACCT 4750"], 0, planContext()).hard).toEqual([]);
  });
});

describe("auto-fill", () => {
  it("places every remaining required class in an order that works", () => {
    take(...FOUNDATION_DONE, "ACCT 4101", "BCOM 3950", "MGT 3400");
    state.plan.terms = ["2027-1", "2027-2", "2027-3"].map(id => termAt(termIndex(id)));
    const r = autoPlan();
    expect(r.left).toEqual([]);
    const ctx = planContext();
    for (const code of REQUIRED) {
      if (ctx.taken.has(code)) continue;
      expect(ctx.where[code], code + " should be placed").toBeDefined();
      expect(issuesFor(COURSE_BY_CODE[code], ctx.where[code], ctx).hard, code).toEqual([]);
    }
    // The capstone and its exit exam go in the last semester
    expect(ctx.where["BUSA 4980"]).toBe(2);
    expect(ctx.where["BUSA 4990"]).toBe(2);
  });
  it("reports what can't fit instead of breaking rules", () => {
    take(...FOUNDATION_DONE);
    state.plan.terms = [termAt(termIndex("2027-1"))];
    const r = autoPlan();
    expect(r.left.length).toBeGreaterThan(0);
    expect(planTerms()[0].codes.every(c => issuesFor(COURSE_BY_CODE[c], 0, planContext()).hard.length === 0)).toBe(true);
  });
});
