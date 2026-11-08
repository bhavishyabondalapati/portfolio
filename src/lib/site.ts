// The site's public address, for canonical links, the sitemap and social previews.
// On Vercel, VERCEL_PROJECT_PRODUCTION_URL is set at build time (a domain, no protocol);
// SITE_URL overrides it, for example once a custom domain is attached.
export const SITE_URL =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
