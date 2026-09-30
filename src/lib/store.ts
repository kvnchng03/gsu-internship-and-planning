// The app's data: what's saved, how it's loaded, and how changes are kept
import type { Posting, State, Status, UI } from "../types";
import { SKILL_BY_ID } from "../data/skills";
import { COURSE_BY_CODE } from "../data/courses";
import { STATUSES } from "../data/statuses";
import { termIndex } from "./plan";
import { toast } from "../ui/dom";
import { t } from "./i18n";

export const LS_KEY = "internship-ledger-v1";

export function emptyState(): State {
  return { profile: { name: "", year: "Junior", grad: "", skills: [], classes: [], learning: [], resume: "" }, postings: [], plan: { terms: [] } };
}
export const starterState = emptyState;

function daysFromNow(n: number): string {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Example data shown to a first-time visitor, so the app never opens empty. Nothing about it is saved. */
export function exampleState(): State {
  const posting = (id: string, company: string, role: string, deadline: string, status: Status, age: number, text: string): Posting =>
    ({ id, company, role, link: "", deadline, status, createdAt: Date.now() - age, priority: false, text });
  return {
    example: true,
    plan: { terms: [] },
    profile: {
      name: "", year: "Junior", grad: "May 2028", learning: [], resume: "",
      skills: ["Excel", "QuickBooks", "Communication"],
      classes: ["ACCT 2101 Principles of Accounting I", "ACCT 2102 Principles of Accounting II", "CIS 2010 Introduction to Information Systems", "ACCT 4101 Essentials of Financial Reporting I"],
    },
    postings: [
      posting("ex1", "Mid-size CPA firm (example)", "Audit Intern, Summer 2027", daysFromNow(16), "Saved", 3e8,
        "Our audit interns join engagement teams serving private and public clients. You will help test internal controls, document audit procedures, and prepare workpapers under GAAP. Requirements: pursuing a degree in accounting with plans to meet the 150 credit hours needed for CPA licensure; proficiency in Excel; strong written and verbal communication; attention to detail; ability to work as part of a team."),
      posting("ex2", "Manufacturing company (example)", "Corporate Accounting Intern", "", "Applied", 2e8,
        "Support the corporate accounting team with month-end close. Prepare journal entries and account reconciliations, assist accounts payable with invoice processing, and help analyze variances. Qualifications: junior or senior accounting major; intermediate Excel including pivot tables and VLOOKUP; experience with SAP a plus; detail-oriented with strong analytical skills."),
      posting("ex3", "Local tax practice (example)", "Tax Season Intern (Jan-Apr 2027)", daysFromNow(33), "Saved", 1e8,
        "Join us for busy season. Prepare individual and small-business tax returns, organize client documents, and maintain books in QuickBooks. Looking for accounting students who have completed or are taking an individual tax course, are comfortable in Excel, communicate well with clients, and are interested in pursuing the CPA."),
    ],
  };
}

const str = (v: unknown, fallback = ""): string => (v == null ? fallback : String(v));
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";

/** Rebuild saved or restored data into a known-good shape, dropping anything malformed. */
export function normalize(raw: unknown): State {
  const s = emptyState();
  if (!isRecord(raw)) return s;
  const p = isRecord(raw.profile) ? raw.profile : {};
  s.profile = {
    name: str(p.name), year: str(p.year, "Junior") || "Junior", grad: str(p.grad),
    skills: strList(p.skills),
    learning: strList(p.learning).filter(id => SKILL_BY_ID[id]),
    classes: strList(p.classes),
    resume: str(p.resume).slice(0, 20000),
  };
  const placed = new Set<string>();
  const plan = isRecord(raw.plan) ? raw.plan : {};
  const terms = Array.isArray(plan.terms) ? plan.terms.filter(isRecord) : [];
  s.plan = {
    terms: terms
      .filter(t => /^\d{4}-[123]$/.test(str(t.id)))
      .map(t => ({
        id: str(t.id),
        codes: strList(t.codes).filter(c => COURSE_BY_CODE[c] && !placed.has(c) && placed.add(c)),
      }))
      .sort((a, b) => termIndex(a.id) - termIndex(b.id)),
  };
  const postings = Array.isArray(raw.postings) ? raw.postings.filter(isRecord) : [];
  s.postings = postings.filter(x => x.id).map(x => ({
    id: str(x.id), company: str(x.company), role: str(x.role), link: str(x.link),
    deadline: str(x.deadline),
    status: (STATUSES as readonly unknown[]).includes(x.status) ? (x.status as Status) : "Saved",
    text: str(x.text), createdAt: Number(x.createdAt) || Date.now(), priority: !!x.priority,
  }));
  return s;
}

function loadLocal(): State | null {
  try { const v = localStorage.getItem(LS_KEY); return v ? normalize(JSON.parse(v)) : null; } catch { return null; }
}

/** The current data. Read it anywhere; replace it only through setState. */
export let state: State = loadLocal() || exampleState();
export function setState(next: State): void { state = next; }

export const ui: UI = {
  view: "plan",
  pane: { plan: "center", skills: "center" },
  focusTerm: null,
  libQuery: "",
  libFilter: "all",
  postTab: "board",
  calFrom: "",
  calMode: "",
  dialog: null,
  armed: null,
  openSkills: new Set(),
  openChecks: new Set(),
};

let render: () => void = () => {};
/** main.ts hands in the page's render function, so data code doesn't depend on views. */
export function setRenderer(fn: () => void): void { render = fn; }
export function rerender(): void { render(); }

export function setSave(kind: "example" | "local" | "error"): void {
  const el = document.getElementById("saveState");
  if (!el) return;
  el.dataset.state = kind;
  el.textContent = { example: t("Example · not saved"), local: t("Saved in this browser"), error: t("Couldn't save. Browser storage is full or blocked") }[kind];
}
function persist(): void {
  if (state.example) { setSave("example"); return; }
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); setSave("local"); } catch { setSave("error"); }
}

/** The first real edit replaces the example data with the student's own. */
export function ensureOwn(): void {
  if (!state.example) return;
  state = starterState();
  const banner = document.getElementById("exampleBanner");
  if (banner) banner.hidden = true;
  toast(t("Cleared the example. This plan is yours now."));
}
/** Save, then redraw. Every change goes through here. */
export function commit(): void { persist(); render(); }

export function addTag(key: "skills" | "classes", value: string): void {
  const v = value.trim().replace(/\s+/g, " ");
  if (!v) return;
  ensureOwn();
  const list = state.profile[key];
  if (!list.some(x => x.toLowerCase() === v.toLowerCase())) list.push(v);
  commit();
}
