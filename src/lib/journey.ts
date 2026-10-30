// The walk through the house, as numbers both the HTML and the 3D renderer agree on.
// A journey position j runs one unit per section: 0..1 the hero, 1..2 Experience, 2..3 Projects,
// 3..4 Other work, 4..5 About, 5..6 Contact.

/** DOM sections that carry the walk, in order. */
export const JOURNEY_SECTIONS = ["top", "experience", "projects", "other-work", "about", "contact"] as const;

/** Where each experience panel's stop sits on the walk (one per job, in the courtyard). */
export const experienceStops = [1.44, 1.74];

/** Where each project's stop sits (one per bay in the corridor). */
export const projectStop = (i: number) => 2 + i * 0.25 + 0.125;

/** The last three stops: the ledger at the end of the corridor, then the back courtyard at dusk. */
export const endStops = { ledger: 3.42, about: 4.48, contact: 5.75 };

/** When each lamp in the back courtyard lights, one by one, as you walk in. */
export const backLampTimes = [4.04, 4.1, 4.24, 4.3, 4.62, 4.7, 5.06, 5.14, 5.3];

/** Where an in-page link should land in the tour: the first stop with a panel in that section. */
export const linkStops: Record<string, number> = {
  top: 0,
  experience: experienceStops[0],
  projects: projectStop(0),
  "other-work": endStops.ledger,
  about: endStops.about,
  contact: endStops.contact,
};

/** Every place the walk pauses, so scrolling can settle on the nearest one. */
export const allStops = [
  0,
  ...experienceStops,
  ...[0, 1, 2, 3].map(projectStop),
  endStops.ledger,
  endStops.about,
  endStops.contact,
];

/** Which part of the house a journey position is in. */
export function chapterAt(j: number) {
  if (j < 1.05) return "";
  if (j < 2) return "experience";
  if (j < 3) return "projects";
  if (j < 4) return "other-work";
  if (j < 5) return "about";
  return "contact";
}

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
