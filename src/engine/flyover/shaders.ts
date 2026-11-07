// GLSL for the flyover at dusk. The terrain starts dark (shaded relief and glowing contours); the
// drone's lidar scan reveals the real landscape underneath (NASA Blue Marble imagery, lit for
// dusk). Orange is the live scan: the fresh edge of the reveal, the rotating beam and the
// trajectory. A coordinate graticule and contour lines stay on top as technical overlays.

/** The dusk sky in a direction. Terrain fades to the same colours, so the haze matches. */
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

/** Shared scan uniforms: where the drone is, how far the lidar reaches, where the beam points. */
const SCAN = /* glsl */ `
uniform vec3 uDrone;
uniform float uRange;
uniform float uBeam;
uniform vec3 uOrange;

// 1 at the head of the rotating beam, fading along its trail; 0 outside lidar range
float beamAt(vec2 xz) {
  vec2 rel = xz - uDrone.xz;
  float trail = fract((uBeam - atan(rel.y, rel.x)) / 6.2831853);
  return exp(-trail * 40.0) * (1.0 - smoothstep(uRange * 0.94, uRange, length(rel)));
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

export const SKY_FRAG = /* glsl */ `
${SKY}
uniform vec3 uCam;
varying vec3 vWorld;
void main() {
  gl_FragColor = vec4(sky(normalize(vWorld - uCam)), 1.0);
}
`;

/**
 * Terrain vertices carry their real height in metres (aH; the sea is drawn flat at 0) and the
 * index of the first path sample whose scan reached them (aReveal). The scan time for that sample
 * comes from a small texture (rows of 1024), so revealing the land costs no geometry work.
 */
export const TERRAIN_VERT = /* glsl */ `
attribute float aH;
attribute float aReveal;
uniform sampler2D uTimes;
uniform float uRows;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying float vH;
varying float vScanned;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normal;
  vUv = uv;
  vH = aH;
  float col = mod(aReveal, 1024.0), row = floor(aReveal / 1024.0);
  vScanned = aReveal < 0.0 ? 1e9 : texture2D(uTimes, vec2((col + 0.5) / 1024.0, (row + 0.5) / uRows)).r;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const TERRAIN_FRAG = /* glsl */ `
${SKY}
${HAZE}
${SCAN}
uniform sampler2D uImage;
uniform float uTime;
uniform vec3 uLand;
uniform vec3 uLandLit;
uniform vec3 uDeep;
uniform vec3 uLine;
uniform vec3 uIndex;
uniform vec3 uCoast;
uniform vec3 uWhite;
// local km to degrees, for the graticule: lat = uLat0 - z / uKz, lon = uLon0 + x / uKx
uniform float uLat0;
uniform float uLon0;
uniform float uKx;
uniform float uKz;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying float vH;
varying float vScanned;

// 1 on a line of spacing 1 in v, about px pixels wide; fades out where lines crowd together
float contour(float v, float px) {
  float w = max(fwidth(v), 1e-5);
  float d = abs(fract(v + 0.5) - 0.5) / w;
  return (1.0 - smoothstep(px * 0.5, px * 0.5 + 1.0, d)) * (1.0 - smoothstep(0.08, 0.28, w));
}

void main() {
  float h = vH;
  bool land = h > 0.0;
  vec3 n = normalize(vNormal);
  float lit = max(dot(n, uSun), 0.0);
  float fill = max(dot(n, normalize(vec3(-uSun.x, 0.6, -uSun.z))), 0.0);

  // before the scan: dark shaded relief, as on a night chart
  vec3 dark = land ? mix(uLand, uLandLit, pow(lit, 1.2)) + uHorizon * 0.22 * fill : uDeep;
  // after the scan: the real landscape, lit low and warm by the setting sun
  vec3 img = texture2D(uImage, vUv).rgb;
  // a little extra contrast and saturation, so the 500 m imagery doesn't read as a flat wash
  vec3 graded = mix(vec3(dot(img, vec3(0.299, 0.587, 0.114))), img, 1.25);
  graded = max(graded - 0.02, 0.0) * 1.15;
  vec3 dusk = land ? graded * (0.32 + 0.9 * lit + 0.35 * fill) * vec3(1.0, 0.9, 0.82) : img * 0.75 + uDeep * 0.4;
  float age = uTime - vScanned;
  float revealed = smoothstep(0.0, 1.4, age);
  vec3 col = mix(dark, dusk, revealed);

  // contours: every 25 m, index lines every 125 m, quieter over the revealed imagery
  float dist = length(vWorld - uCam);
  float reach = clamp(uCam.y / 12.0, 1.0, 2.6);
  float near = 1.0 - smoothstep(40.0 * reach, 200.0 * reach, dist);
  float k = mix(1.0, 0.45, revealed);
  if (land) {
    col = mix(col, uLine * (0.4 + 0.8 * lit), contour(h / 25.0, 1.0) * near * 0.42 * k);
    col = mix(col, uIndex * (0.45 + 0.6 * lit), contour(h / 125.0, 1.5) * mix(0.12, 0.85, near) * k);
  }
  float coast = 1.0 - smoothstep(0.8, 2.6, abs(h) / max(fwidth(h), 1e-4));
  col = mix(col, uCoast, coast * mix(0.85, 0.3, revealed));

  // the coordinate graticule: whole degrees, with half degrees fainter
  vec2 ll = vec2(uLon0 + vWorld.x / uKx, uLat0 - vWorld.z / uKz);
  vec2 g1 = abs(fract(ll - 0.5) - 0.5) / max(fwidth(ll), 1e-6);
  vec2 g2 = abs(fract(ll * 2.0 - 0.5) - 0.5) / max(fwidth(ll * 2.0), 1e-6);
  float grat = (1.0 - min(min(g1.x, g1.y), 1.0)) * 0.55 + (1.0 - min(min(g2.x, g2.y), 1.0)) * 0.18;
  col = mix(col, uWhite * 0.85, grat * 0.5);

  // the live scan: the fresh edge of the reveal and the rotating beam
  float fresh = step(0.0, age) * (1.0 - smoothstep(0.0, 0.9, age));
  col += uOrange * (fresh * 0.3 + beamAt(vWorld.xz) * 0.12);

  gl_FragColor = vec4(haze(col, vWorld), 1.0);
}
`;

