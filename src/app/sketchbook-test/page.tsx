// Test route for the Sketchbook experiment (branch "sketchbook"). Not linked from the site, not indexed.
import type { Metadata } from "next";
import { Scene } from "./Scene";
import "./sketchbook.css";

export const metadata: Metadata = {
  title: "Sketchbook (test)",
  robots: { index: false, follow: false },
};

export default function SketchbookTest() {
  return <Scene />;
}
