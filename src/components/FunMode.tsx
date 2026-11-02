"use client";
// Fun mode: the 3D flyover, told as a SLAM run. A drone flies the route in the order it happened
// and its lidar builds the map live; each stop is a landmark the system detects and locks onto,
// then that section's panel opens. Arriving in Boston closes the loop. This full-screen layer
// holds the canvas, the route rail, the corner inset map, the landmark reticle and panel, and a
// "Back to the plain site" button that is always visible and takes keyboard focus first.
// The scene itself lives in src/engine/flyover/.
import { useEffect, useRef, useState } from "react";
import { contact, coursework, earlierWork, education, experience, featured, route, srmProject, survey } from "@/content";
import type { Flyover, FrameState } from "@/engine/flyover/createFlyover";
import { LAST, STOPS } from "@/engine/flyover/route";
import { alongGreatCircle, stopTarget } from "@/lib/flyover";
import { placeLine } from "@/lib/geo";
import insetIndia from "@/lib/inset-india.json";
import insetWorld from "@/lib/inset-world.json";

type Stage = "loading" | "preparing" | "ready" | "failed";
type Inset = typeof insetIndia;

const LABELS = [
  { id: "bay", text: "Bay of Bengal", coords: { lat: 12.95, lon: 80.62 }, leg: "india" as const, from: 0, to: 1 },
  { id: "deccan", text: "Deccan Plateau", coords: { lat: 16.2, lon: 78.4 }, leg: "india" as const, from: 1.4, to: 2.1 },
  { id: "mass-bay", text: "Massachusetts Bay", coords: { lat: 42.36, lon: -70.72 }, leg: "boston" as const, from: 3.75, to: 4 },
];

const SCHOOL = (lat: number) => education.find((e) => e.coords.lat === lat)!;
const JOB = (lat: number) => experience.find((e) => e.coords.lat === lat)!;
/** Each stop's name in the reticle, and the line under it. */
const reticleText = (k: number): [string, string] => {
  if (k >= 1 && k <= 4) return [`Landmark 0${k}`, placeLine(route[k - 1])];
  if (k >= 5 && k <= 9) return [`Waypoint 2.${k - 4}`, featured[k - 5].name];
  return ["", ""];
};
/** The station on the rail (0 to 3) for a journey position. */
const station = (j: number) => (j < 1.5 ? 0 : j < 2.5 ? 1 : j < 3.5 ? 2 : 3);

const toInset = (box: Inset, c: { lat: number; lon: number }) => ({
  x: ((c.lon - box.west) / (box.east - box.west)) * box.width,
  y: ((box.north - c.lat) / (box.north - box.south)) * box.height,
});
const ARC = Array.from({ length: 41 }, (_, i) => alongGreatCircle(route[2].coords, route[3].coords, i / 40));

