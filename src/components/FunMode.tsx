"use client";
// Fun mode: the 3D flyover, told as a SLAM run. A drone flies the route and its lidar builds the
// map live; each stop is a landmark the system detects and locks onto, then that section's panel
// opens. This full-screen layer holds the canvas, the route rail, the corner inset map, the
// landmark reticle and panel, and a "Back to the plain site" button that is always visible and
// takes keyboard focus first. The scene itself lives in src/engine/flyover/.
//
// Slice 1: off the Coromandel coast to the first stop, SRM in Kattankulathur.
import { useEffect, useRef, useState } from "react";
import { education, route, srmProject, survey } from "@/content";
import type { Flyover, FrameState } from "@/engine/flyover/createFlyover";
import { stopTarget } from "@/lib/flyover";
import { placeLine } from "@/lib/geo";
import inset from "@/lib/inset-india.json";

type Stage = "loading" | "preparing" | "ready" | "failed";

const STOP = route[0];
const SCHOOL = education.find((e) => e.coords.lat === STOP.coords.lat)!;
const LAST = 1; // the last journey position built so far
const LABELS = [{ id: "bay", text: "Bay of Bengal", coords: { lat: 12.95, lon: 80.62 }, from: 0, to: 1 }];
const INDIA = route.filter((r) => r.country === "India");

/** Latitude and longitude to the inset's SVG box. */
const toInset = (c: { lat: number; lon: number }) => ({
  x: ((c.lon - inset.west) / (inset.east - inset.west)) * inset.width,
  y: ((inset.north - c.lat) / (inset.north - inset.south)) * inset.height,
});

