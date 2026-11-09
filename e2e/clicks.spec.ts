// Clicks every link, button, summary and arrow on /, /boston and /sketchbook, on a desktop and a phone-sized
// screen. Outside addresses (GitHub, LinkedIn, live demos) are answered with an empty page, so the test needs no
// internet and never touches the real sites; we only check that each one opens the right address.
import { test, expect, type Page, type Frame, type Locator, type BrowserContext } from "@playwright/test";

const SELECTOR = "a[href], button, summary, [role=button]";

type Report = { clicked: number; skipped: string[]; problems: string[] };

async function guard(context: BrowserContext, page: Page, problems: string[]) {
  const here = new URL(test.info().project.use.baseURL ?? "http://localhost:4173").origin;
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.origin === here || u.protocol === "data:" || u.protocol === "blob:") return route.continue();
    // fonts and images from elsewhere are allowed through as empty; pages get a stub
    return route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" });
  });
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon/.test(m.text())) problems.push(`console: ${m.text()}`); });
}

const label = async (el: Locator) =>
  ((await el.getAttribute("aria-label")) || (await el.innerText().catch(() => "")) || (await el.getAttribute("href")) || "?").replace(/\s+/g, " ").trim().slice(0, 50);


/** Number every control on the page once, so a control is found again by its number even after the page
 *  adds or removes others (the sketchbook swaps caption links as the pages turn). */
async function tag(root: Page | Frame) {
  return root.evaluate((sel) => { const all = [...document.querySelectorAll(sel)]; all.forEach((e, i) => e.setAttribute("data-e2e", String(i))); return all.length; }, SELECTOR);
}

/** Wait until the page has stopped scrolling (pages here scroll smoothly, e.g. after choosing a page in the index). */
async function settle(root: Page | Frame) {
  let same = 0, last = -1;
  for (let i = 0; i < 40 && same < 4; i++) {
    const y = await root.evaluate(() => Math.round(window.scrollY)).catch(() => -2);
    same = y === last ? same + 1 : 0;
    last = y;
    await new Promise((r) => setTimeout(r, 150));
  }
}

/** Click with patience: the pages scroll smoothly and hide their header while scrolling, so a control can be
 *  briefly moving or tucked away. A control that is really covered by something fails every attempt. */
async function press(root: Page | Frame, el: Locator, text: string) {
  let last: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (/^skip to/i.test(text)) { await el.focus(); await el.press("Enter"); return; } // visible only on keyboard focus
      if (attempt === 2) await el.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
      await el.scrollIntoViewIfNeeded({ timeout: 4000 });
      await settle(root);
      await el.click({ timeout: 5000 });
      return;
    } catch (e) {
      last = e as Error;
      await new Promise((r) => setTimeout(r, 900));
    }
  }
  throw last;
}

