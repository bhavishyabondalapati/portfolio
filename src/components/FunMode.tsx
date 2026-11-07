"use client";
// Fun mode: the 3D flyover. A drone flies the route in the order it happened at dusk, and its
// lidar scan reveals the real landscape; each stop is a landmark it locks onto, and that stop's
// panel opens while the camera pulls back to an aerial overview. Arriving in Boston closes the
// loop. This full-screen layer holds the canvas, the timeline rail, the HUD, the inset map, the
// landmark reticle and panel, and a "Back to the plain site" button that is always visible and
// takes keyboard focus first. The scene itself lives in src/engine/flyover/.
import { useEffect, useRef, useState } from "react";
import { contact, coursework, earlierWork, education, experience, featured, route, srmProject, survey } from "@/content";
import type { Flyover, FrameState } from "@/engine/flyover/createFlyover";
import { FIRST_PLATE, LAST, OVERVIEW } from "@/engine/flyover/route";
import { alongGreatCircle, stopTarget } from "@/lib/flyover";
import { formatCoordsShort, placeLine } from "@/lib/geo";
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
const isPlate = (k: number) => k >= FIRST_PLATE && k < OVERVIEW;
const plateOf = (k: number) => featured[k - FIRST_PLATE];

/** The timeline rail: each stop with its dates and what I did there, then the plates. */
const TIMELINE: { stop: number; when: string; what: string; where: string }[] = [
  { stop: 1, when: SCHOOL(route[0].coords.lat).dates, what: "B.Tech, CSE (AI and ML), SRM", where: route[0].place },
  { stop: 2, when: JOB(route[1].coords.lat).dates, what: `${JOB(route[1].coords.lat).role}, ${JOB(route[1].coords.lat).company}`, where: route[1].place },
  { stop: 3, when: JOB(route[2].coords.lat).dates, what: `${JOB(route[2].coords.lat).role}, ${JOB(route[2].coords.lat).company.replace(" Pvt. Ltd.", "")}`, where: route[2].place },
  { stop: 4, when: SCHOOL(route[3].coords.lat).dates, what: "MS Computer Science, Northeastern", where: route[3].place },
  ...featured.map((p, i) => ({ stop: FIRST_PLATE + i, when: `Plate 2.${i + 1}`, what: p.name, where: "" })),
  { stop: OVERVIEW, when: "Sheets 03 and 04", what: "Coursework and earlier work", where: "" },
  { stop: LAST, when: "Sheet 06", what: "Contact", where: "" },
];

/** Each stop's name in the reticle, and the line under it. */
const reticleText = (k: number): [string, string] => {
  if (k >= 1 && k <= 4) return [`Landmark 0${k}`, placeLine(route[k - 1])];
  if (isPlate(k)) return [`Waypoint 2.${k - FIRST_PLATE + 1}`, plateOf(k).name];
  return ["", ""];
};

const toInset = (box: Inset, c: { lat: number; lon: number }) => ({
  x: ((c.lon - box.west) / (box.east - box.west)) * box.width,
  y: ((box.north - c.lat) / (box.north - box.south)) * box.height,
});
const ARC = Array.from({ length: 41 }, (_, i) => alongGreatCircle(route[2].coords, route[3].coords, i / 40));
const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
/** A round number of km for the scale bar, about 110 px long. */
const niceKm = (km: number) => {
  const p = 10 ** Math.floor(Math.log10(km));
  return [1, 2, 5, 10].map((m) => m * p).find((v) => v >= km * 0.8) ?? 10 * p;
};

