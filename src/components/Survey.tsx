"use client";
// The parts of the plain site that need the browser: the theme switch, the optional flyover
// invitation, and loading fun mode only when the visitor asks for it (or chose it last time).
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { survey } from "@/content";
import { MODE_KEY, THEME_KEY } from "@/lib/surveyMode";

// Fun mode lives in its own chunk, so the plain site never downloads it.
const FunMode = dynamic(() => import("./FunMode").then((m) => m.FunMode), { ssr: false });

const store = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

const OPEN_EVENT = "survey:open";

/** The secondary hero button and the card after the projects both use this. */
export function FlyButton({ className = "btn btn-secondary" }: { className?: string }) {
  return (
    <button type="button" className={`${className} fly`} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      {survey.invite.button}{" "}
      <span className="tag">
        {survey.invite.tag}
        <span className="sr-only"> experience</span>
      </span>
    </button>
  );
}

/** Opens fun mode on request, closes it with the back button, and remembers the choice. */
export function SurveyController() {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  // While fun mode is open the plain page behind it is inert, so Tab and screen readers stay in the dialog.
  useEffect(() => {
    for (const el of document.querySelectorAll("body > :not(.fun)")) (el as HTMLElement).inert = open;
  }, [open]);

  useEffect(() => {
    const d = document.documentElement;
    // The head script already checked screen, pointer, motion and data saver; WebGL2 is checked here.
    if (d.dataset.fly === "yes" && !document.createElement("canvas").getContext("webgl2")) d.dataset.fly = "no";
    if (d.dataset.fly === "yes" && d.dataset.mode === "fun") setOpen(true);
    const onOpen = () => {
      if (d.dataset.fly !== "yes") return;
      opener.current = document.activeElement as HTMLElement | null;
      store(MODE_KEY, "fun");
      d.dataset.mode = "fun";
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  if (!open) return null;
  return (
    <FunMode
      onExit={() => {
        store(MODE_KEY, "plain");
        document.documentElement.dataset.mode = "plain";
        setOpen(false);
        // give focus back to the button that opened it (or the top of the page on a direct return visit)
        requestAnimationFrame(() => (opener.current ?? document.getElementById("hero-title"))?.focus());
      }}
    />
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null);
  useEffect(() => setTheme(document.documentElement.dataset.theme ?? "light"), []);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="theme-toggle mono"
      aria-label={`Switch to ${next} mode`}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        store(THEME_KEY, next);
        setTheme(next);
      }}
    >
      {/* rendered empty on the server; the label appears once the theme is known */}
      {theme ? (theme === "dark" ? "Light" : "Dark") : ""}
    </button>
  );
}
