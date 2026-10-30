// Who gets the 3D tour and who gets the fast page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decideMode } from "../src/lib/tourMode.ts";

const desktop = { width: 1440, finePointer: true, reducedMotion: false, saveData: false, preference: null } as const;

test("desktop with a mouse gets the tour", () => {
  assert.deepEqual(decideMode(desktop), { mode: "tour", eligible: true });
});

test("phones and tablets get the fast page and no tour button", () => {
  assert.deepEqual(decideMode({ ...desktop, width: 375, finePointer: false }), { mode: "fast", eligible: false });
  assert.deepEqual(decideMode({ ...desktop, width: 768 }), { mode: "fast", eligible: false });
});

test("reduced motion and Data Saver get the fast page", () => {
  assert.equal(decideMode({ ...desktop, reducedMotion: true }).mode, "fast");
  assert.equal(decideMode({ ...desktop, saveData: true }).mode, "fast");
});

test("Skip the tour is remembered but the tour stays offered", () => {
  assert.deepEqual(decideMode({ ...desktop, preference: "off" }), { mode: "fast", eligible: true });
});

test("?tour=on forces the tour (used to render the stills)", () => {
  assert.equal(decideMode({ ...desktop, width: 800, finePointer: false, preference: "on" }).mode, "tour");
});
