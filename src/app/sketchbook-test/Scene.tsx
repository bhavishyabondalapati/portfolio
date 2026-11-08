"use client";
// The configured usage from ThreeUI, unchanged, plus a link back to the plain site.
import { MengToSketchbookLandingPage } from "@/shaders/landing-pages/MengToSketchbookLandingPage";
import "@/shaders/threeui.css";

export function Scene() {
  return (
    <div className="shader-frame">
      <a className="back-plain" href="/">
        <span aria-hidden="true">←</span> Back to the plain site
      </a>
      <MengToSketchbookLandingPage
        headingFont="instrument-serif"
        bodyFont="newsreader"
        headingWeight="400"
        bodyWeight="400"
        primaryColor="#2b2721"
        headingSize={30}
        bodySize={20}
        headingLetterSpacing={0.010}
      />
    </div>
  );
}
