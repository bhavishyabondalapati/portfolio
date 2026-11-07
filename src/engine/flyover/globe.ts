// The flight to Boston: the Earth at dusk (NASA Blue Marble), a graticule, and the great-circle
// trajectory from Ongole drawing itself as the drone flies. The camera starts close over India,
// pulls back to see the whole arc, and closes in again over Boston, so the switch from the India
// map to the globe and from the globe to the Boston map reads as one zoom out and back in.
import * as THREE from "three";
import type { Coords } from "@/content";
import { alongGreatCircle } from "@/lib/flyover";
import { GLOBE_FRAG, GLOBE_VERT } from "./shaders";

const R = 100;

/** Latitude and longitude to a point on the globe (y up, longitude 0 facing +z). */
export const onGlobe = (c: Coords, r = R) => {
  const la = (c.lat * Math.PI) / 180, lo = (c.lon * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
};

export function buildGlobe(image: THREE.Texture, from: Coords, to: Coords, opt: { white: THREE.Color; orange: THREE.Color; rim: THREE.Color; cam: THREE.Vector3 }) {
  const root = new THREE.Group();
  // no mipmaps: the image wraps at longitude 180, where mip selection would draw a seam
  image.generateMipmaps = false;
  image.minFilter = THREE.LinearFilter;

  // light from over the Atlantic, so the arc runs from evening into day
  const light = onGlobe({ lat: 30, lon: -20 }, 1).normalize();
  root.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(R, 96, 48),
      new THREE.ShaderMaterial({
        vertexShader: GLOBE_VERT,
        fragmentShader: GLOBE_FRAG,
        uniforms: { uImage: { value: image }, uCam: { value: opt.cam }, uLight: { value: light }, uRim: { value: opt.rim }, uWhite: { value: opt.white } },
      }),
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
  const trail = new THREE.Mesh(new THREE.TubeGeometry(arcCurve, N, 0.22, RADIAL, false), new THREE.MeshBasicMaterial({ color: opt.orange.clone().multiplyScalar(1.6) }));
  root.add(trail);
  // the planned route, faint, ahead of the drone
  root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts), new THREE.LineBasicMaterial({ color: opt.white, transparent: true, opacity: 0.3 })));
  const drone = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 8), new THREE.MeshBasicMaterial({ color: opt.orange.clone().multiplyScalar(2) }));
  root.add(drone);
  for (const c of [from, to]) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), new THREE.MeshBasicMaterial({ color: opt.white }));
    m.position.copy(onGlobe(c, R * 1.01));
    root.add(m);
  }

  const up = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3(), side = new THREE.Vector3(), look = new THREE.Vector3();
  /** t from 0 (Ongole) to 1 (Boston): moves the drone, draws the trail, and places the camera. */
  const place = (t: number, camera: THREE.PerspectiveCamera) => {
    arcCurve.getPoint(t, p);
    drone.position.copy(p);
    trail.geometry.setDrawRange(0, Math.floor(t * N) * RADIAL * 6);
    // close over the surface at both ends, far enough mid-flight to see the whole arc
    const out = Math.sin(Math.PI * t);
    side.crossVectors(p, up).normalize();
    camera.position
      .copy(p)
      .normalize()
      .multiplyScalar(R * (1.25 + 1.35 * out))
      .addScaledVector(side, R * 0.4 * out)
      .addScaledVector(up, R * 0.22 * out);
    look.copy(p).multiplyScalar(0.55 + 0.45 * (1 - out));
    camera.lookAt(look);
    return alongGreatCircle(from, to, t);
  };

  return { root, place };
}
