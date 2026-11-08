// "Walk the Charles": the Boston-at-night page built on ThreeUI's Kage engine (MIT, Meng To).
// Same frame and typography recipe as KageLandingPage; the page itself is public/house/house.html.
import { LandingPageFrame, type LandingPageProps } from "./LandingPageFrame";
import { KAGE_TYPOGRAPHY } from "./pageRecipes";
import { splitTypographyProps, usePageTypography, type PageTypographyProps } from "./pageTypography";

// Vercel serves static .html files without the extension (and answers 404 for /house/house.html);
// the Next dev server needs the extension.
const HOUSE_URL = process.env.NODE_ENV === "production" ? "/house/house" : "/house/house.html";

export function HouseLandingPage(props: LandingPageProps & PageTypographyProps & { sourceQuery?: string }) {
  const { sourceQuery, ...rest } = props;
  const [type, frame] = splitTypographyProps(rest);
  const customization = usePageTypography(KAGE_TYPOGRAPHY, type);
  return <LandingPageFrame {...frame} customization={customization} title="Bhavishya Bondalapati — the Charles at night" sourceUrl={`${HOUSE_URL}${sourceQuery ?? ""}`} />;
}
