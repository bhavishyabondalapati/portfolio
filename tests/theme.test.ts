// The theme script and the invitation to the Boston page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { THEME_KEY, themeScript } from "../src/lib/theme.ts";
import { survey } from "../src/content.ts";

test("the inline head script is valid JavaScript and sets the theme", () => {
  assert.doesNotThrow(() => new Function(themeScript));
  assert.ok(themeScript.includes(THEME_KEY));
  assert.ok(themeScript.includes("dataset.theme"));
});

test("the plain site invites visitors to walk the Charles, and has no flyover left", () => {
  assert.equal(survey.invite.walkButton, "Walk the Charles");
  assert.equal(survey.backLabel, "Back to the plain site");
  assert.equal("flight" in survey, false);
  assert.equal(JSON.stringify(survey).includes("Fly the survey"), false);
});
