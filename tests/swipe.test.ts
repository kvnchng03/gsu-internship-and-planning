import { describe, expect, it } from "vitest";
import { swipeStep } from "../src/ui/swipe";

const free = { atStart: true, atEnd: true };

describe("swipeStep", () => {
  it("moves to the next view on a quick swipe left and the previous on a swipe right", () => {
    expect(swipeStep({ dx: -120, dy: 10, ms: 250 }, [])).toBe(1);
    expect(swipeStep({ dx: 120, dy: -10, ms: 250 }, [])).toBe(-1);
  });

  it("ignores short, slow, or mostly up-and-down gestures", () => {
    expect(swipeStep({ dx: -40, dy: 0, ms: 200 }, [])).toBe(0);
    expect(swipeStep({ dx: -120, dy: 0, ms: 1500 }, [])).toBe(0);
    expect(swipeStep({ dx: -120, dy: 90, ms: 250 }, [])).toBe(0);
  });

  it("lets a sideways list scroll first, and switches views only once it's at its edge", () => {
    const middle = { atStart: false, atEnd: false };
    expect(swipeStep({ dx: -120, dy: 0, ms: 250 }, [middle])).toBe(0);
    expect(swipeStep({ dx: 120, dy: 0, ms: 250 }, [middle])).toBe(0);
    // At the last column, a swipe left moves on; a swipe right scrolls the board back
    const end = { atStart: false, atEnd: true };
    expect(swipeStep({ dx: -120, dy: 0, ms: 250 }, [end])).toBe(1);
    expect(swipeStep({ dx: 120, dy: 0, ms: 250 }, [end])).toBe(0);
    // A list that fits without scrolling never gets in the way
    expect(swipeStep({ dx: 120, dy: 0, ms: 250 }, [free])).toBe(-1);
  });
});
