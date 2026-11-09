"use client";
// The parts of the plain site that need the browser: the theme switch, and the link to Boston.
import { useEffect, useState } from "react";
import { survey } from "@/content";
import { THEME_KEY } from "@/lib/theme";

const store = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

/** The other invitation: a link to the Boston experience at /boston (a lighter version loads itself on phones and with reduced motion). */
export function WalkButton({ className = "btn btn-secondary" }: { className?: string }) {
  return (
    <a className={`${className} walk`} href="/boston">
      {survey.invite.walkButton}{" "}
      <span className="tag">
        {survey.invite.walkTag}
        <span className="sr-only"> experience</span>
      </span>
    </a>
  );
}

/** The third way in: the sketchbook at /sketchbook. */
export function SketchbookButton({ className = "btn btn-secondary" }: { className?: string }) {
  return (
    <a className={`${className} sketchbook-link`} href="/sketchbook">
      {survey.invite.sketchbookButton}{" "}
      <span className="tag">
        {survey.invite.sketchbookTag}
        <span className="sr-only"> experience</span>
      </span>
    </a>
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
