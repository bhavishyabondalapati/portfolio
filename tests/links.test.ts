// Static link checks for the plain site's content and the two hosted pages (Boston and the sketchbook), plus
// the rule that visitors never see the word "plate". The browser click test (every link, button and arrow on
// /, /boston and /sketchbook) is described in NOTES.md and run before each release.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import * as content from "../src/content.ts";

const read = (p: string) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

function hrefs(html: string) {
  const body = html.slice(html.indexOf("<body"));
  return [...body.matchAll(/<a\b([^>]*)>/g)].map((m) => {
    const a = m[1];
    return { href: /href="([^"]*)"/.exec(a)?.[1] ?? "", target: /target="([^"]*)"/.exec(a)?.[1], rel: /rel="([^"]*)"/.exec(a)?.[1] ?? "" };
  });
}
const ids = (html: string) => new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const visibleText = (html: string) =>
  html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, " ") + " " + [...html.matchAll(/(?:aria-label|alt|title|content)="([^"]*)"/g)].map((m) => m[1]).join(" ");

for (const [name, file] of [["Boston", "public/house/house.html"], ["sketchbook", "public/sketchbook/sketchbook.html"]] as const) {
  test(`${name} page: every link goes somewhere real`, () => {
    const html = read(file), known = ids(html);
    const links = hrefs(html);
    assert.ok(links.length > 5);
    for (const l of links) {
      assert.ok(l.href !== "" && l.href !== "#" || /class="(name|icon-btn)"/.test(html), `${name}: empty link`);
      if (l.href.startsWith("#") && l.href.length > 1) assert.ok(known.has(l.href.slice(1)), `${name}: missing anchor ${l.href}`);
      else if (l.href.startsWith("http")) {
        assert.ok(l.href.startsWith("https://"), l.href);
        assert.equal(l.target, "_blank", `${name}: ${l.href} must open outside the frame`);
        assert.ok(/noopener/.test(l.rel), `${name}: ${l.href} needs rel=noopener`);
      } else if (l.href.startsWith("mailto:")) assert.equal(l.target, "_top", `${name}: mailto must leave the frame`);
      else if (l.href === "/") assert.equal(l.target, "_top", `${name}: back link must leave the frame`);
    }
  });

  test(`${name} page: no external link is dead-ended into the frame, and the word "plate" never shows`, () => {
    assert.equal(/plate/i.test(visibleText(read(file))), false);
  });
}

test("sketchbook plates link to real repositories, and the live link is https", () => {
  const html = read("public/sketchbook/sketchbook.html");
  const pages = JSON.parse(/const PAGES=(\[[\s\S]*?\]);\nPAGES\.forEach/.exec(html)![1]) as { file: string; href: string; live?: string; result: string }[];
  assert.equal(pages.length, 9);
  for (const p of pages) {
    assert.ok(/^https:\/\/github\.com\/bhavishyabondalapati\/[\w.-]+$/.test(p.href), p.href);
    if (p.live) assert.ok(p.live.startsWith("https://"));
    assert.ok(existsSync(new URL("../public/sketchbook/pages/" + p.file, import.meta.url)), p.file);
  }
});

test("plain site content: every link is https, and no visible text says plate", () => {
  const strings: string[] = [];
  const walk = (v: unknown, key = "") => {
    if (typeof v === "string") { if (key !== "slug") strings.push(v); }
    else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk({ ...content });
  for (const s of strings) assert.equal(/plate/i.test(s), false, s.slice(0, 60));
  const urls = strings.filter((s) => /^https?:/.test(s));
  assert.ok(urls.length > 20);
  for (const u of urls) assert.ok(u.startsWith("https://"), u);
});

test("the plain site links to both pages, and both routes exist", () => {
  const survey = read("src/components/Survey.tsx");
  assert.ok(survey.includes('href="/boston"') && survey.includes('href="/sketchbook"'));
  assert.ok(existsSync(new URL("../src/app/boston/page.tsx", import.meta.url)));
  assert.ok(existsSync(new URL("../src/app/sketchbook/page.tsx", import.meta.url)));
});
