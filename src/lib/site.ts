// The site's public address, for canonical links, the sitemap and social previews.
// On Vercel, VERCEL_PROJECT_PRODUCTION_URL is set at build time (a domain, no protocol);
// SITE_URL overrides it, for example once a custom domain is attached.
/**
 * Feature flag for the 3D flyover. Off by default, so the plain site can go live on its own:
 * no invitation, no button, and a remembered choice never opens it. Turn it on at build time
 * with NEXT_PUBLIC_FLYOVER=on (locally, or in the Vercel project's environment variables).
 */
export const FLYOVER_ENABLED = process.env.NEXT_PUBLIC_FLYOVER === "on";

export const SITE_URL =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
