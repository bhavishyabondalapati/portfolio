import type { NextConfig } from "next";

// Static export: `next build` writes plain HTML, CSS and JS to out/.
// Security headers live in vercel.json, because a static export cannot set headers here.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  devIndicators: false,
};

export default nextConfig;
