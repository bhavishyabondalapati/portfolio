"use client";
// Fun mode: the 3D flyover. A full-screen layer over the plain site with the canvas, the route rail,
// the panel pinned to each stop's marker, and a "Back to the plain site" button that is always
// visible and takes keyboard focus first. The scene itself lives in src/engine/flyover/.
//
// Slice 1: the opening over the Bay of Bengal and the first stop, SRM in Kattankulathur.
import { useEffect, useRef, useState } from "react";
import { education, route, srmProject, survey } from "@/content";
import type { Anchor, Flyover } from "@/engine/flyover/createFlyover";
import { stopTarget } from "@/lib/flyover";
import { formatCoords } from "@/lib/geo";

type Stage = "loading" | "preparing" | "ready" | "failed";

const STOP = route[0];
const SCHOOL = education.find((e) => e.coords.lat === STOP.coords.lat)!;
const LAST = 1; // the last journey position built so far
const LABELS = [
  { id: "bay", text: "Bay of Bengal", coords: { lat: 12.75, lon: 80.9 }, from: 0, to: 0.62 },
  { id: "chennai", text: "Chennai", coords: { lat: 13.0827, lon: 80.2707 }, from: 0.2, to: 1 },
];

export function FunMode({ onExit }: { onExit: () => void }) {
  const back = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const leader = useRef<HTMLSpanElement>(null);
  const engine = useRef<Flyover | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [bytes, setBytes] = useState({ loaded: 0, total: 0 });
  const [arrived, setArrived] = useState(false);
  const [atStop, setAtStop] = useState(false);

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

  // start the scene (three.js loads here, in this chunk, only when fun mode opens)
  useEffect(() => {
    let disposed = false;
    let fly: Flyover | null = null;
    const labelEls = new Map<string, HTMLElement>();
    root.current?.querySelectorAll<HTMLElement>("[data-anchor]").forEach((el) => labelEls.set(el.dataset.anchor!, el));

    const place = (a: Anchor) => {
      const el = labelEls.get(a.id);
      if (!el) return;
      el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
      el.dataset.on = a.visible ? "yes" : "no";
    };

    import("@/engine/flyover/createFlyover")
      .then(({ createFlyover }) =>
        createFlyover(canvas.current!, {
          marker: STOP.coords,
          labels: LABELS,
          onBytes: (loaded, total) => setBytes({ loaded, total }),
          onStage: (s) => !disposed && setStage(s),
          onArrive: (a) => !disposed && setArrived(a),
          onFrame: (journey, anchors) => {
            root.current?.style.setProperty("--journey", journey.toFixed(3));
            setAtStop(journey > 0.98);
            for (const a of anchors) place(a);
            // the panel is docked on the right; a leader line runs from the pin to it, like a map callout
            const m = anchors[0];
            const p = panel.current;
            const lead = leader.current;
            if (p && lead) {
              const x = Math.max(m.x + 120, window.innerWidth * 0.6);
              const y = Math.min(Math.max(m.y - 60, 120), window.innerHeight - p.offsetHeight - 110);
              p.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
              const dx = x - m.x, dy = y + 26 - m.y;
              lead.style.width = `${Math.hypot(dx, dy).toFixed(1)}px`;
              lead.style.transform = `translate3d(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px, 0) rotate(${Math.atan2(dy, dx)}rad)`;
            }
          },
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
      fly?.dispose();
      engine.current = null;
    };
  }, []);

  // scroll, touch and keys drive the camera along the route
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
              <button
                type="button"
                aria-current={i === 0 && atStop ? "step" : undefined}
                disabled={i > 0}
                onClick={() => engine.current?.flyTo(LAST)}
              >
                <span className="mono">0{i + 1}</span>
                <strong>{r.place}</strong>
                <span className="mono">{formatCoords(r.coords, 2)}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* map labels and the marker label, positioned every frame by the scene */}
      <div className="fun-anchors" aria-hidden="true">
        {LABELS.map((l) => (
          <span key={l.id} data-anchor={l.id} className={`mono fun-label fun-label-${l.id}`}>
            {l.text}
          </span>
        ))}
        <span data-anchor="marker" className="mono fun-label fun-label-marker">
          <b>01</b> {SCHOOL.campus}
        </span>
      </div>

      <span ref={leader} className="fun-leader" data-on={arrived ? "yes" : "no"} aria-hidden="true" />
      <section ref={panel} className="fun-panel" data-on={arrived ? "yes" : "no"} aria-labelledby="fun-panel-title" aria-hidden={!arrived}>
        <p className="mono fun-panel-sheet">
          <b>Stop 01 / 04</b> <span>Education</span>
        </p>
        <h3 id="fun-panel-title">{SCHOOL.school}</h3>
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
            <dd>
              {SCHOOL.campus}, {SCHOOL.place.split(",")[0]}
            </dd>
          </div>
        </dl>
        {srmProject && (
          <div className="fun-panel-project">
            <h4>{srmProject.name}</h4>
            <p>{srmProject.highlight}</p>
          </div>
        )}
        <p className="mono fun-panel-coords">{formatCoords(SCHOOL.coords)}</p>
      </section>
      <p className="sr-only" aria-live="polite">
        {arrived ? `Stop 1 of 4: ${SCHOOL.school}, ${SCHOOL.degree}, GPA ${SCHOOL.gpa}, finished ${SCHOOL.dates}.` : ""}
      </p>

      <footer className="fun-foot">
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