export function FunMode({ onExit }: { onExit: () => void }) {
  const back = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const leader = useRef<HTMLSpanElement>(null);
  const reticle = useRef<HTMLDivElement>(null);
  const droneDot = useRef<SVGCircleElement>(null);
  const engine = useRef<Flyover | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [bytes, setBytes] = useState({ loaded: 0, total: 0 });
  const [arrived, setArrived] = useState(false);
  const [atStop, setAtStop] = useState(false);
  const [lockState, setLockState] = useState<"none" | "detected" | "locked">("none");

  // Esc closes; the page behind stops scrolling
  useEffect(() => {
    back.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onExit();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onExit]);

  // start the scene (three.js loads here, in its own chunk, only when fun mode opens)
  useEffect(() => {
    let disposed = false;
    let fly: Flyover | null = null;
    const labelEls = new Map<string, HTMLElement>();
    root.current?.querySelectorAll<HTMLElement>("[data-anchor]").forEach((el) => labelEls.set(el.dataset.anchor!, el));
    // the page's side margin, read from the sheet label so the panel lines up with it
    let gutter = 56;
    const measure = () => (gutter = root.current?.querySelector(".fun-sheet")?.getBoundingClientRect().left ?? 56);
    measure();
    window.addEventListener("resize", measure);
    const at = (el: HTMLElement, x: number, y: number) => (el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`);

    const onFrame = (s: FrameState) => {
      root.current?.style.setProperty("--journey", s.journey.toFixed(3));
      setAtStop(s.journey > 0.98);
      for (const a of s.anchors.slice(1)) {
        const el = labelEls.get(a.id);
        if (!el) continue;
        at(el, a.x, a.y);
        el.dataset.on = a.visible ? "yes" : "no";
      }
      // the reticle sits on the landmark and closes in as the lock completes
      const m = s.anchors[0];
      const r = reticle.current;
      if (r) {
        at(r, m.x, m.y);
        r.style.setProperty("--lock", s.lock.toFixed(3));
        r.dataset.on = m.visible ? "yes" : "no";
      }
      setLockState(s.lock >= 1 ? "locked" : s.detected ? "detected" : "none");

      // the panel is docked on the left, over the sea; a leader line runs from the landmark to it
      const p = panel.current;
      const lead = leader.current;
      if (p && lead) {
        const x = Math.min(gutter, m.x - 140 - p.offsetWidth);
        const y = Math.min(Math.max(m.y - 120, 130), window.innerHeight - p.offsetHeight - 240);
        at(p, x, y);
        const dx = x + p.offsetWidth - m.x, dy = y + 26 - m.y;
        lead.style.width = `${Math.hypot(dx, dy).toFixed(1)}px`;
        lead.style.transform = `translate3d(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px, 0) rotate(${Math.atan2(dy, dx)}rad)`;
      }

      const d = droneDot.current;
      if (d) {
        const q = toInset(s.drone);
        d.setAttribute("cx", q.x.toFixed(1));
        d.setAttribute("cy", q.y.toFixed(1));
      }
    };

    import("@/engine/flyover/createFlyover")
      .then(({ createFlyover }) =>
        createFlyover(canvas.current!, {
          landmark: STOP.coords,
          labels: LABELS,
          onBytes: (loaded, total) => setBytes({ loaded, total }),
          onStage: (s) => !disposed && setStage(s),
          onArrive: (a) => !disposed && setArrived(a),
          onFrame,
        }),
      )
      .then((f) => {
        if (disposed) return f.dispose();
        fly = engine.current = f;
      })
      .catch((err) => {
        console.error(err);
        if (!disposed) setStage("failed");
      });

    return () => {
      disposed = true;
      window.removeEventListener("resize", measure);
      fly?.dispose();
      engine.current = null;
    };
  }, []);

  // scroll, touch and keys drive the drone along the route
  useEffect(() => {
    const el = root.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      engine.current?.nudge(px * 0.00045);
    };
    let lastY: number | null = null;
    const onTouchStart = (e: TouchEvent) => (lastY = e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (lastY === null) return;
      const y = e.touches[0].clientY;
      engine.current?.nudge((lastY - y) * 0.0012);
      lastY = y;
    };
    const onKey = (e: KeyboardEvent) => {
      const f = engine.current;
      if (!f) return;
      const onButton = (e.target as HTMLElement).closest("button, a");
      if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !onButton)) f.flyTo(stopTarget(f.journey, 1, LAST));
      else if (e.key === "ArrowUp" || e.key === "PageUp") f.flyTo(stopTarget(f.journey, -1, LAST));
      else if (e.key === "Home") f.flyTo(0);
      else if (e.key === "End") f.flyTo(LAST);
      else return;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("keydown", onKey);
    };
  }, []);

  const f = survey.flight;
  const mb = (n: number) => (n / 1e6).toFixed(1);
  const share = bytes.total ? bytes.loaded / bytes.total : 0;
  const stop = toInset(STOP.coords);

  return (
    <div ref={root} className="fun" data-stage={stage} data-arrived={arrived || undefined} role="dialog" aria-modal="true" aria-labelledby="fun-title">
      <canvas ref={canvas} className="fun-canvas" aria-hidden="true" />

      <header className="fun-top">
        <p className="mono fun-sheet">
          <b>Sheet F</b> · {f.title}
        </p>
        <button ref={back} type="button" className="btn btn-primary fun-back" onClick={onExit}>
          {survey.backLabel}
        </button>
      </header>

      <div className="fun-title">
        <h2 id="fun-title">{f.title}</h2>
        <p>{f.subtitle}</p>
        <p className="mono fun-hint">{f.hint}</p>
      </div>

      <nav className="fun-rail" aria-label="Route">
        <ol>
          {route.map((r, i) => (
            <li key={r.id}>
              <button type="button" aria-current={i === 0 && atStop ? "step" : undefined} disabled={i > 0} onClick={() => engine.current?.flyTo(LAST)}>
                <span className="mono">0{i + 1}</span>
                <strong>{r.place}</strong>
                <span className="mono">
                  {r.region}, {r.country}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* map labels, positioned every frame by the scene */}
      <div className="fun-anchors" aria-hidden="true">
        {LABELS.map((l) => (
          <span key={l.id} data-anchor={l.id} className={`mono fun-label fun-label-${l.id}`}>
            {l.text}
          </span>
        ))}
      </div>

      {/* the landmark reticle: four corner brackets that close in when the system locks on */}
      <div ref={reticle} className="fun-reticle" data-state={lockState} aria-hidden="true">
        <span className="fun-reticle-box" />
        <span className="mono fun-reticle-label">
          <b>Landmark 01 · {lockState === "locked" ? "locked" : "detected"}</b>
          <span>{placeLine(STOP)}</span>
        </span>
      </div>

      <span ref={leader} className="fun-leader" data-on={arrived ? "yes" : "no"} aria-hidden="true" />
      <section ref={panel} className="fun-panel" data-on={arrived ? "yes" : "no"} aria-labelledby="fun-panel-title" aria-hidden={!arrived}>
        <p className="mono fun-panel-sheet">
          <b>Stop 01 / 04</b> <span>Education</span>
        </p>
        <h3 id="fun-panel-title">{SCHOOL.school}</h3>
        <p className="mono fun-panel-place">
          {placeLine(STOP)
            .split(" · ")
            .map((part) => (
              <span key={part}>{part}</span>
            ))}
        </p>
        <p>{SCHOOL.degree}</p>
        <dl>
          <div>
            <dt className="mono">GPA</dt>
            <dd>{SCHOOL.gpa}</dd>
          </div>
          <div>
            <dt className="mono">Finished</dt>
            <dd>{SCHOOL.dates}</dd>
          </div>
          <div>
            <dt className="mono">Campus</dt>
            <dd>{SCHOOL.campus}</dd>
          </div>
        </dl>
        {srmProject && (
          <div className="fun-panel-project">
            <h4>{srmProject.name}</h4>
            <p>{srmProject.highlight}</p>
          </div>
        )}
      </section>
      <p className="sr-only" aria-live="polite">
        {arrived ? `Stop 1 of 4, ${placeLine(STOP)}: ${SCHOOL.school}, ${SCHOOL.degree}, GPA ${SCHOOL.gpa}, finished ${SCHOOL.dates}.` : ""}
      </p>

      <footer className="fun-foot">
        {/* the corner inset: coastlines from the same NOAA data, the India stops, and the drone */}
        <figure className="fun-inset" aria-hidden="true">
          <svg viewBox={`0 0 ${inset.width} ${inset.height}`}>
            <path className="coast" d={inset.d} />
            <polyline className="leg" points={INDIA.map((r) => `${toInset(r.coords).x.toFixed(1)},${toInset(r.coords).y.toFixed(1)}`).join(" ")} />
            {INDIA.map((r) => {
              const q = toInset(r.coords);
              return <circle key={r.id} className={r.id === STOP.id && atStop ? "stop is-current" : "stop"} cx={q.x} cy={q.y} r={r.id === STOP.id ? 3.2 : 2.4} />;
            })}
            <circle ref={droneDot} className="drone" cx={stop.x} cy={stop.y} r={1.9} />
          </svg>
          <figcaption className="mono">
            <b>{f.inset}</b> · 01 / 04
          </figcaption>
        </figure>
        <p className="mono fun-credit">
          <span>{f.exaggeration}</span>
          <span>{f.credit}</span>
        </p>
        {atStop ? (
          <button type="button" className="btn btn-secondary" disabled>
            {f.nextLater}
          </button>
        ) : (
          <button type="button" className="btn btn-secondary fun-next" onClick={() => engine.current?.flyTo(LAST)}>
            {f.next} <span aria-hidden="true">↓</span>
          </button>
        )}
      </footer>

      {stage !== "ready" && (
        <div className="fun-loading" role="status">
          {stage === "failed" ? (
            <p>{f.failed}</p>
          ) : (
            <>
              <p className="mono">
                {stage === "loading" ? `${f.loading} · ${mb(bytes.loaded)}${bytes.total ? ` of ${mb(bytes.total)}` : ""} MB` : f.preparing}
              </p>
              <span className="fun-loading-line" style={{ "--share": stage === "loading" ? share : 1 } as React.CSSProperties} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
