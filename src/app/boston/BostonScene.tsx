"use client";
// Walk the Charles: the Boston page (public/house/house.html) inside ThreeUI's frame, with a "Back to the
// plain site" button that is always on top. On phones, with reduced motion, with data saver on, or on a
// weak machine, the page is opened in its light mode (?q=low: lower resolution, no shadows).
import { useEffect, useState } from "react";
import { HouseLandingPage } from "@/vendor/threeui/landing-pages/HouseLandingPage";

export function Scene() {
  // undefined until the browser has been asked, so the frame loads the right version straight away
  const [light, setLight] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    setLight(
      window.innerWidth <= 820 ||
        matchMedia("(prefers-reduced-motion: reduce)").matches ||
        matchMedia("(hover: none)").matches ||
        !!c?.saveData ||
        (navigator.hardwareConcurrency || 8) < 4,
    );
  }, []);
  return (
    <div className="shader-frame">
      <a className="back-plain" href="/">
        <span aria-hidden="true">←</span> Back to the plain site
      </a>
      {light !== undefined && (
        <HouseLandingPage
          headingFont="onest"
          bodyFont="onest"
          headingWeight="400"
          bodyWeight="300"
          primaryColor="#f2a541"
          headingSize={46}
          bodySize={17}
          headingLetterSpacing={-0.012}
          sourceQuery={light ? "?q=low" : ""}
        />
      )}
    </div>
  );
}