/** The globe on the way to Boston: Blue Marble at dusk, a soft atmosphere rim and a graticule. */
export const GLOBE_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vWorld;
void main() {
  vN = normalize(position);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const GLOBE_FRAG = /* glsl */ `
uniform sampler2D uImage;
uniform vec3 uCam;
uniform vec3 uLight;
uniform vec3 uRim;
uniform vec3 uWhite;
varying vec3 vN;
varying vec3 vWorld;
void main() {
  float lat = asin(clamp(vN.y, -1.0, 1.0));
  float lon = atan(vN.x, vN.z);
  vec2 uv = vec2(lon / 6.2831853 + 0.5, 0.5 - lat / 3.14159265);
  vec3 img = texture2D(uImage, uv).rgb;
  float day = smoothstep(-0.15, 0.6, dot(vN, uLight));
  vec3 col = img * (0.12 + 0.95 * day) * vec3(1.0, 0.9, 0.82);
  vec3 v = normalize(uCam - vWorld);
  float rim = pow(1.0 - max(dot(vN, v), 0.0), 3.0);
  col += uRim * rim * 0.9;
  vec2 deg = vec2(lon, lat) * 57.29578 / 30.0;
  vec2 g = abs(fract(deg - 0.5) - 0.5) / max(fwidth(deg), 1e-6);
  col = mix(col, uWhite * 0.7, (1.0 - min(min(g.x, g.y), 1.0)) * 0.22);
  gl_FragColor = vec4(col, 1.0);
}
`;
