import type { Metadata, Viewport } from "next";
import { STIX_Two_Text } from "next/font/google";
import { MODE_SCRIPT } from "@/lib/tourMode";
import { person } from "@/content";
import "./globals.css";

// next/font downloads the font at build time and serves it from this site, so no request goes to Google.
const stix = STIX_Two_Text({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-stix",
});

export const metadata: Metadata = {
  title: `${person.name}, ${person.role}`,
  description: `${person.intro} ${person.lookingFor}`,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f1ec" },
    { media: "(prefers-color-scheme: dark)", color: "#16130f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={stix.variable} data-mode="fast" data-eligible="false" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
