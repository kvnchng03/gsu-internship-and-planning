// Phones: swipe left or right anywhere in a view to move to the next or previous view in the tab bar.
// Things that scroll sideways themselves (the board, the requirement boxes) scroll first; once one is at its
// edge, the next swipe that way changes the view.

export interface Gesture { dx: number; dy: number; ms: number }
/** Where a sideways-scrolling area stood when the finger went down. */
export interface Edge { atStart: boolean; atEnd: boolean }

/** 1 for the next view, -1 for the previous, 0 when the gesture wasn't a clear sideways swipe. */
export function swipeStep(g: Gesture, scrollers: Edge[]): -1 | 0 | 1 {
  if (g.ms > 800 || Math.abs(g.dx) < 60 || Math.abs(g.dx) < 2 * Math.abs(g.dy)) return 0;
  // A swipe left shows what's to the right: the view changes only if nothing under the finger can scroll that way
  if (g.dx < 0) return scrollers.every(s => s.atEnd) ? 1 : 0;
  return scrollers.every(s => s.atStart) ? -1 : 0;
}

/** The sideways-scrolling areas between the touched element and the view, and whether each was at an edge. */
function edgesAt(el: Element | null, stop: Element): Edge[] {
  const out: Edge[] = [];
  for (let n = el; n && n !== stop; n = n.parentElement) {
    if (!(n instanceof HTMLElement) || n.scrollWidth <= n.clientWidth + 1 || !/auto|scroll/.test(getComputedStyle(n).overflowX)) continue;
    out.push({ atStart: n.scrollLeft <= 1, atEnd: n.scrollLeft + n.clientWidth >= n.scrollWidth - 1 });
  }
  return out;
}

/** Wires swiping on the view area. `enabled` says whether the phone tab bar is showing; `go` moves by one view. */
export function watchSwipe(area: HTMLElement, enabled: () => boolean, go: (step: 1 | -1) => boolean): void {
  let start: { x: number; y: number; t: number; edges: Edge[] } | null = null;
  area.addEventListener("touchstart", e => {
    const target = e.target as Element | null;
    start = null;
    // One finger, not typing, and only where the tab bar is showing
    if (e.touches.length !== 1 || !enabled() || target?.closest("input, textarea, select, [contenteditable]")) return;
    const t = e.touches[0];
    start = { x: t.clientX, y: t.clientY, t: e.timeStamp, edges: edgesAt(target, area) };
  }, { passive: true });
  area.addEventListener("touchcancel", () => { start = null; }, { passive: true });
  area.addEventListener("touchend", e => {
    if (!start || e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    const step = swipeStep({ dx: t.clientX - start.x, dy: t.clientY - start.y, ms: e.timeStamp - start.t }, start.edges);
    start = null;
    if (!step || !go(step)) return;
    // Slide the new view in from the side the finger moved away from
    area.classList.remove("swipe-next", "swipe-prev");
    void area.offsetWidth;
    area.classList.add(step === 1 ? "swipe-next" : "swipe-prev");
  }, { passive: true });
  area.addEventListener("animationend", () => area.classList.remove("swipe-next", "swipe-prev"));
}
