import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { surveyScript } from "@/lib/surveyMode";
import { person } from "@/content";
import { FLYOVER_ENABLED, SITE_URL } from "@/lib/site";
import "./globals.css";

// next/font downloads the fonts at build time and serves them from this site, so no request goes to Google.
// Archivo's width axis gives the wide display capitals and the normal-width body text from one file.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-mono",
});

const title = `${person.name}, ${person.role}`;
const description = `${person.intro} ${person.lookingFor}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title,
    description,
    siteName: person.name,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: `${person.name}: ${person.tagline}` }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1526" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexMono.variable}`}
      data-mode="plain"
      data-fly="no"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: surveyScript(FLYOVER_ENABLED) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
