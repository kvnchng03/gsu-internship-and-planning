import { beforeEach, describe, expect, it } from "vitest";
import type { Posting } from "../src/types";
import { emptyState, normalize, setState, state } from "../src/lib/store";
import { analyze, haveMap, resumeAdvice } from "../src/lib/skills";

const posting = (role: string, text: string): Posting => ({
  id: "p", company: "Firm", role, link: "", deadline: "", status: "Saved", text, createdAt: 0, priority: false,
});

beforeEach(() => setState(emptyState()));

describe("what a student has", () => {
  it("counts skills, GSU classes, and resume evidence at the right strength", () => {
    state.profile.skills = ["Excel"];
    state.profile.classes = ["ACCT 4610 Introduction to Assurance Services"];
    state.profile.resume = "Tracked vendor invoices for 4 projects";
    const have = haveMap(state.profile);
    expect(have.excel).toBe("yes");
    expect(have.audit).toBe("yes"); // from ACCT 4610
    expect(have["ap-ar"]).toBe("partly"); // resume evidence only counts partly
    expect(have.tax).toBeUndefined();
  });
});

describe("reading a posting", () => {
  it("reads the job title as well as the description", () => {
    const hits = analyze(posting("Audit Intern", "Excel and teamwork."), {});
    expect(hits.map(h => h.id)).toEqual(expect.arrayContaining(["audit", "excel", "teamwork"]));
  });
});

describe("resume help", () => {
  it("suggests the posting's words for work a bullet already shows", () => {
    state.profile.resume = "Tracked vendor invoices for 4 projects\nBuilt ratio analysis in Excel";
    const p = posting("Staff Accountant Intern", "Accounts payable invoice processing. Excel.");
    const have = haveMap(state.profile);
    const adv = resumeAdvice(analyze(p, have), have);
    expect(adv?.reword.map(r => r.phrase)).toContain("accounts payable");
    expect(adv?.lead.length).toBeGreaterThan(0);
  });
  it("has nothing to say without bullets", () => {
    expect(resumeAdvice([], {})).toBeNull();
  });
});

describe("restoring data", () => {
  it("drops malformed parts instead of trusting a file", () => {
    const s = normalize({ profile: { skills: ["Excel", 3] }, postings: [{ id: "a", status: "Bogus" }, "junk"], plan: { terms: [{ id: "bad" }, { id: "2027-1", codes: ["ACCT 4101", "NOPE 1000", "ACCT 4101"] }] } });
    expect(s.profile.skills).toEqual(["Excel", "3"]);
    expect(s.postings).toHaveLength(1);
    expect(s.postings[0].status).toBe("Saved");
    expect(s.plan.terms).toEqual([{ id: "2027-1", codes: ["ACCT 4101"] }]);
  });
});
