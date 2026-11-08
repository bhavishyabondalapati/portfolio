// ThreeUI's MengToSketchbookLandingPage, copied verbatim from the registered LandingPages.tsx
// (source revision SHA-256 e0330548b1ac, https://threeui.com/source-code/meng-to-sketchbook-landing-page.json).
// LandingPages.tsx itself holds dozens of other pages with imports this project does not have, so only this
// one component is kept; it uses the registered pageTypography.ts, pageRecipes.ts and LandingPageFrame.tsx
// from this folder unchanged. MIT, Copyright (c) 2026 Meng To (see src/vendor/threeui/LICENSE).
import {
  splitTypographyProps,
  usePageTypography,
  type PageTypographyProps,
} from "./pageTypography";
import { LandingPageFrame, type LandingPageProps } from "./LandingPageFrame";
import { MENG_TO_SKETCHBOOK_TYPOGRAPHY } from "./pageRecipes";

export function MengToSketchbookLandingPage(props: LandingPageProps & PageTypographyProps) {
  const [type, frame] = splitTypographyProps(props);
  const customization = usePageTypography(MENG_TO_SKETCHBOOK_TYPOGRAPHY, type);
  return <LandingPageFrame {...frame} customization={customization} title="Meng To — Singapore Sketchbook" sourceUrl="/landing-pages/meng-to-sketchbook.html" />;
}
