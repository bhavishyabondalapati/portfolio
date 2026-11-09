"use client";
// The sketchbook page (public/sketchbook/sketchbook.html) in ThreeUI's frame, with a Back button on top.
// Typography comes from ThreeUI's registered recipe for this page; the frame is the version without the
// iframe sandbox attribute (the page is same-origin and mine).
import { LandingPageFrame, type LandingPageProps } from "@/vendor/threeui/landing-pages/LandingPageFrame";
import {
  splitTypographyProps,
  usePageTypography,
  type PageTypographyProps,
} from "@/shaders/landing-pages/pageTypography";
import { MENG_TO_SKETCHBOOK_TYPOGRAPHY } from "@/shaders/landing-pages/pageRecipes";

// Vercel serves static .html files without the extension; the Next dev server needs it.
const URL_ = process.env.NODE_ENV === "production" ? "/sketchbook/sketchbook" : "/sketchbook/sketchbook.html";

function SketchbookFrame(props: LandingPageProps & PageTypographyProps) {
  const [type, frame] = splitTypographyProps(props);
  const customization = usePageTypography(MENG_TO_SKETCHBOOK_TYPOGRAPHY, type);
  return <LandingPageFrame {...frame} customization={customization} title="Bhavishya Bondalapati: Sketchbook" sourceUrl={URL_} />;
}

export function Scene() {
  return (
    <div className="shader-frame">
      <a className="back-plain" href="/">
        <span aria-hidden="true">←</span> Back to the plain site
      </a>
      <SketchbookFrame
        headingFont="instrument-serif"
        bodyFont="newsreader"
        headingWeight="400"
        bodyWeight="400"
        primaryColor="#2b2721"
        headingSize={30}
        bodySize={20}
        headingLetterSpacing={0.01}
      />
    </div>
  );
}
