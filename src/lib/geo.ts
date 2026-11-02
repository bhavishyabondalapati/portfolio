// Coordinates printed beside sections, in the style of a map margin.
import type { Coords } from "../content.ts";

/** 42.3398, -71.0892 -> "42.3398° N · 71.0892° W" */
export function formatCoords(c: Coords, digits = 4) {
  const lat = `${Math.abs(c.lat).toFixed(digits)}° ${c.lat >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(c.lon).toFixed(digits)}° ${c.lon >= 0 ? "E" : "W"}`;
  return `${lat} · ${lon}`;
}

/** 12.8231, 80.0442 -> "12.82° N, 80.04° E" (the short form used beside place names) */
export function formatCoordsShort(c: Coords) {
  return formatCoords(c, 2).replace(" · ", ", ");
}

/** "Chennai, Tamil Nadu, India · 12.82° N, 80.04° E" */
export function placeLine(p: { place: string; region: string; country: string; coords: Coords }) {
  return `${p.place}, ${p.region}, ${p.country} · ${formatCoordsShort(p.coords)}`;
}
