// Skill matching: what a student has, what a posting asks for, and resume evidence
import type { ClassRule, Course, Have, Posting, Profile, Shown, Skill, SkillHit } from "../types";
import { gsuCourseFor } from "../data/courses";
import { CLASS_MAP, SKILLS, SKILL_BY_ID } from "../data/skills";
import { state } from "./store";

export type HaveMap = Record<string, Have>;

/** Where the student stands on every skill: from their skill list, their classes, and their resume. */
export function haveMap(profile: Profile): HaveMap {
  const have: HaveMap = {};
  for (const raw of profile.skills) {
    const t = raw.toLowerCase();
    for (const s of SKILLS) if (s.re.test(t) || t === s.name.toLowerCase()) have[s.id] = "yes";
  }
  for (const [id, v] of Object.entries(classCoverage(profile))) if (!have[id] || v === "yes") have[id] = v;
  // Work described in resume bullets is evidence, but only "partly": confirm it in the skill guide
  for (const id of resumeEvidence(profile)) if (!have[id]) have[id] = "partly";
  return have;
}

/** Skills the student's classes count toward. GSU courses use the catalog; other class names use patterns. */
export function classCoverage(profile: Profile): HaveMap {
  const out: HaveMap = {};
  const add = (m: Course | ClassRule) => {
    for (const id of m.yes || []) out[id] = "yes";
    for (const id of m.partly || []) if (!out[id]) out[id] = "partly";
  };
  for (const raw of profile.classes) {
    const course = gsuCourseFor(raw);
    if (course) { add(course); continue; }
    const t = raw.toLowerCase();
    for (const m of CLASS_MAP) if (m.re.test(t)) add(m);
  }
  return out;
}

/** The skills a posting asks for, judged against what the student has. Reads the job title too. */
export function analyze(posting: Posting, have: HaveMap): SkillHit[] {
  const t = (posting.role + "\n" + posting.text).toLowerCase();
  return SKILLS.filter(s => s.re.test(t)).map(s => ({ id: s.id, name: s.name, have: have[s.id] || "no" }));
}

export const isLearning = (id: string): boolean => state.profile.learning.includes(id);
/** How a skill should look: having it wins, then studying it, then what the check found. */
export const shown = (id: string, v: Have): Shown => (v === "yes" ? "yes" : isLearning(id) ? "learning" : v);
export function setLearning(id: string, on: boolean): void {
  const list = state.profile.learning.filter(x => x !== id);
  if (on) list.push(id);
  state.profile.learning = list;
}

/** Which of the student's skill tags, classes, and resume count toward a skill. */
export function skillSources(profile: Profile, s: Skill): { tags: string[]; classes: string[] } {
  const tags = profile.skills.filter(t => s.re.test(t.toLowerCase()) || t.toLowerCase() === s.name.toLowerCase());
  const classes = profile.classes.filter(c => {
    const course = gsuCourseFor(c);
    const m: (Course | ClassRule)[] = course ? [course] : CLASS_MAP.filter(x => x.re.test(c.toLowerCase()));
    return m.some(x => (x.yes || []).includes(s.id) || (x.partly || []).includes(s.id));
  });
  if (resumeEvidence(profile).has(s.id)) classes.push("your resume bullets");
  return { tags, classes };
}

/** Work that shows a skill without naming it, and the words postings use for it. */
export const RESUME_HINTS: Record<string, [RegExp, string]> = {
  "ap-ar": [/invoice|vendor|bills? paid|collections?|paid on time|payments?/, "accounts payable"],
  cost: [/change orders?|materials?|job cost|project cost|supply costs?/, "job costing"],
  recon: [/\bmatch(ed|ing)?\b|tie[sd]? out|balanc(e|ed|ing) the/, "account reconciliations"],
  journal: [/bookkeeping|record(ed|ing)?\b.*(expense|transaction|account|sale)/, "journal entries"],
  payroll: [/wages|tips|paychecks?|timesheets?/, "payroll"],
  excel: [/spreadsheets?|workbooks?/, "Excel"],
  "fin-statements": [/10-k|balance sheet|income statement|ratios?/, "financial statements"],
  communication: [/present(ed|ing)?|emails?|clients?|explain(ed|ing)?/, "communication"],
  detail: [/\bcheck(ed|ing)?\b|review(ed|ing)?|verif(y|ied)|mistakes?|errors?|accura/, "attention to detail"],
  teamwork: [/\bteam\b|coworkers?|with the (accounting|project)/, "teamwork"],
  tax: [/\btax/, "tax preparation"],
  analytical: [/analy[sz]/, "analysis"],
  budget: [/budget|forecast/, "budgeting"],
  "month-end": [/month[- ]end|closing the books/, "month-end close"],
  controls: [/approv(al|ed|e)|segregat/, "internal controls"],
};

export function resumeBullets(profile: Profile): string[] {
  return String(profile.resume || "").split("\n").map(b => b.replace(/^[\s•\-*·]+/, "").trim()).filter(b => b.length > 3);
}
/** Skills the resume shows, by name or by the work it describes. */
export function resumeEvidence(profile: Profile): Set<string> {
  const ids = new Set<string>();
  for (const b of resumeBullets(profile)) {
    const low = b.toLowerCase();
    for (const sk of SKILLS) if (sk.re.test(low) || (RESUME_HINTS[sk.id] && RESUME_HINTS[sk.id][0].test(low))) ids.add(sk.id);
  }
  return ids;
}

export interface ResumeAdvice {
  /** Bullets to lead with, best match first. */
  lead: { b: string; direct: string[]; implied: string[]; score: number }[];
  /** Skills a bullet shows without the posting's words for them. */
  reword: { id: string; bullet: string; phrase: string }[];
  /** Skills the student has but no bullet shows. */
  unshown: string[];
}
/** How the student's resume lines up with one posting. Null when there are no bullets yet. */
export function resumeAdvice(skills: SkillHit[], have: HaveMap): ResumeAdvice | null {
  const bullets = resumeBullets(state.profile);
  if (!bullets.length) return null;
  const ids = [...new Set(skills.map(s => s.id).filter(id => SKILL_BY_ID[id]))];
  const scored = bullets.map(b => {
    const low = b.toLowerCase();
    const direct = ids.filter(id => SKILL_BY_ID[id].re.test(low));
    const implied = ids.filter(id => !direct.includes(id) && RESUME_HINTS[id] && RESUME_HINTS[id][0].test(low));
    return { b, direct, implied, score: direct.length * 2 + implied.length };
  });
  const lead = scored.filter(x => x.score).sort((a, b) => b.score - a.score).slice(0, 3);
  const reword: ResumeAdvice["reword"] = [];
  for (const id of ids) {
    if (scored.some(x => x.direct.includes(id))) continue;
    const hit = scored.find(x => x.implied.includes(id));
    if (hit) reword.push({ id, bullet: hit.b, phrase: RESUME_HINTS[id][1] });
  }
  const unshown = ids.filter(id => have[id] === "yes" && !scored.some(x => x.direct.includes(id) || x.implied.includes(id)));
  return { lead, reword, unshown };
}
