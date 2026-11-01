// GLSL for the flyover. Colours arrive as uniforms (converted from the palette's sRGB hex to linear
// by THREE.Color), so the shaders only hold the shapes: sky, contours, sweep and haze.

/** The dusk sky in a direction. Terrain and water fade to this same colour, so the haze matches. */
export const SKY = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uEmber;

// navy overhead, dusky indigo at the horizon, and a narrow ember band only toward the low sun
float towardSun(vec3 d) { return max(dot(normalize(d.xz + 1e-5), normalize(uSun.xz)), 0.0); }

vec3 sky(vec3 d) {
  float t = towardSun(d);
  float band = pow(t, 16.0) * (1.0 - smoothstep(0.0, 0.05, abs(d.y - 0.003)));
  vec3 c = mix(uHorizon, uZenith, smoothstep(-0.02, 0.32, d.y));
  c = mix(c, uEmber, band * 0.75);
  c = mix(c, uHorizon * 0.7, 1.0 - smoothstep(-0.25, 0.0, d.y));
  float s = max(dot(d, uSun), 0.0);
  c += uEmber * pow(s, 24.0) * 0.16;
  return c;
}

// the haze is a muted version of the sky: it warms toward the sun but never goes orange
vec3 hazeColor(vec3 d) {
  float t = towardSun(d);
  return mix(uHorizon * 0.8, uEmber * 0.5, pow(t, 12.0) * 0.16);
}
`;

const HAZE = /* glsl */ `
uniform vec3 uCam;
uniform float uFog;

vec3 haze(vec3 col, vec3 world) {
  vec3 v = world - uCam;
  float dist = length(v);
  float f = 1.0 - exp(-pow(dist * uFog, 1.5));
  // far away the haze becomes the sky itself, so there is no seam at the horizon
  vec3 d = v / dist;
  return mix(col, mix(hazeColor(d), sky(d), pow(f, 6.0)), f);
}
`;

export const WORLD_VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normal;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

/** For the sky and the sea, which only need the world position. */
export const POSITION_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const SKY_FRAG = /* glsl */ `
${SKY}
uniform vec3 uCam;
varying vec3 vWorld;
void main() {
  gl_FragColor = vec4(sky(normalize(vWorld - uCam)), 1.0);
}
`;

/** A dark, slightly reflective sea at 0 m; the sea-floor contours show faintly through it. */
export const WATER_FRAG = /* glsl */ `
${SKY}
${HAZE}
uniform vec3 uDeep;
varying vec3 vWorld;
void main() {
  vec3 v = normalize(vWorld - uCam);
  float fres = pow(1.0 - max(-v.y, 0.0), 5.0);
  vec3 col = mix(uDeep, sky(reflect(v, vec3(0.0, 1.0, 0.0))), 0.06 + 0.42 * fres);
  gl_FragColor = vec4(haze(col, vWorld), mix(0.52, 0.96, fres));
}
`;

/**
 * Terrain: shaded relief, contour lines every 25 m on land (index lines every 125 m), dimmer
 * 200 m lines on the sea floor, a glowing coastline at 0 m, and the scan sweep at the active stop.
 */
export const TERRAIN_FRAG = /* glsl */ `
${SKY}
${HAZE}
uniform float uExag;
uniform vec3 uLand;
uniform vec3 uLandLit;
uniform vec3 uSeaFloor;
uniform vec3 uLine;
uniform vec3 uIndex;
uniform vec3 uCoast;
uniform vec3 uMask;
uniform vec3 uMarker;
uniform float uSweep;
uniform float uSettle;
uniform float uRadius;
uniform float uCell;
varying vec3 vWorld;
varying vec3 vNormal;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

// 1 on a line of spacing 1 in v, about px pixels wide; fades out where lines crowd together
float contour(float v, float px) {
  float w = max(fwidth(v), 1e-5);
  float d = abs(fract(v + 0.5) - 0.5) / w;
  return (1.0 - smoothstep(px * 0.5, px * 0.5 + 1.0, d)) * (1.0 - smoothstep(0.08, 0.28, w));
}

void main() {
  float h = vWorld.y * 1000.0 / uExag;
  vec3 n = normalize(vNormal);
  float lit = max(dot(n, uSun), 0.0);
  bool land = h >= 0.0;

  // slopes facing the camera (away from the sun) get a cool fill from the eastern sky
  float fill = max(dot(n, normalize(vec3(-uSun.x, 0.6, -uSun.z))), 0.0);
  vec3 col = land ? mix(uLand, uLandLit, pow(lit, 1.2)) + uHorizon * 0.22 * fill : uSeaFloor * (0.6 + 0.4 * lit);
  float dist = length(vWorld - uCam);
  // lines carry further when the camera is high, so the opening shot still reads as a contour map
  float reach = clamp(uCam.y / 12.0, 1.0, 2.6);
  float near = 1.0 - smoothstep(40.0 * reach, 200.0 * reach, dist);
  float minor = (land ? contour(h / 25.0, 1.0) : contour(h / 200.0, 1.0) * 0.7) * near;
  float index = land ? contour(h / 125.0, 1.5) : contour(h / 1000.0, 1.4) * 0.45;
  col = mix(col, uLine * (0.4 + 0.8 * lit), minor * 0.42);
  col = mix(col, uIndex * (0.45 + 0.6 * lit), index * mix(0.12, 0.85, near));
  float coast = 1.0 - smoothstep(0.8, 2.6, abs(h) / max(fwidth(h), 1e-4));
  col = mix(col, uCoast, coast);

  // the scan sweep: a ring grows from the marker; behind it, mask cells fill orange by
  // "confidence" (clustered noise), then settle to outlines, like a change-detection mask
  if (uSweep > 0.0) {
    float d = length(vWorld.xz - uMarker.xz);
    float fw = max(fwidth(d), 1e-4);
    float R = uSweep * uRadius;
    float inside = 1.0 - smoothstep(R - fw, R, d);
    float ring = (1.0 - smoothstep(1.0, 3.0, abs(d - R) / fw)) * (1.0 - uSettle);
    // max() keeps exp() finite beyond the ring; an overflow here becomes NaN, which bloom spreads
    float trail = inside * exp(-max(R - d, 0.0) / (uRadius * 0.07)) * (1.0 - uSettle);

    vec2 g = vWorld.xz / uCell;
    vec2 cid = floor(g);
    vec2 cf = fract(g);
    float conf = 0.7 * vnoise(cid * 0.21 + 3.7) + 0.3 * hash(cid);
    float flagged = step(0.58, conf) * step(length((cid + 0.5) * uCell - uMarker.xz), uRadius);
    float age = (R - d) / uRadius;
    float fill = flagged * smoothstep(0.0, 0.1, age - (1.0 - conf) * 0.3);
    float edgePx = min(min(cf.x, 1.0 - cf.x), min(cf.y, 1.0 - cf.y)) / max(fwidth(g.x), 1e-4);
    float edge = 1.0 - smoothstep(0.4, 1.4, edgePx);

    col = mix(col, uMask * 0.75, fill * mix(0.62, 0.16, uSettle));
    col = mix(col, uMask * 1.3, edge * fill * mix(0.5, 0.9, uSettle));
    col = mix(col, uLine * 0.6, edge * inside * (1.0 - flagged) * 0.16 * (1.0 - uSettle));
    col += uMask * (ring * 2.2 + trail * 0.35);
    float rim = 1.0 - smoothstep(0.5, 1.8, abs(d - uRadius) / fw);
    col += uMask * rim * uSettle * 0.9;
  }

  gl_FragColor = vec4(haze(col, vWorld), 1.0);
}
`;
