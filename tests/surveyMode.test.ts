// Who is offered the 3D flyover, and when it opens by itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decideFlyover, SURVEY_SCRIPT } from "../src/lib/surveyMode.ts";

const laptop = { width: 1440, finePointer: true, reducedMotion: false, saveData: false, cores: 8, preference: null };

test("the plain site is the default, even on a capable laptop", () => {
  assert.deepEqual(decideFlyover(laptop), { offer: true, mode: "plain" });
});

test("the flyover opens by itself only when the visitor chose it last time", () => {
  assert.equal(decideFlyover({ ...laptop, preference: "fun" }).mode, "fun");
  assert.equal(decideFlyover({ ...laptop, preference: "plain" }).mode, "plain");
});

test("phones, reduced motion, data saver and weak devices are never offered it", () => {
  for (const change of [{ width: 390, finePointer: false }, { reducedMotion: true }, { saveData: true }, { cores: 2 }]) {
    const r = decideFlyover({ ...laptop, ...change, preference: "fun" });
    assert.deepEqual(r, { offer: false, mode: "plain" }, JSON.stringify(change));
  }
});

test("the inline head script is valid JavaScript", () => {
  assert.doesNotThrow(() => new Function(SURVEY_SCRIPT));
});
