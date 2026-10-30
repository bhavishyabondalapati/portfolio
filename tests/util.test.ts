// The small maths the camera and kitten rely on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { damp, mulberry32, smooth } from "../src/engine/util.ts";

test("damp moves toward the target and never overshoots", () => {
  let v = 0;
  for (let i = 0; i < 120; i++) v = damp(v, 1, 5, 1 / 60);
  assert.ok(v > 0.99 && v <= 1);
});

test("damp is frame-rate independent", () => {
  let a = 0;
  let b = 0;
  for (let i = 0; i < 60; i++) a = damp(a, 1, 3, 1 / 60);
  for (let i = 0; i < 30; i++) b = damp(b, 1, 3, 1 / 30);
  assert.ok(Math.abs(a - b) < 1e-9);
});

test("smooth clamps to 0 and 1 outside its edges", () => {
  assert.equal(smooth(1, 2, 0), 0);
  assert.equal(smooth(1, 2, 3), 1);
  assert.equal(smooth(0, 1, 0.5), 0.5);
});

test("seeded random is repeatable, so the house looks the same every visit", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  assert.equal(a(), b());
});
