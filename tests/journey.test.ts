// The scroll-to-walk mapping that keeps the HTML panels and the 3D camera in step.
import { test } from "node:test";
import assert from "node:assert/strict";
import { experienceStops, journeyFromRects, projectStop, scrollForJourney } from "../src/lib/journey.ts";

const VH = 900;
// hero 3420px, experience 2880px, projects 4140px, laid out one after another
const heights = [3420, 2880, 4140];
const tops = [0, 3420, 6300];
const rectsAt = (scroll: number) => heights.map((h, i) => ({ top: tops[i] - scroll, height: h }));

test("the walk starts at 0 and each section is one unit", () => {
  assert.equal(journeyFromRects(rectsAt(0), VH), 0);
  assert.equal(journeyFromRects(rectsAt(3420), VH), 1);
  assert.equal(journeyFromRects(rectsAt(6300), VH), 2);
});

test("the walk ends exactly when the last section's bottom meets the screen bottom", () => {
  assert.equal(journeyFromRects(rectsAt(6300 + 4140 - VH), VH), 3);
  assert.equal(journeyFromRects(rectsAt(20000), VH), 3);
});

test("scrollForJourney is the inverse of journeyFromRects", () => {
  for (const j of [0.3, 1.44, 1.74, projectStop(0), projectStop(3)]) {
    const y = scrollForJourney(j, tops, heights, VH);
    assert.ok(Math.abs(journeyFromRects(rectsAt(y), VH) - j) < 1e-9, `j=${j}`);
  }
});

test("every stop sits inside its own section", () => {
  for (const j of experienceStops) assert.ok(j > 1 && j < 2);
  for (let i = 0; i < 4; i++) assert.ok(projectStop(i) > 2 && projectStop(i) < 3);
});
