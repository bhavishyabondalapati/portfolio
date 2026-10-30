// The light along the walk. Each mood is a table of numbers and colours; the renderer blends between
// them by how deep into the house the camera is, so the light changes as you walk, like a day passing.
//   light mode: golden hour in the yard, a high sun in the open courtyard, a low raking sun along the corridor
//   dark mode:  dusk in the yard, then night inside, lit by the lamps
import * as THREE from "three";

export type LightMode = "golden" | "dusk";

export type Mood = {
  sunDir: [number, number, number];
  sunColor: number;
  sunIntensity: number;
  rimColor: number;
  rimIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  zenith: number;
  horizon: number;
  sunGlow: number;
  sunGlowStrength: number;
  fog: number;
  fogDensity: number;
  exposure: number;
  /** 0 = lamps off, 1 = fully lit. */
  lamps: number;
  windowGlow: number;
  fanlightGlow: number;
  /** Opacity of the sun shafts in the yard, the courtyard and the corridor. */
  beams: [number, number, number];
  beamColor: number;
  grade: { shadows: [number, number, number]; highlights: [number, number, number]; saturation: number; contrast: number };
  bloom: { threshold: number; intensity: number };
  /** A soft light that follows the kitten, the way a film character gets its own key light. */
  key: { color: number; intensity: number };
  /** Tint for the unlit jasmine sprig at the lens. */
  sprig: number;
  /** How much the giant letters glow in their own colour (they face away from the sun). */
  letterGlow: number;
};

const golden: Mood = {
  // low (about 12 degrees) and from the left: long shadows across the veranda
  sunDir: [-0.85, 0.22, 0.3],
  sunColor: 0xffa858,
  sunIntensity: 6.0,
  rimColor: 0xffc27a,
  rimIntensity: 2.6,
  hemiSky: 0x9fb4d2,
  hemiGround: 0x6b4630,
  hemiIntensity: 0.42,
  zenith: 0x6b8fbf,
  horizon: 0xffc483,
  sunGlow: 0xffe1a8,
  sunGlowStrength: 1.4,
  fog: 0xe8c294,
  fogDensity: 0.011,
  exposure: 1.0,
  lamps: 0,
  windowGlow: 0,
  fanlightGlow: 0.35,
  beams: [0.42, 0, 0],
  beamColor: 0xffc890,
  grade: { shadows: [0.94, 0.97, 1.08], highlights: [1.07, 1.0, 0.9], saturation: 1.08, contrast: 1.06 },
  bloom: { threshold: 0.82, intensity: 0.85 },
  key: { color: 0xffd9b0, intensity: 4 },
  sprig: 0x7a6c56,
  letterGlow: 0.14,
};

// in the courtyard the sun stands high: light falls from the open sky onto the sunken court
const courtyardDay: Mood = {
  ...golden,
  sunDir: [-0.35, 0.9, 0.25],
  sunColor: 0xffe2b0,
  sunIntensity: 4.6,
  rimIntensity: 0.8,
  hemiSky: 0xbcd0e6,
  hemiGround: 0x8a5a38,
  hemiIntensity: 0.85,
  fog: 0xe9d2ac,
  fogDensity: 0.02,
  exposure: 1.05,
  beams: [0, 0.26, 0],
  beamColor: 0xfff0d0,
  key: { color: 0xffe6c4, intensity: 3 },
};

// along the corridor a low sun rakes in from the garden between the pillars
const corridorDay: Mood = {
  ...golden,
  sunDir: [-0.82, 0.38, 0.12],
  sunColor: 0xffb468,
  sunIntensity: 5.4,
  hemiIntensity: 0.38,
  fog: 0xe2b98a,
  fogDensity: 0.024,
  beams: [0, 0, 0.45],
  key: { color: 0xffd2a0, intensity: 3.5 },
};

const dusk: Mood = {
  // the sun is below the horizon: a faint orange afterglow from the left, blue sky fill, lamps doing the work
  sunDir: [-0.9, 0.06, 0.3],
  sunColor: 0xff7a3a,
  sunIntensity: 1.3,
  rimColor: 0xff9a5a,
  rimIntensity: 0.9,
  // bluer than before, so the lime plaster stays white-blue instead of going mauve
  hemiSky: 0x5878b4,
  hemiGround: 0x2a2620,
  hemiIntensity: 1.0,
  zenith: 0x1f2f62,
  horizon: 0xe8894a,
  sunGlow: 0xffa060,
  sunGlowStrength: 1.1,
  fog: 0x46566e,
  fogDensity: 0.016,
  exposure: 1.3,
  lamps: 1,
  windowGlow: 2.2,
  fanlightGlow: 1.6,
  beams: [0, 0, 0],
  beamColor: 0xffb070,
  grade: { shadows: [0.9, 0.97, 1.1], highlights: [1.08, 0.99, 0.88], saturation: 1.0, contrast: 1.06 },
  bloom: { threshold: 0.6, intensity: 1.3 },
  key: { color: 0xffb46e, intensity: 4 },
  sprig: 0x4a4a58,
  letterGlow: 0.16,
};

