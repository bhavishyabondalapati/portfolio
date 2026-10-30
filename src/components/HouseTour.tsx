"use client";

// Hosts the 3D house: a fixed canvas behind the hero, plus two HTML pieces drawn over it
// (the kitten's click target and its speech bubble), which the renderer moves every frame.
import { useEffect, useRef, useState } from "react";
import { person, tour } from "@/content";
import type { HouseRenderer } from "@/engine/createHouseRenderer";

export const MODE_EVENT = "tourmodechange";

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
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

  useEffect(() => {
    const html = document.documentElement;
    const canvas = canvasRef.current;
    const hit = hitRef.current;
    const bubble = bubbleRef.current;
    const hero = document.getElementById("top");
    if (!canvas || !hit || !bubble || !hero) return;

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
        r = createHouseRenderer(canvas, { word: person.shortName, fontFamily: family, mode, post, onReady: () => setReady(true) });
      } catch {
        html.dataset.mode = "fast";
        return;
      }
      rendererRef.current = r;
      r.attachOverlay({ hit, bubble });

      const onScroll = () => {
        const rect = hero.getBoundingClientRect();
        const span = Math.max(1, rect.height - window.innerHeight);
        const p = -rect.top / span;
        r?.setProgress(p);
        // the hero card steps aside once the walk starts; the top bar returns after the hero
        html.dataset.scrolled = String(p > 0.1 && p < 1);
        html.dataset.pastHero = String(p >= 1);
        html.style.setProperty("--tour-p", Math.min(1, Math.max(0, p)).toFixed(3));
      };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        r?.setPointer((e.clientX / window.innerWidth) * 2 - 1, 1 - (e.clientY / window.innerHeight) * 2, true);
      };
      const onLeave = () => r?.setPointer(0, 0, false);
      const onResize = () => {
        r?.resize();
        onScroll();
      };
      const onScheme = (e: MediaQueryListEvent) => {
        if (!q.get("light")) r?.setLighting(e.matches ? "dusk" : "golden");
      };
      dark.addEventListener("change", onScheme);
      const io = new IntersectionObserver(([entry]) => r?.setRunning(entry.isIntersecting));
      io.observe(hero);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      window.addEventListener("blur", onLeave);
      window.addEventListener("resize", onResize);
      onScroll();
      cleanups.push(() => {
        delete html.dataset.scrolled;
        delete html.dataset.pastHero;
        html.style.removeProperty("--tour-p");
        dark.removeEventListener("change", onScheme);
        io.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("blur", onLeave);
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
    lineTimer.current = window.setTimeout(() => setLine(tour.lines.hero), 2200);
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
