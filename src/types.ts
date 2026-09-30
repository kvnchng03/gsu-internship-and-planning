// Shared shapes for the whole app

/** Where a student stands on a skill. */
export type Have = "yes" | "partly" | "no";
/** How a skill is shown: studying it overrides anything but already having it. */
export type Shown = Have | "learning";

export interface Skill { id: string; name: string; re: RegExp; tip: string }
export interface GuideInfo { what: string; check: string; learn: string[] }
/** A typed-in class name pattern and the skills it counts toward. */
export interface ClassRule { re: RegExp; yes?: string[]; partly?: string[] }

export type ReqGroup = "lower" | "foundation" | "core" | "major" | "senior" | "elective";
export interface Course {
  code: string;
  title: string;
  hrs: number;
  req: ReqGroup;
  /** Every one of these must come first. */
  pre?: string[];
  /** One course from each list must come first. */
  any?: string[][];
  /** Same term or earlier. */
  co?: string[];
  yes?: string[];
  partly?: string[];
  note?: string;
  /** How many accounting major classes must come first. */
  majorCount?: number;
  /** Belongs in the final semester. */
  last?: boolean;
}

export type Status = "Saved" | "In progress" | "Applied" | "Interview" | "Offer" | "Rejected";
export interface Posting {
  id: string;
  company: string;
  role: string;
  link: string;
  deadline: string;
  status: Status;
  text: string;
  createdAt: number;
  priority: boolean;
}

export interface Profile {
  name: string;
  year: string;
  grad: string;
  skills: string[];
  classes: string[];
  learning: string[];
  resume: string;
}
export interface Term { id: string; codes: string[] }
export interface State {
  example?: boolean;
  profile: Profile;
  postings: Posting[];
  plan: { terms: Term[] };
}

export type ViewId = "plan" | "postings" | "calendar" | "skills" | "summary";
export type PaneId = "left" | "center" | "right";
export type DialogState =
  | { kind: "course"; code: string; live: true }
  | { kind: "posting-view"; id: string; live: true }
  | { kind: "posting"; id: string | null; live: false }
  | { kind: "palette" | "copy" | "backup" | "restore" | "calendar"; live: false };
export interface UI {
  view: ViewId;
  pane: Record<"plan" | "skills", PaneId>;
  focusTerm: string | null;
  libQuery: string;
  libFilter: "all" | "open" | "elective" | "done";
  postTab: "board" | "results";
  /** The date the Calendar view is centered on, YYYY-MM-DD ("" means today). */
  calFrom: string;
  /** Day, week, or month; "" picks day on phones and week elsewhere. */
  calMode: "" | "day" | "week" | "month";
  dialog: DialogState | null;
  armed: string | null;
  openSkills: Set<string>;
  openChecks: Set<string>;
}

/** What the plan knows at a glance: classes taken, and where each planned class sits. */
export interface PlanContext { taken: Set<string>; where: Record<string, number>; lastPos: number }
export interface SkillHit { id: string; name: string; have: Have }
export type Kid = Node | string | number | null | undefined | false | Kid[];
