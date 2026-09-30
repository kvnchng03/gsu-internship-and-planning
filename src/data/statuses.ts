// Application statuses on the internship board, in board order
import type { Status } from "../types";

export const STATUSES: readonly Status[] = ["Saved", "In progress", "Applied", "Interview", "Offer", "Rejected"];
export const STATUS_LABEL: Record<Status, string> = { Saved: "To apply", "In progress": "Working on", Applied: "Applied", Interview: "Interview", Offer: "Offer", Rejected: "Closed" };
/** CSS color key for each status. */
export const STATUS_KEY: Record<Status, string> = { Saved: "todo", "In progress": "wip", Applied: "applied", Interview: "interview", Offer: "offer", Rejected: "closed" };
/** Before applying: the only statuses where a deadline can be urgent. */
export const OPEN_STATUSES: readonly Status[] = ["Saved", "In progress"];