export function FunMode({ onExit }: { onExit: () => void }) {
  const back = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const leader = useRef<HTMLSpanElement>(null);
  const reticle = useRef<HTMLDivElement>(null);
  const droneDot = useRef<SVGCircleElement>(null);
  const hud = useRef<HTMLDListElement>(null);
  const engine = useRef<Flyover | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [bytes, setBytes] = useState({ loaded: 0, total: 0 });
  const [open, setOpen] = useState(0); // the stop whose panel is open, or 0
  const [shown, setShown] = useState(1); // the stop whose content the panel holds (kept while it fades out)
  const [current, setCurrent] = useState(0); // the nearest stop, for the rail
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
    // the page's side margin, read from the Back button so the panel lines up with it
    let edge = 56;
    const measure = () => (edge = window.innerWidth - (back.current?.getBoundingClientRect().right ?? window.innerWidth - 56));
    measure();
    window.addEventListener("resize", measure);
    const at = (el: HTMLElement, x: number, y: number) => (el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`);
    const field = (name: string, text: string) => {
      const el = hud.current?.querySelector<HTMLElement>(`[data-hud="${name}"]`);
      if (el && el.textContent !== text) el.textContent = text;
    };

    const onFrame = (s: FrameState) => {
      const r = root.current;
      if (!r) return;
      r.style.setProperty("--journey", Math.min(s.journey, 1).toFixed(3));
      r.style.setProperty("--veil", s.veil.toFixed(3));
      setCurrent(Math.round(s.journey));
      setPhase(s.phase);
      setNear(s.stop);
      setAtEnd(s.journey > LAST - 0.02);
      setLockState(s.stop === 4 && s.closure >= 1 ? "closed" : s.lock >= 1 ? "locked" : s.detected ? "detected" : "none");

      // the HUD: altitude, heading, position and a live scale bar
      if (s.phase === "transit") {
        field("alt", "Cruise");
        field("hdg", "Great circle");
        field("pos", `${Math.round(s.transitKm).toLocaleString("en-US")} of 12,937 km`);
      } else {
        field("alt", `${s.hud.alt.toFixed(1)} km · ${s.hud.agl.toFixed(1)} above ground`);
        field("hdg", `${String(Math.round(s.hud.heading)).padStart(3, "0")}° ${COMPASS[Math.round(s.hud.heading / 45) % 8]}`);
        field("pos", formatCoordsShort(s.drone));
      }
      const bar = hud.current?.querySelector<HTMLElement>(".fun-scale i");
      if (bar && s.hud.kmPerPx > 0) {
        const km = niceKm(110 * s.hud.kmPerPx);
        bar.style.width = `${(km / s.hud.kmPerPx).toFixed(0)}px`;
        field("scale", `${km} km`);
      }

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

      // the panel is docked on the right (the stop is framed left of centre); a leader line runs to it
      const p = panel.current;
      const lead = leader.current;
      if (p && lead) {
        const w = p.offsetWidth, h = p.offsetHeight;
        const x = window.innerWidth - edge - w;
        const y = Math.max(Math.min((window.innerHeight - h) / 2 - 30, window.innerHeight - h - 200), 110);
        at(p, x, y);
        const dx = x - m.x, dy = y + 26 - m.y;
        lead.style.width = `${Math.max(Math.hypot(dx, dy), 0).toFixed(1)}px`;
        lead.style.transform = `translate3d(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px, 0) rotate(${Math.atan2(dy, dx)}rad)`;
        lead.dataset.show = m.visible && dx > 40 ? "yes" : "no";
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

  // scrolling and touch move the journey continuously; keys and "Next stop" fly to a stop
  useEffect(() => {
    const el = root.current!;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest(".fun-panel, .fun-rail")) return; // let a long panel or the rail scroll
      e.preventDefault();
      const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      engine.current?.nudge(px * 0.0011);
    };
    let lastY: number | null = null;
    const onTouchStart = (e: TouchEvent) => (lastY = e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (lastY === null) return;
      const y = e.touches[0].clientY;
      engine.current?.nudge((lastY - y) * 0.003);
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
  const station = current <= 1 ? 0 : current >= 4 ? 3 : current - 1;
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

      {/* the timeline: dates and what I did at each stop, then the projects */}
      <nav className="fun-rail" aria-label="Timeline">
        <ol>
          {TIMELINE.map((t) => (
            <li key={t.stop} className={isPlate(t.stop) ? "is-plate" : undefined}>
              <button type="button" aria-current={t.stop === current ? "step" : undefined} onClick={() => engine.current?.flyTo(t.stop)}>
                <span className="mono">{t.when}</span>
                <strong>{t.what}</strong>
                {t.where && <span className="mono">{t.where}</span>}
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

      <span ref={leader} className="fun-leader" data-on={open ? "yes" : "no"} aria-hidden="true" />
      <section ref={panel} className="fun-panel" data-on={open ? "yes" : "no"} aria-labelledby="fun-panel-title" aria-hidden={!open} inert={!open}>
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
            <polyline
              className="leg"
              points={(phase === "india" ? insetStops.map((r) => r.coords) : ARC).map((c) => `${toInset(inset, c).x.toFixed(1)},${toInset(inset, c).y.toFixed(1)}`).join(" ")}
            />
            {insetStops.map((r) => {
              const q = toInset(inset, r.coords);
              const here = route.indexOf(r) === station;
              return <circle key={r.id} className={here ? "stop is-current" : "stop"} cx={q.x} cy={q.y} r={here ? 3.2 : 2.4} />;
            })}
            <circle ref={droneDot} className="drone" cx={0} cy={0} r={1.9} />
          </svg>
          <figcaption className="mono">
            <b>{phase === "india" ? f.inset : f.insetWorld}</b> · 0{station + 1} / 04
          </figcaption>
        </figure>
        <p className="mono fun-credit">
          <span>{f.exaggeration}</span>
          <span>{f.credit}</span>
          <span>{f.imageryCredit}</span>
        </p>
        <div className="fun-hud-block">
          <dl ref={hud} className="mono fun-hud" aria-hidden="true">
            <div>
              <dt>Alt</dt>
              <dd data-hud="alt" />
            </div>
            <div>
              <dt>Hdg</dt>
              <dd data-hud="hdg" />
            </div>
            <div>
              <dt>Pos</dt>
              <dd data-hud="pos" />
            </div>
            <div className="fun-scale">
              <dt>Scale</dt>
              <dd>
                <i />
                <span data-hud="scale" />
              </dd>
            </div>
          </dl>
          {!atEnd && (
            <button type="button" className="btn btn-secondary fun-next" onClick={() => engine.current?.flyTo(stopTarget(engine.current.journey, 1, LAST))}>
              {f.next} <span aria-hidden="true">↓</span>
            </button>
          )}
        </div>
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
  if (isPlate(k)) return `Plate 2.${k - FIRST_PLATE + 1}: ${plateOf(k).name}, ${plateOf(k).figure.value} ${plateOf(k).figure.label}.`;
  if (k === OVERVIEW) return "Coursework and earlier work.";
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
            <dt className="mono">Dates</dt>
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
        <h3 id="fun-panel-title">{e.role}</h3>
        <p className="fun-panel-org">
          {e.company} · {e.dates}
        </p>
        <Place k={k} />
        <p>{e.summary}</p>
        <ul className="fun-panel-points">
          {e.points.slice(0, 2).map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="mono stack">{e.stack.slice(0, 6).join(" · ")}</p>
      </>
    );
  }
  if (isPlate(k)) {
    const p = plateOf(k);
    return (
      <>
        <Sheet left={`Plate 2.${k - FIRST_PLATE + 1}`} right={p.field} />
        <h3 id="fun-panel-title">{p.name}</h3>
        <p>{p.oneLine}</p>
        <p className="fun-panel-figure">
          <strong>{p.figure.value}</strong>
          <span>{p.figure.label}</span>
        </p>
        <p>{p.result[1]}</p>
        <p className="mono stack">{p.stack.slice(0, 6).join(" · ")}</p>
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
  if (k === OVERVIEW) {
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
