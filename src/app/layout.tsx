import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { SURVEY_SCRIPT } from "@/lib/surveyMode";
import { person } from "@/content";
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

export const metadata: Metadata = {
  title: `${person.name}, ${person.role}`,
  description: `${person.intro} ${person.lookingFor}`,
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
        <script dangerouslySetInnerHTML={{ __html: SURVEY_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
