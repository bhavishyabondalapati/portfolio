// The walk through the house, as numbers both the HTML and the 3D renderer agree on.
// A journey position j runs 0..1 over the hero, 1..2 over Experience, 2..3 over Projects.

/** DOM sections that carry the walk, in order. */
export const JOURNEY_SECTIONS = ["top", "experience", "projects"] as const;

/** Where each experience panel's stop sits on the walk (one per job, in the courtyard). */
export const experienceStops = [1.44, 1.74];

/** Where each project's stop sits (one per bay in the corridor). */
export const projectStop = (i: number) => 2 + i * 0.25 + 0.125;

/**
 * Journey position from the current layout. Each section maps its own scroll to one unit of j;
 * the last one ends when its bottom reaches the bottom of the screen.
 */
export function journeyFromRects(rects: { top: number; height: number }[], viewport: number) {
  for (let i = 0; i < rects.length; i++) {
    const last = i === rects.length - 1;
    const span = Math.max(1, last ? rects[i].height - viewport : rects[i].height);
    const local = -rects[i].top / span;
    if (local < 0 && i === 0) return 0;
    if (local < 1 || last) return i + Math.min(1, Math.max(0, local));
  }
  return rects.length;
}

/** The scroll position (from the top of the page) that puts the walk at position j. */
export function scrollForJourney(j: number, tops: number[], heights: number[], viewport: number) {
  const i = Math.min(tops.length - 1, Math.max(0, Math.floor(j)));
  const last = i === tops.length - 1;
  const span = last ? heights[i] - viewport : heights[i];
  return tops[i] + (j - i) * span;
}
