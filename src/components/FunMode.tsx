"use client";
// Fun mode: the 3D flyover. Until the terrain is built (Part 3), this is the shell it will live in:
// a full-screen layer with the route in timeline order and a "Back to the plain site" button that
// is always visible and takes keyboard focus first.
import { useEffect, useRef } from "react";
import { route, survey } from "@/content";
import { formatCoords } from "@/lib/geo";

export function FunMode({ onExit }: { onExit: () => void }) {
  const back = useRef<HTMLButtonElement>(null);

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

  return (
    <div className="fun" role="dialog" aria-modal="true" aria-labelledby="fun-title">
      <button ref={back} type="button" className="btn btn-primary fun-back" onClick={onExit}>
        {survey.backLabel}
      </button>
      <div className="fun-body">
        <p className="mono">The survey, flown</p>
        <h2 id="fun-title">The 3D flyover is being built</h2>
        <p>It will fly this route over terrain at dusk, opening each section at its stop.</p>
        <ol className="fun-route">
          {route.map((r) => (
            <li key={r.id}>
              <span className="mono">{formatCoords(r.coords, 2)}</span>
              <strong>{r.place}</strong>
              <span>
                {r.what} · {r.when}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
