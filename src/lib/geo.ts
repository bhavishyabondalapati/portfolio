// Coordinates printed beside sections, in the style of a map margin.
import type { Coords } from "../content.ts";

/** 42.3398, -71.0892 -> "42.3398° N · 71.0892° W" */
export function formatCoords(c: Coords, digits = 4) {
  const lat = `${Math.abs(c.lat).toFixed(digits)}° ${c.lat >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(c.lon).toFixed(digits)}° ${c.lon >= 0 ? "E" : "W"}`;
  return `${lat} · ${lon}`;
}