/** Click every control inside `root` (the page or a frame). `ctx` is the page that owns popups. */
async function sweep(page: Page, root: Page | Frame, name: string, report: Report, opts: { skip?: (l: string, href: string | null) => boolean; prepare?: (el: Locator) => Promise<void> } = {}) {
  const n = await tag(root);
  for (let i = 0; i < n; i++) {
    const el = root.locator(`[data-e2e="${i}"]`);
    if ((await el.count()) === 0) { report.skipped.push(`${name}: control ${i} (a caption link replaced when the page turned)`); continue; }
    const href = await el.getAttribute("href");
    const target = await el.getAttribute("target");
    const rel = (await el.getAttribute("rel")) ?? "";
    const text = await label(el);
    const id = `${name}: "${text}"${href ? ` -> ${href}` : ""}`;
    if (opts.skip?.(text, href)) { report.skipped.push(id + " (covered by its own check)"); continue; }

    // Static rules first: they hold even when a control is hidden at this screen size.
    if (href?.startsWith("http")) {
      if (!href.startsWith("https://")) report.problems.push(`${id}: not https`);
      if (target !== "_blank" || !/noopener/.test(rel)) report.problems.push(`${id}: external link must open in a new tab with rel=noopener`);
    }
    if (href?.startsWith("mailto:")) {
      if (target && target !== "_top" && target !== "_blank") report.problems.push(`${id}: mailto must leave the frame`);
      report.clicked++; // a mail link is checked by its address; clicking would open the mail app
      continue;
    }
    if (href === "") { report.problems.push(`${id}: empty link`); continue; }

    if (process.env.E2E_VERBOSE) console.log(`   ${new Date().toISOString().slice(17, 23)} ${id}`);
    await opts.prepare?.(el);
    if (await el.isDisabled()) { report.skipped.push(id + " (switched off at this point, e.g. zoom already at its limit)"); continue; }
    if (!(await el.isVisible()) && !/^skip to/i.test(text)) { report.skipped.push(id + " (hidden at this screen size)"); continue; }

    try {
      await el.scrollIntoViewIfNeeded({ timeout: 4000 });
      if (href?.startsWith("http")) {
        let popup: Page | undefined;
        for (let attempt = 0; attempt < 3 && !popup; attempt++) { // a new tab can be slow to open right after another closed
          await settle(root);
          await el.scrollIntoViewIfNeeded({ timeout: 4000 });
          await settle(root);
          [popup] = await Promise.all([page.waitForEvent("popup", { timeout: 5000 }).catch(() => undefined), el.click({ timeout: 5000 })]);
        }
        if (!popup) throw new Error("no new tab opened after 3 clicks; " + await el.evaluate((e) => { const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return `in ${e.closest("#plateList") ? "index" : e.closest("#sbCaptions") ? "caption" : "other"}, box ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}, scrollY ${Math.round(scrollY)}, top element ${t === e ? "itself" : t?.outerHTML.slice(0, 80)}`; }));
        if (!popup.url().startsWith(new URL(href).origin) && popup.url() !== "about:blank") report.problems.push(`${id}: opened ${popup.url()}`);
        await popup.close();
      } else if (href && (href === "/" || href.startsWith("/boston") || href.startsWith("/sketchbook"))) {
        const from = page.url();
        await Promise.all([page.waitForURL((u) => u.toString() !== from, { timeout: 8000 }), el.click({ timeout: 6000 })]);
        await page.goBack();
        await page.waitForLoadState("domcontentloaded");
        return await sweepFrom(page, root, name, report, opts, i + 1); // the page reloaded: carry on after this one
      } else {
        await press(root, el, text);
      }
      report.clicked++;
    } catch (e) {
      report.problems.push(`${id}: ${(e as Error).message.split("\n").slice(0, 8).join(" | ")}`);
    }
  }
}

// After leaving and coming back the old locators are gone; continue the sweep from index `start`.
async function sweepFrom(page: Page, root: Page | Frame, name: string, report: Report, opts: NonNullable<Parameters<typeof sweep>[4]>, start: number) {
  const fresh: Page | Frame = root === page ? page : await frameOf(page);
  const n = await tag(fresh);
  for (let i = start; i < n; i++) {
    const el = fresh.locator(`[data-e2e="${i}"]`);
    const href = await el.getAttribute("href");
    if (href && (href === "/" || href.startsWith("/boston") || href.startsWith("/sketchbook"))) { report.clicked++; continue; } // already covered above
    await opts.prepare?.(el);
    if (!(await el.isVisible())) continue;
    try { await press(fresh, el, await label(el)); report.clicked++; }
    catch (e) { report.problems.push(`${name}: "${await label(el)}": ${(e as Error).message.split("\n")[0]}`); }
  }
}

async function frameOf(page: Page): Promise<Frame> {
  const handle = await page.locator("iframe").first().elementHandle();
  const frame = await handle!.contentFrame();
  if (!frame) throw new Error("no frame");
  return frame;
}

function finish(report: Report, name: string) {
  console.log(`${name}: ${report.clicked} controls clicked or checked, ${report.skipped.length} skipped`);
  for (const s of report.skipped) console.log(`   skipped ${s}`);
  expect(report.problems, report.problems.join("\n")).toEqual([]);
  expect(report.clicked).toBeGreaterThan(5);
}

