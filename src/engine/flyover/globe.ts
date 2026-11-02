// The flight to Boston: a dotted globe of land (from the coarse ETOPO world grid), a faint
// graticule, and the great-circle trajectory from Ongole drawing itself as the drone flies.
import * as THREE from "three";
import type { Coords } from "@/content";
import { alongGreatCircle } from "@/lib/flyover";
import type { Tile } from "./terrain";

const R = 100;

/** Latitude and longitude to a point on the globe (y up, longitude 0 facing +z). */
export const onGlobe = (c: Coords, r = R) => {
  const la = (c.lat * Math.PI) / 180, lo = (c.lon * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
};

const DOTS_VERT = /* glsl */ `
uniform float uPx;
uniform vec3 uCam;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  // dots fade toward the globe's edge, so it reads as a sphere
  vec3 n = normalize(position);
  vAlpha = 0.25 + 0.75 * clamp(dot(n, normalize(uCam - position)), 0.0, 1.0);
  gl_PointSize = 2.0 * uPx;
  gl_Position = projectionMatrix * mv;
}
`;
const DOTS_FRAG = /* glsl */ `
uniform vec3 uWhite;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (dot(c, c) > 0.25) discard;
  gl_FragColor = vec4(uWhite * 0.75, vAlpha);
}
`;

export function buildGlobe(world: Tile, from: Coords, to: Coords, opt: { white: THREE.Color; orange: THREE.Color; navy: THREE.Color; pixelRatio: number; cam: THREE.Vector3 }) {
  const root = new THREE.Group();

  // land dots on an equal-area pattern: fewer per row toward the poles
  const { meta, heights } = world;
  const pts: number[] = [];
  const latStep = (meta.north - meta.south) / (meta.height - 1);
  for (let r = 0; r < meta.height; r += 2) {
    const lat = meta.north - r * latStep;
    const every = Math.max(2, Math.round(2 / Math.max(Math.cos((lat * Math.PI) / 180), 0.05)));
    for (let c = 0; c < meta.width; c += every) {
      if (heights[r * meta.width + c] <= 0) continue;
      const lon = meta.west + (c / (meta.width - 1)) * (meta.east - meta.west);
      const p = onGlobe({ lat, lon }, R * 1.002);
      pts.push(p.x, p.y, p.z);
    }
  }
  const dots = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)),
    new THREE.ShaderMaterial({
      vertexShader: DOTS_VERT,
      fragmentShader: DOTS_FRAG,
      uniforms: { uPx: { value: opt.pixelRatio }, uCam: { value: opt.cam }, uWhite: { value: opt.white } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  root.add(dots);

  // a navy sphere just inside the dots hides the far side
  root.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.995, 64, 32), new THREE.MeshBasicMaterial({ color: opt.navy })));

  // graticule every 30 degrees
  const grat: number[] = [];
  for (let lat = -60; lat <= 60; lat += 30)
    for (let lon = -180; lon < 180; lon += 3) {
      const a = onGlobe({ lat, lon }, R * 1.001), b = onGlobe({ lat, lon: lon + 3 }, R * 1.001);
      grat.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  for (let lon = -180; lon < 180; lon += 30)
    for (let lat = -84; lat < 84; lat += 3) {
      const a = onGlobe({ lat, lon }, R * 1.001), b = onGlobe({ lat: lat + 3, lon }, R * 1.001);
      grat.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  root.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(grat, 3)),
      new THREE.LineBasicMaterial({ color: opt.white, transparent: true, opacity: 0.07 }),
    ),
  );

  // the great circle, lifted into a flight arc
  const N = 240;
  const arcPts = Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N;
    return onGlobe(alongGreatCircle(from, to, t), R * (1.01 + 0.05 * Math.sin(Math.PI * t)));
  });
  const arcCurve = new THREE.CatmullRomCurve3(arcPts);
  const RADIAL = 4;
  const trail = new THREE.Mesh(
    new THREE.TubeGeometry(arcCurve, N, 0.22, RADIAL, false),
    new THREE.MeshBasicMaterial({ color: opt.orange.clone().multiplyScalar(1.4) }),
  );
  root.add(trail);
  // the planned route, faint, ahead of the drone
  root.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(arcPts),
      new THREE.LineBasicMaterial({ color: opt.white, transparent: true, opacity: 0.22 }),
    ),
  );
  const drone = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 8), new THREE.MeshBasicMaterial({ color: opt.orange.clone().multiplyScalar(1.8) }));
  root.add(drone);
  // the two ends, as off-white markers
  for (const c of [from, to]) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), new THREE.MeshBasicMaterial({ color: opt.white }));
    m.position.copy(onGlobe(c, R * 1.01));
    root.add(m);
  }

  const up = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3(), side = new THREE.Vector3();
  /** t from 0 (Ongole) to 1 (Boston): moves the drone, draws the trail, and places the camera. */
  const place = (t: number, camera: THREE.PerspectiveCamera) => {
    arcCurve.getPoint(t, p);
    drone.position.copy(p);
    trail.geometry.setDrawRange(0, Math.floor(t * N) * RADIAL * 6);
    // the camera hangs back and above the drone, looking past it at the globe
    side.crossVectors(p, up).normalize();
    camera.position.copy(p).normalize().multiplyScalar(R * 2.55).addScaledVector(side, R * 0.45).addScaledVector(up, R * 0.25);
    camera.lookAt(p.clone().multiplyScalar(0.55));
    return alongGreatCircle(from, to, t);
  };

  return { root, place, dots: pts.length / 3 };
}
