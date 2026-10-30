// Guards on the content file: the rules from the brief that are easy to break by accident.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as content from "../src/content.ts";

const allText = JSON.stringify(content);

test("copy has no em dashes", () => {
  assert.equal(allText.includes("—"), false);
});

test("no phone number anywhere", () => {
  assert.equal(/\+?1?[-. (]*617[-. )]*\d{3}[-. ]*\d{4}/.test(allText), false);
  assert.equal(allText.includes("tel:"), false);
});

test("every featured project has problem, built, result, stack and a link", () => {
  assert.equal(content.featured.length, 4);
  for (const p of content.featured) {
    assert.ok(p.problem.length > 20, p.slug);
    assert.ok(p.built.length > 0, p.slug);
    assert.ok(p.result.length > 0, p.slug);
    assert.ok(p.stack.length > 0, p.slug);
    assert.ok(p.links.every((l) => l.href.startsWith("https://")), p.slug);
  }
});

test("hero shows name, role line and one action", () => {
  assert.equal(content.person.name, "Bhavishya Bondalapati");
  // non-breaking spaces keep "May 2027" on one line; compare with plain spaces
  const line = content.person.heroLine.replace(/\u00a0/g, " ");
  assert.ok(line.includes("May 2027"));
  assert.ok(line.includes("full-stack"));
  assert.ok(content.person.heroAction.href.startsWith("#"));
});

test("Kambaz points at the individual build, not the team fork", () => {
  const k = content.secondary.find((s) => s.slug === "kambaz");
  assert.ok(k);
  const hrefs = k.links.map((l) => l.href).join(" ");
  assert.ok(hrefs.includes("kambaz-next-js-navy-sigma.vercel.app"));
  assert.ok(hrefs.includes("/kambaz-next-js") && hrefs.includes("/kambaz-node-server-app"));
  assert.equal(hrefs.includes("eight-theta"), false);
});