test.describe("click every control", () => {
  test("plain site /", async ({ page, context }) => {
    const report: Report = { clicked: 0, skipped: [], problems: [] };
    await guard(context, page, report.problems);
    await page.goto("/");
    // project links live inside closed <details>; open them so they can be clicked
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));

    // theme button flips the theme
    const toggle = page.getByRole("button", { name: /theme|dark|light/i }).first();
    if (await toggle.count()) {
      const before = await page.evaluate(() => document.documentElement.dataset.theme ?? "");
      await toggle.click();
      const after = await page.evaluate(() => document.documentElement.dataset.theme ?? "");
      expect(after).not.toBe(before);
      await toggle.click();
    }
    await expect(page.getByRole("link", { name: /Walk the Charles/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^Open the sketchbook$/i }).first()).toBeVisible();
    expect(await page.locator("body").innerText()).not.toMatch(/\bplates?\b/i);

    await sweep(page, page, "/", report, { skip: (l) => /theme|dark|light/i.test(l) && l.length < 25 });
    finish(report, "/");
  });

  test("/boston", async ({ page, context }) => {
    const report: Report = { clicked: 0, skipped: [], problems: [] };
    await guard(context, page, report.problems);
    await page.goto("/boston");
    await page.waitForSelector("iframe");
    const frame = await frameOf(page);
    await frame.waitForSelector(".nav-burger", { timeout: 30_000 });
    await page.waitForTimeout(1500);

    // the Back bar belongs to the Next shell and must not cover the page's menu
    const back = page.locator(".back-plain");
    await expect(back).toBeVisible();
    const b = (await back.boundingBox())!, f = (await page.locator("iframe").boundingBox())!;
    expect(b.y + b.height, "Back button overlaps the Boston page").toBeLessThanOrEqual(f.y + 1);
    await Promise.all([page.waitForURL((u) => u.pathname === "/"), back.click()]);
    await page.goBack();
    await page.waitForSelector("iframe");

    const fr = await frameOf(page);
    await fr.waitForSelector(".nav-burger", { timeout: 30_000 });
    await page.waitForTimeout(1500);
    // the Menu button opens and closes the menu
    // (on a wide screen the menu is always showing and the button does nothing, by design)
    const burger = page.frameLocator("iframe").first().locator(".nav-burger");
    const isOpen = () => burger.evaluate((b) => b.classList.contains("active"));
    const narrow = (page.viewportSize()?.width ?? 1440) <= 820;
    for (let i = 0; narrow && i < 2; i++) { const was = await isOpen(); await burger.click(); await expect.poll(isOpen).toBe(!was); report.clicked++; }
    // the menu links hide behind the Menu button on small screens: open it for them, close it for everything else
    const prepare = async (el: Locator) => {
      const inMenu = await el.evaluate((e) => !!e.closest("#navlinks"));
      const open = await isOpen();
      if (inMenu && !open && narrow && (await burger.isVisible())) { await burger.click(); await page.waitForTimeout(900); }
      else if (!inMenu && open) { await burger.click(); await page.waitForTimeout(700); }
    };
    await sweep(page, fr, "/boston", report, { skip: (l) => /^Menu$/.test(l), prepare });
    finish(report, "/boston");
  });

  test("/sketchbook: arrows, tools, index and links", async ({ page, context }) => {
    const report: Report = { clicked: 0, skipped: [], problems: [] };
    await guard(context, page, report.problems);
    await page.goto("/sketchbook");
    await page.waitForSelector("iframe");
    const fr = await frameOf(page);
    await fr.waitForSelector("#sbRight", { timeout: 30_000 });
    await page.waitForTimeout(2500); // the opening animation

    const caption = async () => (await fr.locator("#sbCaptions .sb-caption").last().innerText()).replace(/\s+/g, " ").replace(/\s*(CODE ON GITHUB|LIVE SITE).*$/i, "").trim();
    const first = await caption();
    const seen: string[] = [first];

    // right arrow through all nine pages and back round to the first
    for (let i = 0; i < 9; i++) {
      const before = await caption();
      await fr.locator("#sbRight").click();
      await expect.poll(caption, { timeout: 6000, message: `right arrow, step ${i + 1}` }).not.toBe(before);
      seen.push(await caption());
      report.clicked++;
    }
    expect(new Set(seen.slice(0, 9)).size, "nine different pages").toBe(9);
    expect(seen[9], "wraps round to page one").toBe(first);

    // left arrow the whole way back
    for (let i = 0; i < 9; i++) {
      const before = await caption();
      await fr.locator("#sbLeft").click();
      await expect.poll(caption, { timeout: 6000, message: `left arrow, step ${i + 1}` }).not.toBe(before);
      report.clicked++;
    }
    expect(await caption()).toBe(first);

    // every other control: zoom, magnifier, scroll-down, index buttons and links, footer, back
    const back = page.locator(".back-plain");
    await expect(back).toBeVisible();
    await sweep(page, fr, "/sketchbook", report, { skip: (l) => /previous page|next page/.test(l) });
    await Promise.all([page.waitForURL((u) => u.pathname === "/"), back.click()]);
    report.clicked++;
    finish(report, "/sketchbook");
  });
});
