"use client";

// Hosts the 3D house: a fixed canvas behind the page, plus the HTML drawn over it.
// The page's own sections (hero, experience, projects) are the scroll track for one continuous
// walk through the house. Every frame the renderer reports where each job and project panel's
// anchor sits on screen, and this component moves those articles there.
import { useEffect, useRef, useState } from "react";
import { featured, person, tour } from "@/content";
import type { FrameState, HouseRenderer } from "@/engine/createHouseRenderer";
import { allStops, chapterAt, JOURNEY_SECTIONS, journeyFromRects, linkStops, scrollForJourney } from "@/lib/journey";

export const MODE_EVENT = "tourmodechange";

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** What the kitten says at each stop. */
function lineFor(stop: string | null) {
  if (!stop || stop === "hero") return tour.lines.hero;
  if (stop.startsWith("exp-")) return tour.experienceLines[Number(stop.slice(4))] ?? tour.lines.experience;
  if (stop.startsWith("bay-")) return tour.projectLines[featured[Number(stop.slice(4))]?.slug] ?? tour.lines.projects;
  if (stop === "ledger") return tour.lines.otherWork;
  if (stop === "about") return tour.lines.about;
  if (stop === "contact") return tour.lines.contact;
  return tour.lines.hero;
}

export function HouseTour() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLParagraphElement>(null);
  const rendererRef = useRef<HouseRenderer | null>(null);
  const [ready, setReady] = useState(false);
  const [line, setLine] = useState(tour.lines.hero);
  const [announce, setAnnounce] = useState("");
  const swingCount = useRef(0);
  const lineTimer = useRef<number>(0);
  const stopRef = useRef<string | null>("hero");

  useEffect(() => {
    const html = document.documentElement;
    const canvas = canvasRef.current;
    const hit = hitRef.current;
    const bubble = bubbleRef.current;
    if (!canvas || !hit || !bubble) return;

    let r: HouseRenderer | null = null;
    let cancelled = false;
    const cleanups: (() => void)[] = [];

    const stop = () => {
      cancelled = true;
      cleanups.splice(0).forEach((f) => f());
      r?.dispose();
      r = rendererRef.current = null;
      setReady(false);
    };

    const start = async () => {
      if (html.dataset.mode !== "tour") return;
      cancelled = false;
      if (!webglAvailable()) {
        html.dataset.mode = "fast";
        return;
      }
      const family = getComputedStyle(html).getPropertyValue("--font-stix").trim() || "serif";
      try {
        await document.fonts.load(`400 100px ${family}`);
      } catch {
        // the word falls back to the default serif
      }
      const { createHouseRenderer } = await import("@/engine/createHouseRenderer");
      if (cancelled || html.dataset.mode !== "tour") return;
      // golden hour by default; dusk with the lamps lit in dark mode, or with ?light=dusk
      const q = new URLSearchParams(location.search);
      const dark = matchMedia("(prefers-color-scheme: dark)");
      const mode = (q.get("light") as "golden" | "dusk" | null) ?? (dark.matches ? "dusk" : "golden");
      const post = q.get("fx") === "off" ? { post: false } : undefined;
      try {
        const made = await createHouseRenderer(canvas, {
          word: person.shortName,
          fontFamily: family,
          bays: featured.map((p) => p.slug),
          mode,
          post,
          onReady: () => setReady(true),
        });
        // the build takes many frames; the visitor may have pressed Skip the tour meanwhile
        if (cancelled || html.dataset.mode !== "tour") {
          made.dispose();
          return;
        }
        r = made;
      } catch {
        html.dataset.mode = "fast";
        return;
      }
      rendererRef.current = r;
      const rr = r;
      rr.attachOverlay({ hit, bubble });

      const sections = JOURNEY_SECTIONS.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
      const panels = new Map<string, HTMLElement>();
      document.querySelectorAll<HTMLElement>("[data-anchor]").forEach((el) => panels.set(el.dataset.anchor!, el));

      const scrollToJ = (j: number, smooth = false) => {
        const tops = sections.map((s) => s.getBoundingClientRect().top + window.scrollY);
        const heights = sections.map((s) => s.offsetHeight);
        window.scrollTo({ top: scrollForJourney(j, tops, heights, window.innerHeight), behavior: smooth ? "smooth" : "instant" });
      };
      const navLinks = [...document.querySelectorAll<HTMLAnchorElement>(".topbar nav a")];

      // ---- in-page links land on the first panel of their section, not on empty scenery
      const onLinkClick = (e: MouseEvent) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
        const id = a?.getAttribute("href")?.slice(1) ?? "";
        if (!a || !(id in linkStops)) return;
        e.preventDefault();
        scrollToJ(linkStops[id]);
        history.replaceState(null, "", `#${id}`);
      };
      document.addEventListener("click", onLinkClick);

      // ---- when scrolling stops near a pause, settle onto it, so paging cannot skip a panel
      let settle = 0;
      let settling = false;
      const settleOnStop = () => {
        // a panel is already readable here: leave the reader where they are
        if ([...panels.values()].some((el) => el.dataset.active === "true")) return;
        const j = journeyFromRects(sections.map((s) => s.getBoundingClientRect()), window.innerHeight);
        const near = allStops.reduce((best, s) => (Math.abs(s - j) < Math.abs(best - j) ? s : best), allStops[0]);
        if (Math.abs(near - j) < 0.09 && Math.abs(near - j) > 0.004) {
          settling = true;
          scrollToJ(near, true);
          window.setTimeout(() => (settling = false), 700);
        }
      };

      let journeyNow = 0;
      // ---- scroll drives the walk
      const onScroll = () => {
        window.clearTimeout(settle);
        if (!settling) settle = window.setTimeout(settleOnStop, 220);
        const j = journeyFromRects(
          sections.map((s) => s.getBoundingClientRect()),
          window.innerHeight
        );
        r?.setJourney(j);
        journeyNow = j;
        html.dataset.scrolled = String(j > 0.1);
        html.dataset.pastHero = String(j >= JOURNEY_SECTIONS.length - 0.001);
        const chapter = chapterAt(j);
        html.dataset.chapter = chapter;
        for (const a of navLinks) {
          if (a.getAttribute("href") === `#${chapter}`) a.setAttribute("aria-current", "location");
          else a.removeAttribute("aria-current");
        }
        html.style.setProperty("--tour-p", Math.min(1, Math.max(0, j / JOURNEY_SECTIONS.length)).toFixed(3));
      };

      // ---- panels follow their anchors in the scene
      rr.onFrame((s: FrameState) => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        for (const a of s.anchors) {
          const el = panels.get(a.id);
          if (!el) continue;
          const pw = el.offsetWidth;
          const ph = el.offsetHeight;
          // jobs hang centred on their colonnade; a project docks beside its bay, so the exhibit,
          // its lamp and the kitten stay in view
          const beside = el.dataset.place === "left";
          const x = Math.min(Math.max(beside ? a.x - pw - 56 : a.x - pw / 2, 48), w - pw - 48);
          // keep clear of the top bar, and of the chapter title in Experience and Projects
          const top = el.closest("#experience, #projects") ? 150 : 84;
          const y = Math.min(Math.max(a.y - ph / 2, top), h - ph - 20);
          el.style.transform = `translate(${x.toFixed(1)}px, ${(y + (1 - a.a) * 18).toFixed(1)}px)`;
          el.style.opacity = a.a.toFixed(3);
          el.dataset.active = String(a.a > 0.5);
          // a panel taller than the screen reads top to bottom while you scroll through its stop
          const extra = el.scrollHeight - el.clientHeight;
          if (extra > 0 && a.a > 0.5 && !el.contains(document.activeElement)) {
            const stopJ = Number(el.dataset.j);
            const half = a.id.startsWith("exp-") ? 0.07 : el.closest("#projects") ? 0.06 : 0.2;
            const t = Math.min(1, Math.max(0, (journeyNow - (stopJ - half)) / (2 * half)));
            el.scrollTop = t * extra;
          }
        }
        // the kitten's bubble steps clear of whichever panel is showing
        const b = bubble.getBoundingClientRect();
        let dx = Number(bubble.dataset.dx ?? 0);
        const raw = { left: b.left - dx, right: b.right - dx, top: b.top, bottom: b.bottom };
        dx = 0;
        for (const el of panels.values()) {
          if (el.dataset.active !== "true") continue;
          const p = el.getBoundingClientRect();
          if (raw.left < p.right && raw.right > p.left && raw.top < p.bottom && raw.bottom > p.top) {
            dx = p.right + 14 - raw.left;
          }
        }
        if (dx !== Number(bubble.dataset.dx ?? 0)) {
          bubble.dataset.dx = String(dx);
          bubble.style.setProperty("--bdx", `${dx}px`);
        }
        if (s.stop !== stopRef.current) {
          stopRef.current = s.stop;
          setLine(lineFor(s.stop));
        }
      });

      // ---- a project panel lights its lamp; tabbing into a panel walks the camera to its stop
      const onEnter = (e: Event) => {
        const id = (e.currentTarget as HTMLElement).dataset.anchor;
        if (id) r?.setHighlight(id, true);
      };
      const onLeave = (e: Event) => {
        const el = e.currentTarget as HTMLElement;
        if (el.dataset.anchor && !el.contains(document.activeElement)) r?.setHighlight(el.dataset.anchor, false);
      };
      const onFocusIn = (e: FocusEvent) => {
        const el = e.currentTarget as HTMLElement;
        const j = Number(el.dataset.j);
        if (!Number.isFinite(j) || el.dataset.active === "true") return;
        const tops = sections.map((s) => s.getBoundingClientRect().top + window.scrollY);
        const heights = sections.map((s) => s.offsetHeight);
        window.scrollTo({ top: scrollForJourney(j, tops, heights, window.innerHeight) });
      };
      panels.forEach((el) => {
        el.addEventListener("pointerenter", onEnter);
        el.addEventListener("pointerleave", onLeave);
        el.addEventListener("focusin", onEnter);
        el.addEventListener("focusin", onFocusIn as EventListener);
        el.addEventListener("focusout", onLeave);
      });

      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        r?.setPointer((e.clientX / window.innerWidth) * 2 - 1, 1 - (e.clientY / window.innerHeight) * 2, true);
      };
      const onLeaveWindow = () => r?.setPointer(0, 0, false);
      const onResize = () => {
        r?.resize();
        onScroll();
      };
      const onScheme = (e: MediaQueryListEvent) => {
        if (!q.get("light")) r?.setLighting(e.matches ? "dusk" : "golden");
      };
      dark.addEventListener("change", onScheme);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeaveWindow);
      window.addEventListener("blur", onLeaveWindow);
      window.addEventListener("resize", onResize);
      onScroll();
      cleanups.push(() => {
        delete html.dataset.scrolled;
        delete html.dataset.pastHero;
        delete html.dataset.chapter;
        window.clearTimeout(settle);
        document.removeEventListener("click", onLinkClick);
        for (const a of navLinks) a.removeAttribute("aria-current");
        html.style.removeProperty("--tour-p");
        panels.forEach((el) => {
          el.removeEventListener("pointerenter", onEnter);
          el.removeEventListener("pointerleave", onLeave);
          el.removeEventListener("focusin", onEnter);
          el.removeEventListener("focusin", onFocusIn as EventListener);
          el.removeEventListener("focusout", onLeave);
          el.style.removeProperty("transform");
          el.style.removeProperty("opacity");
          delete el.dataset.active;
        });
        dark.removeEventListener("change", onScheme);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
        window.removeEventListener("blur", onLeaveWindow);
        window.removeEventListener("resize", onResize);
      });
    };

    const onMode = () => {
      stop();
      start();
    };
    window.addEventListener(MODE_EVENT, onMode);
    start();
    return () => {
      window.removeEventListener(MODE_EVENT, onMode);
      window.clearTimeout(lineTimer.current);
      stop();
    };
  }, []);

  const onKitten = () => {
    rendererRef.current?.swing();
    const lines = tour.lines.swing;
    const next = lines[swingCount.current++ % lines.length];
    setLine(next);
    setAnnounce(`The kitten swings its sword: ${next}`);
    window.clearTimeout(lineTimer.current);
    lineTimer.current = window.setTimeout(() => setLine(lineFor(stopRef.current)), 2200);
  };

  return (
    <div className="tour" data-ready={ready}>
      <canvas ref={canvasRef} className="tour-canvas" aria-hidden="true" />
      <button ref={hitRef} type="button" className="kitten-hit" aria-label={tour.kittenLabel} onClick={onKitten} />
      <p ref={bubbleRef} className="kitten-bubble" aria-hidden="true" data-visible="false">
        {line}
      </p>
      <p className="sr-only" role="status">
        {announce}
      </p>
    </div>
  );
}
