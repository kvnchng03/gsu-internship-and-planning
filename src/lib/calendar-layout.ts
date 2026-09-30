// Calendar geometry: which days a view shows, and where timed events sit in a day column

export type CalMode = "day" | "week" | "month";

export const dayStart = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number): Date => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const sameDay = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const isoDay = (d: Date): string => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const parseDay = (day: string): Date => new Date(day + "T00:00:00");

/** The days a view shows around an anchor date. Weeks start on Sunday; a month shows six full weeks. */
export function visibleDays(mode: CalMode, anchor: Date): Date[] {
  const a = dayStart(anchor);
  if (mode === "day") return [a];
  if (mode === "week") { const s = addDays(a, -a.getDay()); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); }
  const first = new Date(a.getFullYear(), a.getMonth(), 1);
  const s = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(s, i));
}
/** Moves the anchor one view's worth forward or back. */
export function step(mode: CalMode, anchor: Date, dir: 1 | -1): Date {
  if (mode === "month") return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
  return addDays(anchor, dir * (mode === "week" ? 7 : 1));
}

export interface Timed { start: Date; end: Date }
export interface Placed<T> { item: T; top: number; height: number; lane: number; lanes: number }
/**
 * Lays out timed events within one day as Google Calendar does: position and height by time (in minutes
 * from midnight, clipped to the day), and overlapping events share the width in side-by-side lanes.
 */
export function layoutDay<T extends Timed>(items: T[], day: Date, minMinutes = 20): Placed<T>[] {
  const d0 = dayStart(day).getTime(), d1 = addDays(dayStart(day), 1).getTime();
  const segs = items
    .filter(e => e.start.getTime() < d1 && e.end.getTime() > d0)
    .map(item => {
      const top = (Math.max(item.start.getTime(), d0) - d0) / 60_000;
      const bottom = (Math.min(item.end.getTime(), d1) - d0) / 60_000;
      return { item, top, height: Math.max(bottom - top, minMinutes), lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.top - b.top || b.height - a.height);
  // Group into clusters of events that overlap each other, then fill lanes within each cluster
  let cluster: typeof segs = [], clusterEnd = -1;
  const laneEnds: number[] = [];
  const close = () => { const n = laneEnds.length; for (const s of cluster) s.lanes = n; cluster = []; laneEnds.length = 0; };
  for (const s of segs) {
    if (s.top >= clusterEnd) close();
    let lane = laneEnds.findIndex(end => end <= s.top);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
    laneEnds[lane] = s.top + s.height;
    s.lane = lane;
    cluster.push(s);
    clusterEnd = Math.max(clusterEnd, s.top + s.height);
  }
  close();
  return segs;
}
