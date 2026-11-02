// Who is offered the 3D flyover, and when it opens by itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decideFlyover, surveyScript } from "../src/lib/surveyMode.ts";

const laptop = { enabled: true, width: 1440, finePointer: true, reducedMotion: false, saveData: false, cores: 8, preference: null };

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

test("with the feature flag off, nobody is offered it and a remembered choice never opens it", () => {
  assert.deepEqual(decideFlyover({ ...laptop, enabled: false, preference: "fun" }), { offer: false, mode: "plain" });
});

test("the inline head script is valid JavaScript, with the flag on or off", () => {
  for (const on of [true, false]) assert.doesNotThrow(() => new Function(surveyScript(on)));
  assert.ok(surveyScript(false).includes("enabled:false"));
});

test("the flag is off unless the build sets NEXT_PUBLIC_FLYOVER=on", async () => {
  const { FLYOVER_ENABLED } = await import("../src/lib/site.ts");
  assert.equal(FLYOVER_ENABLED, process.env.NEXT_PUBLIC_FLYOVER === "on");
});
