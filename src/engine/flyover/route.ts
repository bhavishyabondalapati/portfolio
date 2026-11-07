// The flight plan: where each stop is, how the camera frames it, and the waypoints between stops.
// Journey positions are whole numbers at stops: 0 is the start over the Bay of Bengal,
// 1 Chennai, 2 Hyderabad, 3 Ongole, 4 Boston (Northeastern), 5 to 10 the six project plates,
// 11 the overview (coursework and earlier work) and 12 contact.
import type { Coords } from "@/content";
import { featured, route } from "@/content";

export type LegName = "india" | "boston";

export type StopShot = {
  leg: LegName;
  /** what the stop is centred on */
  at: Coords;
  /** a landmark the system detects and locks onto (false for the closing overview shots) */
  landmark: boolean;
  /** the drone's hover height above the ground (km) */
  hover: number;
  /**
   * The aerial overview the camera pulls back to: `back` km behind the stop along the drone's
   * approach, `up` km above it, with the view shifted `aim` km sideways so the stop sits left of
   * centre and the panel has the right side.
   */
  back: number;
  up: number;
  aim: number;
};

/** Where the India leg ends and the Boston leg begins; between them is the flight over the globe. */
export const TRANSIT = { from: 3.3, to: 3.75 };

const city = (leg: LegName, at: Coords): StopShot => ({ leg, at, landmark: true, hover: leg === "india" ? 3.4 : 2.6, back: 24, up: 17, aim: 7 });
const plate = (at: Coords): StopShot => ({ leg: "boston", at, landmark: true, hover: 2.2, back: 13, up: 9, aim: 4 });

/** One harbour waypoint per featured plate, along the shore south-east of the campus. */
const PLATE_WAYPOINTS: Coords[] = [
  { lat: 42.3505, lon: -71.0465 }, // Fort Point
  { lat: 42.3378, lon: -71.0123 }, // Castle Island
  { lat: 42.3155, lon: -71.0345 }, // Columbia Point
  { lat: 42.2935, lon: -71.0145 }, // Squantum
  { lat: 42.262, lon: -70.995 }, // Merrymount
  { lat: 42.268, lon: -70.944 }, // Houghs Neck
];
if (PLATE_WAYPOINTS.length < featured.length) throw new Error("add a harbour waypoint for every featured plate");

export const FIRST_PLATE = 5;
export const PLATES = featured.length;
export const OVERVIEW = FIRST_PLATE + PLATES;
export const LAST = OVERVIEW + 1;

export const STOPS: Record<number, StopShot> = {
  1: city("india", route[0].coords),
  2: city("india", route[1].coords),
  3: city("india", route[2].coords),
  4: city("boston", route[3].coords),
  ...Object.fromEntries(featured.map((_, i) => [FIRST_PLATE + i, plate(PLATE_WAYPOINTS[i])])),
  // rising over the harbour to see the whole map, then contact
  [OVERVIEW]: { leg: "boston", at: { lat: 42.31, lon: -71.0 }, landmark: false, hover: 9, back: 46, up: 30, aim: 12 },
  [LAST]: { leg: "boston", at: { lat: 42.33, lon: -71.04 }, landmark: false, hover: 10, back: 44, up: 28, aim: 12 },
};

/** A waypoint (with an absolute height in km) or a stop the drone hovers at. */
export type PathEntry = { at: Coords; alt: number } | { stop: number };

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const PATHS: Record<LegName, PathEntry[]> = {
  india: [
    { at: { lat: 13.0, lon: 80.45 }, alt: 6.5 },
    { at: { lat: 12.95, lon: 80.3 }, alt: 5.6 },
    { at: { lat: 12.89, lon: 80.15 }, alt: 4.6 },
    { stop: 1 },
    { at: { lat: 13.25, lon: 79.95 }, alt: 14 },
    { at: { lat: 14.9, lon: 79.35 }, alt: 15 },
    { at: { lat: 16.7, lon: 78.75 }, alt: 13 },
    { stop: 2 },
    { at: { lat: 17.0, lon: 79.25 }, alt: 14 },
    { at: { lat: 16.1, lon: 79.8 }, alt: 13 },
    { stop: 3 },
    { at: { lat: 15.55, lon: 80.45 }, alt: 12 },
    { at: { lat: 15.65, lon: 81.4 }, alt: 30 },
  ],
  boston: [
    { at: { lat: 42.28, lon: -70.62 }, alt: 24 },
    { at: { lat: 42.32, lon: -70.82 }, alt: 9 },
    { at: { lat: 42.345, lon: -70.98 }, alt: 4 },
    ...range(4, LAST).map((stop) => ({ stop })),
  ],
};

/** Which journey positions belong to each leg, in order: the stops, plus where the leg starts and ends. */
export const LEG_SPAN: Record<LegName, { start: number; end: number; stops: number[] }> = {
  india: { start: 0, end: TRANSIT.from, stops: [1, 2, 3] },
  boston: { start: TRANSIT.to, end: LAST, stops: range(4, LAST) },
};
