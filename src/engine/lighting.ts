// The two moods of the hero: golden hour (low sun raking from the left) and dusk (sun gone, lamps lit).
// Everything that changes between them lives in one table so the two can be compared side by side.
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
  lampsOn: boolean;
  windowGlow: number;
  fanlightGlow: number;
  beams: number; // opacity of the sun shafts
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

export const MOODS: Record<LightMode, Mood> = {
  golden: {
    // low (about 12 degrees) and from the left, slightly in front: long shadows across the veranda
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
    lampsOn: false,
    windowGlow: 0,
    fanlightGlow: 0.35,
    beams: 0.42,
    beamColor: 0xffc890,
    grade: { shadows: [0.94, 0.97, 1.08], highlights: [1.07, 1.0, 0.9], saturation: 1.08, contrast: 1.06 },
    bloom: { threshold: 0.82, intensity: 0.85 },
    key: { color: 0xffd9b0, intensity: 4 },
    sprig: 0x7a6c56,
    letterGlow: 0.14,
  },
  dusk: {
    // the sun is below the horizon: a faint orange afterglow from the left, blue sky fill, lamps doing the work
    sunDir: [-0.9, 0.06, 0.3],
    sunColor: 0xff7a3a,
    sunIntensity: 1.3,
    rimColor: 0xff9a5a,
    rimIntensity: 0.9,
    hemiSky: 0x6a7fc0,
    hemiGround: 0x2a2420,
    hemiIntensity: 1.0,
    zenith: 0x223066,
    horizon: 0xf08f50,
    sunGlow: 0xffa060,
    sunGlowStrength: 1.2,
    fog: 0x56607a,
    fogDensity: 0.016,
    exposure: 1.3,
    lampsOn: true,
    windowGlow: 2.2,
    fanlightGlow: 1.6,
    beams: 0,
    beamColor: 0xffb070,
    grade: { shadows: [0.88, 0.95, 1.15], highlights: [1.08, 0.98, 0.86], saturation: 1.0, contrast: 1.06 },
    bloom: { threshold: 0.6, intensity: 1.3 },
    key: { color: 0xffb46e, intensity: 6 },
    sprig: 0x4a4a58,
    letterGlow: 0.16,
  },
};

export function sunDirection(m: Mood) {
  return new THREE.Vector3(...m.sunDir).normalize();
}
