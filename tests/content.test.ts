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
  assert.equal(content.featured.length, 6);
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
  const k = content.coursework.find((s) => s.slug === "kambaz");
  assert.ok(k);
  const hrefs = k.links.map((l) => l.href).join(" ");
  assert.ok(hrefs.includes("kambaz-next-js-navy-sigma.vercel.app"));
  assert.ok(hrefs.includes("/kambaz-next-js") && hrefs.includes("/kambaz-node-server-app"));
  assert.equal(hrefs.includes("eight-theta"), false);
});

test("plain-site project order: the six plates, then coursework, then earlier work", () => {
  assert.deepEqual(
    content.featured.map((p) => p.slug),
    ["aerial-change-intelligence", "llm-gateway", "lexintake", "reporag", "robot-arm-sim", "excel-copilot"]
  );
  assert.deepEqual(content.coursework.map((p) => p.slug), ["kambaz", "calendar"]);
  assert.equal(content.coursework[0].course, "CS 5610 Web Development");
  // the calendar's course number could not be confirmed, so no "CS" number is shown
  assert.equal(/\d/.test(content.coursework[1].course ?? ""), false);
});

test("every plate prints a key figure that appears in its own results", () => {
  for (const p of content.featured) {
    assert.ok(p.figure.value.length > 0 && p.figure.label.length > 0, p.slug);
    // the longest number in the figure (0.898, 3,085, 46, 120) must appear in the plate's own results
    const main = (p.figure.value.match(/\d[\d,.]*/g) ?? []).sort((a, b) => b.length - a.length)[0];
    assert.ok(main && JSON.stringify(p.result).includes(main), p.slug);
  }
  // plates without a picture get a figure drawn from their numbers
  for (const p of content.featured) assert.ok(p.media.length > 0 || p.chart, p.slug);
});

test("the flyover route runs in timeline order with real coordinates", () => {
  assert.deepEqual(content.route.map((r) => r.id), ["chennai", "hyderabad", "ongole", "boston"]);
  const ongole = content.route.find((r) => r.id === "ongole")!;
  assert.ok(Math.abs(ongole.coords.lat - 15.5) < 0.1 && Math.abs(ongole.coords.lon - 80.05) < 0.1);
  const jc = content.experience.find((e) => e.company.startsWith("JC Biotech"))!;
  assert.deepEqual(jc.coords, ongole.coords);
  assert.equal(content.route[3].coords.lon < 0, true); // Boston is west of Greenwich
});

test("the house and the kitten are gone from the content", () => {
  assert.equal("tour" in content, false);
  assert.equal(/house cat|kitten says|sword/i.test(allText), false);
});

test("unfinished work stays off the plates, and the team Kambaz links are present", () => {
  const plates = content.featured.map((p) => p.slug);
  for (const w of content.inProgress) assert.ok(!plates.includes(w.name.toLowerCase()), w.name);
  const kambaz = content.coursework.find((c) => c.slug === "kambaz")!;
  assert.ok(kambaz.links.some((l) => l.href.endsWith("/kambaz-lms-web")));
  assert.ok(kambaz.links.some((l) => l.href.endsWith("/kambaz-lms-api")));
});
