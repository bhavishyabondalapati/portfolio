// "Open the sketchbook": my projects as plates in a sketchbook, built on ThreeUI's sketchbook page (MIT).
import type { Metadata } from "next";
import { Scene } from "./Scene";
import "./sketchbook.css";

export const metadata: Metadata = {
  title: "Sketchbook — Bhavishya Bondalapati",
  description: "My featured projects as plates in a sketchbook: each with its key result and a link to the code.",
};

export default function Sketchbook() {
  return <Scene />;
}