// inside at night: a cool moon through the open courtyard, warm lamps everywhere else
const nightInside: Mood = {
  ...dusk,
  sunDir: [-0.3, 0.9, 0.2],
  sunColor: 0x8ea8d8,
  sunIntensity: 0.9,
  hemiIntensity: 0.55,
  fog: 0x2f3a4c,
  fogDensity: 0.022,
  exposure: 1.35,
};

// out the back after the corridor: the day has gone; the lamps light one by one as you walk in
const duskBack: Mood = { ...dusk, lamps: 0, fogDensity: 0.012, hemiSky: 0x4a66a4, hemiIntensity: 0.75, sunIntensity: 0.8, horizon: 0xd9784a };

export const MOODS: Record<LightMode, Mood> = { golden, dusk };

/** Mood keyframes by camera depth (z): the yard, the courtyard, the corridor. */
const PATHS: Record<LightMode, [number, Mood][]> = {
  golden: [
    [2, golden],
    [-7, courtyardDay],
    [-22, courtyardDay],
    [-27, corridorDay],
    [-46, corridorDay],
    [-52, duskBack],
  ],
  dusk: [
    [2, dusk],
    [-7, nightInside],
    [-50, nightInside],
    [-55, { ...dusk, fogDensity: 0.012 }],
  ],
};

const ca = new THREE.Color();
const cb = new THREE.Color();
const mixHex = (a: number, b: number, t: number) => ca.set(a).lerp(cb.set(b), t).getHex();
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

export function mixMood(a: Mood, b: Mood, t: number): Mood {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    sunDir: mix3(a.sunDir, b.sunDir, t),
    sunColor: mixHex(a.sunColor, b.sunColor, t),
    sunIntensity: mix(a.sunIntensity, b.sunIntensity, t),
    rimColor: mixHex(a.rimColor, b.rimColor, t),
    rimIntensity: mix(a.rimIntensity, b.rimIntensity, t),
    hemiSky: mixHex(a.hemiSky, b.hemiSky, t),
    hemiGround: mixHex(a.hemiGround, b.hemiGround, t),
    hemiIntensity: mix(a.hemiIntensity, b.hemiIntensity, t),
    zenith: mixHex(a.zenith, b.zenith, t),
    horizon: mixHex(a.horizon, b.horizon, t),
    sunGlow: mixHex(a.sunGlow, b.sunGlow, t),
    sunGlowStrength: mix(a.sunGlowStrength, b.sunGlowStrength, t),
    fog: mixHex(a.fog, b.fog, t),
    fogDensity: mix(a.fogDensity, b.fogDensity, t),
    exposure: mix(a.exposure, b.exposure, t),
    lamps: mix(a.lamps, b.lamps, t),
    windowGlow: mix(a.windowGlow, b.windowGlow, t),
    fanlightGlow: mix(a.fanlightGlow, b.fanlightGlow, t),
    beams: mix3(a.beams, b.beams, t),
    beamColor: mixHex(a.beamColor, b.beamColor, t),
    grade: {
      shadows: mix3(a.grade.shadows, b.grade.shadows, t),
      highlights: mix3(a.grade.highlights, b.grade.highlights, t),
      saturation: mix(a.grade.saturation, b.grade.saturation, t),
      contrast: mix(a.grade.contrast, b.grade.contrast, t),
    },
    bloom: { threshold: mix(a.bloom.threshold, b.bloom.threshold, t), intensity: mix(a.bloom.intensity, b.bloom.intensity, t) },
    key: { color: mixHex(a.key.color, b.key.color, t), intensity: mix(a.key.intensity, b.key.intensity, t) },
    sprig: mixHex(a.sprig, b.sprig, t),
    letterGlow: mix(a.letterGlow, b.letterGlow, t),
  };
}

/** The mood at a camera depth: blended between the two keyframes either side of it. */
export function moodAt(mode: LightMode, z: number): Mood {
  const path = PATHS[mode];
  if (z >= path[0][0]) return path[0][1];
  for (let i = 0; i < path.length - 1; i++) {
    const [za, ma] = path[i];
    const [zb, mb] = path[i + 1];
    if (z <= za && z >= zb) {
      const t = (za - z) / (za - zb);
      return mixMood(ma, mb, t * t * (3 - 2 * t));
    }
  }
  return path[path.length - 1][1];
}

export function sunDirection(m: Mood) {
  return new THREE.Vector3(...m.sunDir).normalize();
}
