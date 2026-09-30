// The GSU accounting B.B.A.: courses, requirement groups, and prerequisite math
import type { Course, ReqGroup } from "../types";

// Georgia State 2026-2027 Undergraduate Catalog: the courses an accounting B.B.A. student plans around.
// pre: all must come first. any: one course from each list must come first. co: same term or earlier.
export const CATALOG = "2026-2027 GSU Undergraduate Catalog";
export const FOUNDATION: string[] = ["ACCT 2101", "ACCT 2102", "ECON 2105", "ECON 2106", "CIS 2010"];
export const COURSES: Course[] = [
  { code: "ENGL 1101", title: "English Composition I", hrs: 3, req: "lower", partly: ["communication"] },
  { code: "ENGL 1102", title: "English Composition II", hrs: 3, req: "lower", pre: ["ENGL 1101"], partly: ["communication"] },
  { code: "MATH 1111", title: "College Algebra", hrs: 3, req: "lower", note: "Or a higher math course." },
  { code: "MATH 1401", title: "Elementary Statistics", hrs: 3, req: "lower", note: "MATH 1070 counts too.", partly: ["analytical"] },
  { code: "BUSA 1105", title: "Business, Value, and You", hrs: 3, req: "foundation" },
  { code: "ECON 2105", title: "Principles of Macroeconomics", hrs: 3, req: "foundation", any: [["MATH 1111", "MATH 1001"]], partly: ["analytical"] },
  { code: "ECON 2106", title: "Principles of Microeconomics", hrs: 3, req: "foundation", any: [["MATH 1111", "MATH 1001"]], partly: ["analytical"] },
  { code: "ACCT 2101", title: "Principles of Accounting I", hrs: 3, req: "foundation", yes: ["journal", "fin-statements"] },
  { code: "ACCT 2102", title: "Principles of Accounting II", hrs: 3, req: "foundation", pre: ["ACCT 2101"], partly: ["cost", "budget"] },
  { code: "CIS 2010", title: "Introduction to Information Systems", hrs: 3, req: "foundation", partly: ["office", "analytics"] },
  { code: "LGLS 3610", title: "Legal and Ethical Analysis of Business Environments", hrs: 3, req: "core" },
  { code: "FI 3300", title: "Corporation Finance", hrs: 3, req: "core", pre: FOUNDATION, partly: ["budget", "analytical"] },
  { code: "MGT 3100", title: "Business Analysis", hrs: 3, req: "core", pre: [...FOUNDATION, "MATH 1111"], yes: ["analytical"], partly: ["excel", "analytics"] },
  { code: "MGT 3400", title: "Managing People in Organizations", hrs: 3, req: "core", partly: ["teamwork"] },
  { code: "MK 3010", title: "Marketing Management", hrs: 3, req: "core", pre: FOUNDATION },
  { code: "BCOM 3950", title: "Business Communication and Professional Development", hrs: 3, req: "core", pre: ["ENGL 1101", "ENGL 1102"], yes: ["communication"] },
  { code: "ACCT 4101", title: "Essentials of Financial Reporting I", hrs: 3, req: "major", pre: ["ACCT 2101", "ACCT 2102"], yes: ["gaap", "fin-statements", "journal"] },
  { code: "ACCT 4102", title: "Essentials of Financial Reporting II", hrs: 3, req: "major", pre: ["ACCT 4101", "BCOM 3950"], yes: ["gaap", "fin-statements"] },
  { code: "ACCT 4210", title: "Cost / Managerial Accounting", hrs: 3, req: "major", pre: ["ACCT 2101", "ACCT 2102"], yes: ["cost", "budget"], partly: ["excel"] },
  { code: "ACCT 4310", title: "Accounting Information Systems", hrs: 3, req: "major", pre: ["CIS 2010", "MGT 3100", "ACCT 4210"], yes: ["controls"], partly: ["analytics", "erp"] },
  { code: "ACCT 4510", title: "Introduction to Federal Income Taxes", hrs: 3, req: "major", pre: ["ACCT 4101"], yes: ["tax"] },
  { code: "ACCT 4610", title: "Introduction to Assurance Services", hrs: 3, req: "major", pre: ["ACCT 4102", "ACCT 4310"], yes: ["audit", "controls"] },
  { code: "ACCT 4750", title: "Technology and Values in the Accounting Profession", hrs: 3, req: "major", pre: ["ACCT 4101", "ACCT 4102"], any: [["MATH 1401", "MATH 1070"]], partly: ["analytics"] },
  { code: "BUSA 4000", title: "Global Business", hrs: 3, req: "senior", note: "Needs junior standing." },
  { code: "BUSA 4980", title: "Strategic Management", hrs: 3, req: "senior", pre: ["BCOM 3950", "FI 3300", "MGT 3100", "MGT 3400", "LGLS 3610", "MK 3010", "BUSA 4000"], majorCount: 4, co: ["BUSA 4990"], last: true, partly: ["analytical"] },
  { code: "BUSA 4990", title: "Comprehensive Exit Exam", hrs: 0, req: "senior", co: ["BUSA 4980"] },
  { code: "ACCT 4100", title: "Accounting Professional Development I", hrs: 0, req: "elective", pre: ["ACCT 2101", "ACCT 2102"], co: ["ACCT 4101"], partly: ["communication"] },
  { code: "ACCT 4391", title: "Field Study in Accounting", hrs: 3, req: "elective", note: "Needs instructor consent and a 3.0 GPA." },
  { code: "ACCT 4520E", title: "Federal Income Taxes II", hrs: 3, req: "elective", pre: ["ACCT 4510"], yes: ["tax"] },
  { code: "ACCT 4760", title: "Artificial Intelligence Applications for Accounting Profession", hrs: 3, req: "elective", partly: ["analytics"] },
  { code: "ACCT 4810", title: "ESG Decisions and Disclosures of Business", hrs: 3, req: "elective" },
  { code: "ACCT 4900E", title: "Accounting Professional Development II (CPA review)", hrs: 3, req: "elective", pre: ["ACCT 4102", "ACCT 4510"], yes: ["cpa"] },
  { code: "ACCT 4411", title: "Financial Reporting Issues in the European Union", hrs: 3, req: "elective", pre: ["ACCT 2101", "ACCT 2102"] },
];
export const REQ_GROUPS: { id: ReqGroup; name: string }[] = [
  { id: "lower", name: "Lower-division requirements" },
  { id: "foundation", name: "Business Foundation" },
  { id: "core", name: "Junior Business Core" },
  { id: "major", name: "Accounting major" },
  { id: "senior", name: "Senior requirements" },
  { id: "elective", name: "Accounting electives (optional)" },
];
// Why a course matters for internships and planning
export const WHY: Record<string, string> = {
  "ACCT 4101": "The class recruiters look for first: it's where GAAP and financial reporting are taught, and it unlocks most of the major.",
  "ACCT 4102": "Finishes financial reporting. It's required before auditing (ACCT 4610) and the capstone (ACCT 4750).",
  "ACCT 4210": "Cost and managerial accounting. Most useful for corporate accounting roles, and required before ACCT 4310.",
  "ACCT 4310": "Information systems and internal controls. Useful for risk and advisory internships, and required before ACCT 4610.",
  "ACCT 4510": "Tax. The key class for tax internships and busy-season roles.",
  "ACCT 4610": "Auditing. The most relevant class for audit internships, one of the most common internships at CPA firms.",
  "ACCT 4750": "The accounting capstone, usually taken near the end.",
  "ACCT 4100": "A zero-credit class taken alongside ACCT 4101 on networking, presenting, and accounting careers.",
  "ACCT 4391": "Lets you earn course credit for an accounting internship. Talk to the School of Accountancy before you register.",
  "ACCT 4520E": "More tax, for anyone leaning toward a tax career.",
  "ACCT 4760": "AI tools in audit, tax, and reporting. Firms increasingly want these skills.",
  "ACCT 4900E": "CPA exam review. Good in your last year if you plan to sit for the CPA.",
  "BCOM 3950": "Required before ACCT 4102, so take it early.",
  "MGT 3100": "Required before ACCT 4310.",
  "BUSA 4980": "The business capstone. Take it in your final semester with BUSA 4990.",
  "BUSA 4990": "The exit exam, taken the same semester as BUSA 4980.",
};
export const COURSE_BY_CODE: Record<string, Course> = Object.fromEntries(COURSES.map(c => [c.code, c]));
export const ALIASES: Record<string, string> = { "MATH 1070": "MATH 1401" };
export const REQUIRED = COURSES.filter(c => c.req !== "elective").map(c => c.code);
export const MAJOR = COURSES.filter(c => c.req === "major").map(c => c.code);
export const courseLabel = (c: Course): string => c.code + " " + c.title;
export function codesIn(text: string): string[] {
  return [...String(text).matchAll(/\b([a-z]{2,4})\s?(\d{4}[a-z]?)\b/gi)].map(m => m[1].toUpperCase() + " " + m[2].toUpperCase());
}
export function gsuCourseFor(text: string): Course | null {
  for (const code of codesIn(text)) { const c = COURSE_BY_CODE[ALIASES[code] || code]; if (c) return c; }
  return null;
}
// Longest chain of courses that wait on this one
export const DEPTH: Record<string, number> = {};
const depthOf = (code: string): number => {
  if (DEPTH[code] !== undefined) return DEPTH[code];
  DEPTH[code] = 0;
  const next = COURSES.filter(d => d.req !== "elective" && ((d.pre || []).includes(code) || (d.any || []).some(a => a.includes(code))));
  return (DEPTH[code] = next.length ? 1 + Math.max(...next.map(d => depthOf(d.code))) : 0);
};
COURSES.forEach(c => depthOf(c.code));
// Courses that must be finished before a final-semester course (the capstone)
export const BEFORE_LAST = new Set(COURSES.filter(c => c.last).flatMap(c => c.pre || []));
// How many required courses can't start until this one is done
export const UNLOCKS: Record<string, number> = {};
for (const c of COURSES) {
  const seen = new Set<string>(), stack = [c.code];
  while (stack.length) {
    const cur = stack.pop() as string;
    for (const d of COURSES) {
      const needs = (d.pre || []).includes(cur) || (d.any || []).some(a => a.includes(cur));
      if (needs && !seen.has(d.code)) { seen.add(d.code); stack.push(d.code); }
    }
  }
  UNLOCKS[c.code] = [...seen].filter(x => REQUIRED.includes(x)).length;
}
