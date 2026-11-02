// The flight plan: where each stop is, how the camera frames it, and the waypoints between stops.
// Journey positions are whole numbers at stops: 0 is the start over the Bay of Bengal,
// 1 Chennai, 2 Hyderabad, 3 Ongole, 4 Boston (Northeastern), 5 to 9 the five project plates,
// 10 the overview (coursework and earlier work) and 11 contact.
import type { Coords } from "@/content";
import { route } from "@/content";

export type LegName = "india" | "boston";

export type StopShot = {
  leg: LegName;
  /** what the stop is centred on */
  at: Coords;
  /** the direction the camera looks at the hold, in degrees from north (90 = east) */
  bearing: number;
  /** horizontal distance from camera to the stop, and height above the ground there (km) */
  dist: number;
  up: number;
  /** how far (km) the view is shifted sideways, so the stop sits opposite the panel */
  aim: number;
  panel: "left" | "right";
  /** a landmark the system detects and locks onto (false for the closing overview shots) */
  landmark: boolean;
  /** the drone's hover height above the ground (km) */
  hover: number;
};

export const LAST = 11;

/** Where the India leg ends and the Boston leg begins; between them is the flight over the globe. */
export const TRANSIT = { from: 3.3, to: 3.75 };

const india = (at: Coords, bearing: number, panel: "left" | "right"): StopShot => ({
  leg: "india", at, bearing, dist: 30, up: 13, aim: 6, panel, landmark: true, hover: 3.4,
});
const plate = (at: Coords): StopShot => ({
  leg: "boston", at, bearing: 315, dist: 15, up: 6.5, aim: 3.5, panel: "right", landmark: true, hover: 2.2,
});

export const STOPS: Record<number, StopShot> = {
  1: india(route[0].coords, 182, "left"), // the coast recedes on the left; the panel sits over the sea
  2: india(route[1].coords, 0, "right"),
  3: india(route[2].coords, 0, "right"), // the sea is to the east, on the right, under the panel
  4: { leg: "boston", at: route[3].coords, bearing: 282, dist: 24, up: 10, aim: 5, panel: "right", landmark: true, hover: 2.6 },
  // the five project plates: waypoints along the harbour shore, south-east of the campus
  5: plate({ lat: 42.3505, lon: -71.0465 }),
  6: plate({ lat: 42.3378, lon: -71.0123 }),
  7: plate({ lat: 42.3155, lon: -71.0345 }),
  8: plate({ lat: 42.2935, lon: -71.0145 }),
  9: plate({ lat: 42.262, lon: -70.995 }),
  // rising over the harbour to see the whole map, then contact
  10: { leg: "boston", at: { lat: 42.32, lon: -71.03 }, bearing: 300, dist: 52, up: 28, aim: 9, panel: "right", landmark: false, hover: 10 },
  11: { leg: "boston", at: { lat: 42.33, lon: -71.05 }, bearing: 255, dist: 48, up: 26, aim: 9, panel: "left", landmark: false, hover: 11 },
};

/** A waypoint (with an absolute height in km) or a stop the drone hovers at. */
export type PathEntry = { at: Coords; alt: number } | { stop: number };

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
    { at: { lat: 15.55, lon: 80.45 }, alt: 9 },
    { at: { lat: 15.65, lon: 81.4 }, alt: 22 },
  ],
  boston: [
    { at: { lat: 42.28, lon: -70.62 }, alt: 9 },
    { at: { lat: 42.32, lon: -70.82 }, alt: 6 },
    { at: { lat: 42.345, lon: -70.98 }, alt: 4 },
    { stop: 4 },
    { stop: 5 },
    { stop: 6 },
    { stop: 7 },
    { stop: 8 },
    { stop: 9 },
    { stop: 10 },
    { stop: 11 },
  ],
};

/** Which journey positions belong to each leg, in order: the stops, plus where the leg starts and ends. */
export const LEG_SPAN: Record<LegName, { start: number; end: number; stops: number[] }> = {
  india: { start: 0, end: TRANSIT.from, stops: [1, 2, 3] },
  boston: { start: TRANSIT.to, end: LAST, stops: [4, 5, 6, 7, 8, 9, 10, 11] },
};
