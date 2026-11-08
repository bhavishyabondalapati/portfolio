// "Walk the Charles": the Boston-at-night page built on ThreeUI's Kage engine (MIT, Meng To).
// Same frame and typography recipe as KageLandingPage; the page itself is public/house/house.html.
import { LandingPageFrame, type LandingPageProps } from "./LandingPageFrame";
import { KAGE_TYPOGRAPHY } from "./pageRecipes";
import { splitTypographyProps, usePageTypography, type PageTypographyProps } from "./pageTypography";

export function HouseLandingPage(props: LandingPageProps & PageTypographyProps & { sourceQuery?: string }) {
  const { sourceQuery, ...rest } = props;
  const [type, frame] = splitTypographyProps(rest);
  const customization = usePageTypography(KAGE_TYPOGRAPHY, type);
  return <LandingPageFrame {...frame} customization={customization} title="Bhavishya Bondalapati — the Charles at night" sourceUrl={`/house/house.html${sourceQuery ?? ""}`} />;
}
