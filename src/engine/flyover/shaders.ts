// GLSL for the SLAM flyover. Off-white points are the built map; orange is only the live scan
// (the newest returns and the rotating beam) and the drone's trajectory. Everything fades into the
// navy background with distance.

/** Shared scan uniforms: where the drone is, how far the lidar reaches, where the beam points. */
const SCAN = /* glsl */ `
uniform vec3 uDrone;
uniform float uRange;
uniform float uBeam;
uniform vec3 uCam;
uniform float uFog;
uniform vec3 uOrange;

// 1 at the head of the rotating beam, fading along its trail; 0 outside lidar range
float beamAt(vec2 xz) {
  vec2 rel = xz - uDrone.xz;
  float trail = fract((uBeam - atan(rel.y, rel.x)) / 6.2831853);
  return exp(-trail * 16.0) * (1.0 - smoothstep(uRange * 0.94, uRange, length(rel)));
}

float fade(vec3 world) {
  return exp(-pow(length(world - uCam) * uFog, 1.5));
}
`;

/**
 * The map: one point per lidar return. A point appears when the drone's scan first reaches it,
 * starts scattered and orange (the newest scan), and settles into place and off-white over the
 * next few seconds. Contour bands every 20 m and the coastline read brighter in the settled map.
 */
export const POINTS_VERT = /* glsl */ `
${SCAN}
attribute float aReveal;
attribute float aShade;
attribute float aSeed;
// when each stretch of the flight was scanned (seconds since start), 1e9 if not yet
uniform sampler2D uTimes;
uniform float uSteps;
uniform float uStep;
uniform float uTime;
uniform float uExag;
uniform float uPx;
uniform vec3 uWhite;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float scanned = texture2D(uTimes, vec2((aReveal / uStep + 0.5) / uSteps, 0.5)).r;
  float age = uTime - scanned;
  if (age < 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  float settle = smoothstep(0.0, 2.6, age);
  vec3 scatter = fract(vec3(aSeed, aSeed * 7.13, aSeed * 3.71) * 43.7) - 0.5;
  // scattered while fresh, then settled onto the lattice (with a slight jitter, so it doesn't shimmer)
  vec3 p = position + scatter * mix(vec3(0.6, 0.45, 0.6), vec3(0.07, 0.0, 0.07), settle);

  float newest = 1.0 - smoothstep(0.0, 0.7, age);
  float live = max(newest, beamAt(p.xz));

  // the settled map: higher ground brighter, contour bands every 20 m, the coastline brightest
  float h = position.y * 1000.0 / uExag;
  float band = 1.0 - smoothstep(0.08, 0.18, abs(fract(h / 20.0 + 0.5) - 0.5));
  float coast = 1.0 - smoothstep(3.0, 12.0, h);
  float relief = smoothstep(0.0, 160.0, h);
  float bright = 0.16 + 0.3 * aShade + 0.45 * relief + (0.5 * band + 0.6 * coast) * settle;
  vColor = mix(uWhite * bright, uOrange * 1.7, live);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  vAlpha = fade(p) * (0.5 + 0.5 * settle);
  gl_PointSize = clamp(34.0 / dist, 1.0, 3.4) * uPx * (1.0 + 0.5 * live);
  gl_Position = projectionMatrix * mv;
}
`;

export const POINTS_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (dot(c, c) > 0.25) discard;
  gl_FragColor = vec4(vColor, vAlpha);
}
`;

export const POSITION_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

/** A faint reference grid at sea level, every 10 km and 50 km, like the floor grid in RViz. */
export const GRID_FRAG = /* glsl */ `
${SCAN}
uniform vec3 uWhite;
varying vec3 vWorld;

float lines(vec2 p, float spacing) {
  vec2 q = p / spacing;
  vec2 g = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), 1e-5);
  return 1.0 - min(min(g.x, g.y), 1.0);
}

void main() {
  float g = max(lines(vWorld.xz, 10.0) * 0.45, lines(vWorld.xz, 50.0));
  vec3 col = uWhite * g * 0.045;
  gl_FragColor = vec4(col * fade(vWorld), 1.0);
}
`;