export function FunMode({ onExit }: { onExit: () => void }) {
  const back = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const leader = useRef<HTMLSpanElement>(null);
  const reticle = useRef<HTMLDivElement>(null);
  const droneDot = useRef<SVGCircleElement>(null);
  const km = useRef<HTMLSpanElement>(null);
  const engine = useRef<Flyover | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [bytes, setBytes] = useState({ loaded: 0, total: 0 });
  const [open, setOpen] = useState(0); // the stop whose panel is open, or 0
  const [shown, setShown] = useState(1); // the stop whose content the panel holds (kept while it fades out)
  const [rail, setRail] = useState(0);
  const [phase, setPhase] = useState<FrameState["phase"]>("india");
  const [near, setNear] = useState(0);
  const [lockState, setLockState] = useState<"none" | "detected" | "locked" | "closed">("none");
  const [atEnd, setAtEnd] = useState(false);

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
      const r = root.current;
      if (!r) return;
      r.style.setProperty("--journey", Math.min(s.journey, 1).toFixed(3));
      r.style.setProperty("--veil", s.veil.toFixed(3));
      setRail(station(s.journey));
      setPhase(s.phase);
      setNear(s.stop);
      setAtEnd(s.journey > LAST - 0.02);
      setLockState(s.stop === 4 && s.closure >= 1 ? "closed" : s.lock >= 1 ? "locked" : s.detected ? "detected" : "none");
      if (km.current) km.current.textContent = Math.round(s.transitKm).toLocaleString("en-US");

      for (const a of s.anchors.slice(1)) {
        const el = labelEls.get(a.id);
        if (!el) continue;
        at(el, a.x, a.y);
        el.dataset.on = a.visible ? "yes" : "no";
      }
      // the reticle sits on the landmark and closes in as the lock completes
      const m = s.anchors[0];
      const ret = reticle.current;
      if (ret) {
        at(ret, m.x, m.y);
        ret.style.setProperty("--lock", s.lock.toFixed(3));
        ret.dataset.on = m.visible ? "yes" : "no";
      }

      // the panel docks on the side the stop's framing leaves free; a leader line runs to it
      const p = panel.current;
      const lead = leader.current;
      const side = STOPS[s.stop]?.panel ?? p?.dataset.side ?? "right";
      if (p && lead) {
        p.dataset.side = side;
        const w = p.offsetWidth, h = p.offsetHeight;
        const x = side === "left" ? Math.min(gutter, m.x - 140 - w) : Math.max(m.x + 140, window.innerWidth - gutter - w);
        const y = m.visible ? Math.min(Math.max(m.y - 120, 130), window.innerHeight - h - 230) : Math.max((window.innerHeight - h) / 2 - 40, 130);
        at(p, x, y);
        const ex = side === "left" ? x + w : x;
        const dx = ex - m.x, dy = y + 26 - m.y;
        lead.style.width = `${Math.hypot(dx, dy).toFixed(1)}px`;
        lead.style.transform = `translate3d(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px, 0) rotate(${Math.atan2(dy, dx)}rad)`;
        lead.dataset.show = m.visible ? "yes" : "no";
      }

      const d = droneDot.current;
      if (d) {
        const q = toInset(s.phase === "india" ? insetIndia : insetWorld, s.drone);
        d.setAttribute("cx", q.x.toFixed(1));
        d.setAttribute("cy", q.y.toFixed(1));
      }
    };

    import("@/engine/flyover/createFlyover")
      .then(({ createFlyover }) =>
        createFlyover(canvas.current!, {
          labels: LABELS,
          onBytes: (loaded, total) => setBytes({ loaded, total }),
          onStage: (s) => !disposed && setStage(s),
          onArrive: (k) => {
            if (disposed) return;
            setOpen(k);
            if (k) setShown(k);
          },
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
      if ((e.target as HTMLElement).closest(".fun-panel")) return; // let a long panel scroll
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
  const inset = phase === "india" ? insetIndia : insetWorld;
  const insetStops = phase === "india" ? route.slice(0, 3) : [route[2], route[3]];
  const [retTitle, retLine] = reticleText(near);
  const retState = lockState === "closed" ? "loop closed · map aligned" : lockState === "locked" ? "locked" : "detected";

  return (
    <div ref={root} className="fun" data-stage={stage} data-phase={phase} data-arrived={open || undefined} role="dialog" aria-modal="true" aria-labelledby="fun-title">
      <canvas ref={canvas} className="fun-canvas" aria-hidden="true" />
      <div className="fun-veil" aria-hidden="true" />

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
              <button type="button" aria-current={i === rail ? "step" : undefined} onClick={() => engine.current?.flyTo(i + 1)}>
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
          <b>
            {retTitle} · {retState}
          </b>
          <span>{retLine}</span>
        </span>
      </div>

      {/* on the way to Boston: how far along the great circle */}
      <p className="mono fun-transit" aria-hidden={phase !== "transit"}>
        <b>Great circle</b> · Ongole to Boston · <span ref={km}>0</span> of 12,937 km
      </p>

      <span ref={leader} className="fun-leader" data-on={open ? "yes" : "no"} aria-hidden="true" />
      <section
        ref={panel}
        className="fun-panel"
        data-on={open ? "yes" : "no"}
        aria-labelledby="fun-panel-title"
        aria-hidden={!open}
        inert={!open}
      >
        <StopPanel k={shown} onExit={onExit} />
      </section>
      <p className="sr-only" aria-live="polite">
        {open ? panelSummary(open) : ""}
      </p>

      <footer className="fun-foot">
        {/* the corner inset: coastlines from the same NOAA data, the stops, and the drone */}
        <figure className="fun-inset" aria-hidden="true">
          <svg viewBox={`0 0 ${inset.width} ${inset.height}`}>
            <path className="coast" d={inset.d} />
            {phase === "india" ? (
              <polyline className="leg" points={insetStops.map((r) => `${toInset(inset, r.coords).x.toFixed(1)},${toInset(inset, r.coords).y.toFixed(1)}`).join(" ")} />
            ) : (
              <polyline className="leg" points={ARC.map((c) => `${toInset(inset, c).x.toFixed(1)},${toInset(inset, c).y.toFixed(1)}`).join(" ")} />
            )}
            {insetStops.map((r) => {
              const q = toInset(inset, r.coords);
              const current = route.indexOf(r) === rail;
              return <circle key={r.id} className={current ? "stop is-current" : "stop"} cx={q.x} cy={q.y} r={current ? 3.2 : 2.4} />;
            })}
            <circle ref={droneDot} className="drone" cx={0} cy={0} r={1.9} />
          </svg>
          <figcaption className="mono">
            <b>{phase === "india" ? f.inset : f.insetWorld}</b> · 0{rail + 1} / 04
          </figcaption>
        </figure>
        <p className="mono fun-credit">
          <span>{f.exaggeration}</span>
          <span>{f.credit}</span>
        </p>
        {!atEnd && (
          <button type="button" className="btn btn-secondary fun-next" onClick={() => engine.current?.flyTo(stopTarget(engine.current.journey, 1, LAST))}>
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

/** One sentence for screen readers when a panel opens. */
function panelSummary(k: number) {
  if (k === 1 || k === 4) {
    const s = SCHOOL(route[k - 1].coords.lat);
    return `Stop ${k} of 4, ${placeLine(route[k - 1])}: ${s.school}, ${s.degree}, GPA ${s.gpa}, ${s.dates}.`;
  }
  if (k === 2 || k === 3) {
    const e = JOB(route[k - 1].coords.lat);
    return `Stop ${k} of 4, ${placeLine(route[k - 1])}: ${e.role}, ${e.company}, ${e.dates}.`;
  }
  if (k >= 5 && k <= 9) return `Plate 2.${k - 4}: ${featured[k - 5].name}, ${featured[k - 5].figure.value} ${featured[k - 5].figure.label}.`;
  if (k === 10) return "Coursework and earlier work.";
  return "Contact.";
}

function Sheet({ left, right }: { left: string; right: string }) {
  return (
    <p className="mono fun-panel-sheet">
      <b>{left}</b> <span>{right}</span>
    </p>
  );
}

function Place({ k }: { k: number }) {
  return (
    <p className="mono fun-panel-place">
      {placeLine(route[k - 1])
        .split(" · ")
        .map((part) => (
          <span key={part}>{part}</span>
        ))}
    </p>
  );
}

/** The panel content for each stop, from the same content as the plain site. */
function StopPanel({ k, onExit }: { k: number; onExit: () => void }) {
  if (k === 1 || k === 4) {
    const s = SCHOOL(route[k - 1].coords.lat);
    return (
      <>
        <Sheet left={`Stop 0${k} / 04`} right="Education" />
        <h3 id="fun-panel-title">{s.school}</h3>
        <Place k={k} />
        <p>{s.degree}</p>
        <dl>
          <div>
            <dt className="mono">GPA</dt>
            <dd>{s.gpa}</dd>
          </div>
          <div>
            <dt className="mono">{k === 1 ? "Finished" : "Complete"}</dt>
            <dd>{s.dates}</dd>
          </div>
          {"campus" in s && s.campus && (
            <div>
              <dt className="mono">Campus</dt>
              <dd>{s.campus}</dd>
            </div>
          )}
        </dl>
        {k === 1 && srmProject && (
          <div className="fun-panel-project">
            <h4>{srmProject.name}</h4>
            <p>{srmProject.highlight}</p>
          </div>
        )}
      </>
    );
  }
  if (k === 2 || k === 3) {
    const e = JOB(route[k - 1].coords.lat);
    return (
      <>
        <Sheet left={`Stop 0${k} / 04`} right="Experience" />
        <h3 id="fun-panel-title">{e.company}</h3>
        <Place k={k} />
        <p>
          {e.role} · {e.dates}
        </p>
        <ul className="fun-panel-points">
          {e.points.slice(0, 2).map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </>
    );
  }
  if (k >= 5 && k <= 9) {
    const p = featured[k - 5];
    return (
      <>
        <Sheet left={`Plate 2.${k - 4}`} right={p.field} />
        <h3 id="fun-panel-title">{p.name}</h3>
        <p className="fun-panel-figure">
          <strong>{p.figure.value}</strong>
          <span>{p.figure.label}</span>
        </p>
        <p>{p.result[1]}</p>
        <p className="fun-panel-links">
          {p.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
              {l.label}
            </a>
          ))}
        </p>
      </>
    );
  }
  if (k === 10) {
    return (
      <>
        <Sheet left="Sheets 03 and 04" right="Coursework · Earlier work" />
        <h3 id="fun-panel-title">Coursework and earlier work</h3>
        <ul className="fun-panel-list">
          {coursework.map((c) => (
            <li key={c.slug}>
              <strong>{c.name}</strong> <span className="mono">{c.course}</span>
            </li>
          ))}
          {[...(srmProject ? [srmProject] : []), ...earlierWork].map((c) => (
            <li key={c.slug}>
              <strong>{c.name}</strong> <span className="mono">Earlier work</span>
            </li>
          ))}
        </ul>
        <p className="fun-panel-note">The full gazetteer of smaller builds is on the plain site.</p>
      </>
    );
  }
  return (
    <>
      <Sheet left="Sheet 06" right="Correspondence" />
      <h3 id="fun-panel-title">Contact</h3>
      <p className="fun-panel-email">
        <a href={`mailto:${contact.email}`}>{contact.email}</a>
      </p>
      <p className="fun-panel-links">
        {contact.links.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
            {l.label}
          </a>
        ))}
      </p>
      <button type="button" className="btn btn-secondary" onClick={onExit}>
        {survey.backLabel}
      </button>
    </>
  );
}
