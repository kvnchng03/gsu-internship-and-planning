// Internship postings: deadlines, duplicates, matching, and what the whole set asks for
import type { Have, Posting, SkillHit, Status } from "../types";
import { SKILL_BY_ID } from "../data/skills";
import { OPEN_STATUSES, STATUS_LABEL } from "../data/statuses";
import { analyze, type HaveMap } from "./skills";
import { commit, state } from "./store";
import { toast } from "../ui/dom";

export const MAX_TEXT = 8000;

export type Urgency = "overdue" | "urgent" | "soon" | "";
export interface Due { text: string; level: Urgency; days: number }
/** How pressing a posting's deadline is. Only postings you haven't applied to yet can be urgent. */
export function dueInfo(p: Posting, now: Date = new Date()): Due | null {
  if (!p.deadline) return null;
  const d = new Date(p.deadline + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 864e5); // whole calendar days, so tomorrow is 1
  const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (!OPEN_STATUSES.includes(p.status)) return { text: "Due " + label, level: "", days };
  if (days < 0) return { text: "Overdue · " + label, level: "overdue", days };
  if (days <= 3) return { text: (days === 0 ? "Due today" : "Due in " + days + "d") + " · " + label, level: "urgent", days };
  if (days <= 7) return { text: "Due in " + days + "d · " + label, level: "soon", days };
  return { text: "Due " + label, level: "", days };
}

/** Link identity for spotting the same posting saved twice: ignores tracking junk, case, and trailing slashes. */
export function linkKey(u: string): string {
  const raw = String(u || "").trim();
  if (!raw) return "";
  try {
    const x = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
    for (const k of [...x.searchParams.keys()]) if (/^utm_|^(ref|refid|src|source|trk|trackingid|gh_src|lipi)$/i.test(k)) x.searchParams.delete(k);
    x.searchParams.sort();
    const q = x.searchParams.toString();
    return (x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "") + (q ? "?" + q : "")).toLowerCase();
  } catch { return raw.toLowerCase().replace(/\/+$/, ""); }
}
export function findDuplicate(link: string, exceptId?: string | null): Posting | null {
  const key = linkKey(link);
  return key ? state.postings.find(x => x.id !== exceptId && linkKey(x.link) === key) || null : null;
}

export interface Match { skills: SkillHit[]; score: number; total: number }
/** Skills matched: each skill you have counts 1, each partly skill counts half. */
export function matchOf(p: Posting, have: HaveMap): Match {
  const skills = analyze(p, have);
  const score = skills.filter(s => s.have === "yes").length + 0.5 * skills.filter(s => s.have === "partly").length;
  return { skills, score, total: skills.length };
}

/** Most pressing first: overdue, then urgent, then starred, then due soon, then soonest deadline. */
export function boardOrder(a: Posting, b: Posting): number {
  const rank = (p: Posting) => {
    const d = dueInfo(p);
    return d && d.level === "overdue" ? 0 : d && d.level === "urgent" ? 1 : p.priority ? 2 : d && d.level === "soon" ? 3 : 4;
  };
  return rank(a) - rank(b) || (a.deadline || "9999").localeCompare(b.deadline || "9999") || b.createdAt - a.createdAt;
}
export function togglePriority(p: Posting): void { p.priority = !p.priority; commit(); toast(p.priority ? "Marked as priority." : "Priority removed."); }
export function setStatus(p: Posting, s: Status): void {
  if (p.status === s) return;
  p.status = s; commit(); toast((p.company || "Posting") + " moved to " + STATUS_LABEL[s] + ".");
}

export interface Tally { id: string; name: string; count: number; have: Have }
/** How many postings ask for each skill, and where the student stands on it. Most asked-for first. */
export function skillTally(have: HaveMap, posts: Posting[]): Tally[] {
  const tally: Record<string, Tally> = {};
  const rank: Record<Have, number> = { no: 0, partly: 1, yes: 2 };
  for (const p of posts) {
    const seen = new Set<string>();
    for (const s of analyze(p, have)) {
      if (seen.has(s.id)) continue; seen.add(s.id);
      const t = tally[s.id] || (tally[s.id] = { id: s.id, name: s.name, count: 0, have: s.have });
      t.count++;
      if (rank[s.have] > rank[t.have]) t.have = s.have;
    }
  }
  for (const t of Object.values(tally)) if (SKILL_BY_ID[t.id] && have[t.id]) t.have = have[t.id];
  return Object.values(tally).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

const JOB_TYPES: [string, RegExp][] = [
  ["Audit", /audit|assurance/],
  ["Tax", /\btax/],
  ["Advisory", /advisory|consult|risk|forensic|valuation/],
  ["Corporate accounting", /corporate|staff account|accounts (payable|receivable)|general ledger|month[- ]end|financial (analyst|reporting)|fp&a|controller/],
];
/** What kind of internship this is, from the title first and then the start of the description. */
export function jobType(p: Posting): string {
  const role = (p.role + " " + p.company).toLowerCase(), text = p.text.toLowerCase();
  for (const [name, re] of JOB_TYPES) if (re.test(role)) return name;
  for (const [name, re] of JOB_TYPES) if (re.test(text.slice(0, 400))) return name;
  return "Other";
}
