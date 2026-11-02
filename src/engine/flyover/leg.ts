// One mapped leg of the flight (India or Boston): the drone's path over a terrain tile, the lidar
// map it builds, its trajectory with pose markers, and the landmarks at its stops.
import * as THREE from "three";
import type { Coords } from "@/content";
import { LEG_SPAN, PATHS, STOPS, type LegName, type StopShot } from "./route";
import { POINTS_FRAG, POINTS_VERT } from "./shaders";
import { buildCloud, heightAt, type Tile } from "./terrain";

export const STEP = 0.5; // km between path samples
const ROW = 1024; // scan-time texels per row
const POSE_EVERY = 3; // km between pose markers

export type Leg = Awaited<ReturnType<typeof buildLeg>>;

/** Unit vector (x east, z south) for a bearing in degrees from north. */
export const heading = (deg: number) => new THREE.Vector3(Math.sin((deg * Math.PI) / 180), 0, -Math.cos((deg * Math.PI) / 180));

export async function buildLeg(
  name: LegName,
  tile: Tile,
  opt: { range: number; perSide: number; scan: Record<string, THREE.IUniform>; orange: THREE.Color; pixelRatio: number },
) {
  const local = (c: Coords, alt: number) => {
    const p = tile.proj.toLocal(c);
    return new THREE.Vector3(p.x, alt, p.z);
  };
  const ground = (x: number, z: number) => Math.max(heightAt(tile, x, z), 0);

  // landmarks and hover points at this leg's stops
  const span = LEG_SPAN[name];
  const landmarks = new Map<number, THREE.Vector3>();
  const hovers = new Map<number, THREE.Vector3>();
  for (const k of span.stops) {
    const s = STOPS[k];
    const p = tile.proj.toLocal(s.at);
    const lm = new THREE.Vector3(p.x, ground(p.x, p.z), p.z);
    landmarks.set(k, lm);
    // hover a little short of the stop, on the camera's side
    const h = lm.clone().addScaledVector(heading(s.bearing), -2.5);
    h.y = ground(h.x, h.z) + s.hover;
    hovers.set(k, h);
  }

  // the path: a smooth curve through the waypoints, sampled every STEP km, kept above the ground
  const controls = PATHS[name].map((e) => ("stop" in e ? hovers.get(e.stop)!.clone() : local(e.at, e.alt)));
  const curve = new THREE.CatmullRomCurve3(controls, false, "centripetal");
  const raw = curve.getLength();
  const samples: THREE.Vector3[] = [];
  for (let i = 0; i * STEP <= raw; i++) {
    const p = curve.getPointAt(Math.min((i * STEP) / raw, 1));
    p.y = Math.max(p.y, ground(p.x, p.z) + 1.4);
    samples.push(p);
  }
  const length = (samples.length - 1) * STEP;

  // the path distance (km) at each stop: the nearest sample to its hover point, in order
  const stopKm = new Map<number, number>();
  let from = 0;
  for (const k of span.stops) {
    const h = hovers.get(k)!;
    let best = from, bestD = Infinity;
    for (let i = from; i < samples.length; i++) {
      const d = samples[i].distanceToSquared(h);
      if (d < bestD) (bestD = d), (best = i);
    }
    stopKm.set(k, best * STEP);
    from = best;
  }

  // journey position to path distance: straight lines between the leg's start, stops and end
  const keys: [number, number][] = [[span.start, 0], ...span.stops.map((k) => [k, stopKm.get(k)!] as [number, number])];
  if (span.end > span.stops[span.stops.length - 1]) keys.push([span.end, length]);
  const kmAt = (j: number) => {
    if (j <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [j1, k1] = keys[i];
      if (j <= j1) {
        const [j0, k0] = keys[i - 1];
        return k0 + ((k1 - k0) * (j - j0)) / (j1 - j0);
      }
    }
    return keys[keys.length - 1][1];
  };

  const pointAt = (km: number, out: THREE.Vector3) => {
    const f = Math.min(Math.max(km / STEP, 0), samples.length - 1);
    const i = Math.min(Math.floor(f), samples.length - 2);
    return out.lerpVectors(samples[i], samples[i + 1], f - i);
  };
  const tangentAt = (km: number, out: THREE.Vector3) => {
    const a = pointAt(Math.max(km - 1.5, 0), new THREE.Vector3());
    const b = pointAt(Math.min(km + 1.5, length), new THREE.Vector3());
    out.subVectors(b, a);
    out.y = 0;
    if (out.lengthSq() < 1e-8) out.set(0, 0, -1);
    return out.normalize();
  };

  // scan times per sample, as a texture the point shader reads
  const rows = Math.ceil(samples.length / ROW);
  const times = new Float32Array(rows * ROW).fill(1e9);
  const timesTex = new THREE.DataTexture(times, ROW, rows, THREE.RedFormat, THREE.FloatType);
  timesTex.magFilter = timesTex.minFilter = THREE.NearestFilter;
  timesTex.needsUpdate = true;
  /** A scan: everything within range of the path flown so far gets this moment as its scan time. */
  const scanTo = (km: number, time: number) => {
    const k = Math.round(km / STEP);
    for (let i = 0; i < samples.length; i++) times[i] = i <= k ? Math.min(times[i], time) : 1e9;
    timesTex.needsUpdate = true;
  };

  const group = new THREE.Group(); // everything here except the landmarks, so loop closure can move it
  const cloudMat = new THREE.ShaderMaterial({
    vertexShader: POINTS_VERT,
    fragmentShader: POINTS_FRAG,
    uniforms: { ...opt.scan, uTimes: { value: timesTex }, uRows: { value: rows }, uPx: { value: opt.pixelRatio } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  group.add(await buildCloud(tile, samples, opt.range, opt.perSide, cloudMat));

  const glow = (c: THREE.Color, k: number) => new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(k), side: THREE.DoubleSide });
  const RADIAL = 3;
  const trailCurve = new THREE.CatmullRomCurve3(samples, false, "catmullrom", 0);
  const trailMat = glow(opt.orange, 1.3);
  const trail = new THREE.Mesh(new THREE.TubeGeometry(trailCurve, samples.length - 1, 0.02, RADIAL, false), trailMat);
  group.add(trail);

  // a flat chevron, nose along +Z
  const chevron = new THREE.ShapeGeometry(
    new THREE.Shape([new THREE.Vector2(0, 0.5), new THREE.Vector2(0.36, -0.36), new THREE.Vector2(0, -0.14), new THREE.Vector2(-0.36, -0.36)]),
  ).rotateX(Math.PI / 2);
  const drone = new THREE.Mesh(chevron, glow(opt.orange, 1.35));
  drone.scale.setScalar(0.8);
  group.add(drone);

  const poseCount = Math.floor(length / POSE_EVERY);
  const poses = new THREE.InstancedMesh(chevron, glow(opt.orange, 0.9), poseCount);
  const o = new THREE.Object3D(), t = new THREE.Vector3();
  for (let i = 0; i < poseCount; i++) {
    const km = (i + 1) * POSE_EVERY;
    pointAt(km, o.position);
    o.lookAt(o.position.clone().add(tangentAt(km, t)));
    o.scale.setScalar(0.32);
    o.updateMatrix();
    poses.setMatrixAt(i, o.matrix);
  }
  poses.count = 0;
  group.add(poses);

  // a faint line from the drone straight down, so its altitude reads
  const dropGeo = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  const drop = new THREE.Line(dropGeo, new THREE.LineBasicMaterial({ color: 0xece6d6, transparent: true, opacity: 0.28 }));
  drop.frustumCulled = false;
  group.add(drop);

  const root = new THREE.Group();
  root.add(group);
  // one small diamond per landmark; only the stop being approached or held shows its diamond
  const markMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xece6d6).multiplyScalar(1.1) });
  const marks = new Map<number, THREE.Mesh>();
  for (const [k, lm] of landmarks) {
    if (!STOPS[k].landmark) continue;
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), markMat);
    m.position.copy(lm).y += 0.2;
    marks.set(k, m);
    root.add(m);
  }
  const showMark = (k: number) => marks.forEach((m, key) => (m.visible = key === k));

  // the first scan sample that reaches each landmark: from then on it is "detected"
  const detectAt = new Map<number, number>();
  for (const [k, lm] of landmarks) detectAt.set(k, samples.findIndex((s) => Math.hypot(s.x - lm.x, s.z - lm.z) <= opt.range * 0.8));

  /** Puts the drone, its trajectory and pose markers at a distance along the path. */
  const placeDrone = (km: number, D: THREE.Vector3, T: THREE.Vector3) => {
    pointAt(km, D);
    tangentAt(km, T);
    drone.position.copy(D);
    drone.lookAt(t.copy(D).add(T));
    const pos = dropGeo.attributes.position as THREE.BufferAttribute;
    pos.setXYZ(0, D.x, D.y, D.z);
    pos.setXYZ(1, D.x, ground(D.x, D.z), D.z);
    pos.needsUpdate = true;
    trail.geometry.setDrawRange(0, Math.floor(km / STEP) * RADIAL * 6);
    poses.count = Math.min(Math.floor(km / POSE_EVERY), poseCount);
  };

  return {
    name,
    root,
    group,
    tile,
    length,
    kmAt,
    stopKm,
    landmarks,
    detectAt,
    times,
    scanTo,
    placeDrone,
    showMark,
    ground,
    trailMat,
    cloudMat,
    span,
    shot: (k: number): StopShot | undefined => (span.stops.includes(k) ? STOPS[k] : undefined),
    points: (group.children[0] as THREE.Points).geometry.attributes.position.count,
    dispose: () => timesTex.dispose(),
  };
}
