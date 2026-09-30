// Application statuses on the internship board, in board order
import type { Status } from "../types";
import { k, t } from "../lib/i18n";

export const STATUSES: readonly Status[] = ["Saved", "In progress", "Applied", "Interview", "Offer", "Rejected"];
const STATUS_LABEL: Record<Status, string> = { Saved: k("To apply"), "In progress": k("Working on"), Applied: k("Applied"), Interview: k("Interview"), Offer: k("Offer"), Rejected: k("Closed") };
/** What the board calls each status, in the chosen language. */
export const statusLabel = (s: Status): string => t(STATUS_LABEL[s]);
/** CSS color key for each status. */
export const STATUS_KEY: Record<Status, string> = { Saved: "todo", "In progress": "wip", Applied: "applied", Interview: "interview", Offer: "offer", Rejected: "closed" };
/** Before applying: the only statuses where a deadline can be urgent. */
export const OPEN_STATUSES: readonly Status[] = ["Saved", "In progress"];
