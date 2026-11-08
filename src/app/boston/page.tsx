// "Walk the Charles": the Boston-at-night experience, built on ThreeUI's Kage engine (MIT, Meng To).
// The plain site stays the default; this page only loads when a visitor chooses it.
import type { Metadata } from "next";
import { Scene } from "./BostonScene";
import "./boston.css";

export const metadata: Metadata = {
  title: "Walk the Charles — Bhavishya Bondalapati",
  description: "A night walk along the Charles in Boston, drawn live in WebGL: experience, featured projects, skills and contact.",
};

export default function Boston() {
  return <Scene />;
}
