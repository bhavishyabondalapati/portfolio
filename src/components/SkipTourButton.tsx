"use client";

import { useEffect, useState } from "react";
import { tour } from "@/content";
import { MODE_EVENT } from "./HouseTour";

// "Skip the tour" switches to the fast page and remembers the choice; on the fast page
// (when this device can run the tour) the same button offers the tour back.
export function SkipTourButton() {
  const [touring, setTouring] = useState(true);

  useEffect(() => {
    const sync = () => setTouring(document.documentElement.dataset.mode === "tour");
    sync();
    window.addEventListener(MODE_EVENT, sync);
    return () => window.removeEventListener(MODE_EVENT, sync);
  }, []);

  const toggle = () => {
    const d = document.documentElement;
    const next = d.dataset.mode === "tour" ? "fast" : "tour";
    try {
      if (next === "fast") localStorage.setItem("tour", "off");
      else localStorage.removeItem("tour");
    } catch {
      // private mode: the choice lasts for this visit only
    }
    d.dataset.mode = next;
    window.dispatchEvent(new Event(MODE_EVENT));
    if (next === "fast") {
      // skipping means arriving at the content, not at a second hero
      requestAnimationFrame(() => {
        document.getElementById("experience")?.scrollIntoView({ block: "start" });
        document.getElementById("experience-title")?.focus({ preventScroll: true });
      });
    } else {
      window.scrollTo({ top: 0 });
    }
  };

  return (
    <button type="button" className="skip" onClick={toggle}>
      {touring ? tour.skipLabel : tour.resumeLabel}
    </button>
  );
}
