// One mapped leg of the flight (India or Boston): the drone's path over a terrain tile, the terrain
// its scan reveals, its trajectory with pose markers, and the landmarks at its stops.
import * as THREE from "three";
import type { Coords } from "@/content";
import { dwellEase } from "@/lib/flyover";
import { LEG_SPAN, PATHS, STOPS, type LegName, type StopShot } from "./route";
import { TERRAIN_FRAG, TERRAIN_VERT } from "./shaders";
import { buildTerrain, heightAt, type Tile } from "./terrain";

export const STEP = 0.5; // km between path samples
const ROW = 1024; // scan-time texels per row
const POSE_EVERY = 3; // km between pose markers

export type Leg = Awaited<ReturnType<typeof buildLeg>>;

export async function buildLeg(
  name: LegName,
  tile: Tile,
  image: THREE.Texture,
  opt: { range: number; uniforms: Record<string, THREE.IUniform>; orange: THREE.Color },
) {
  const local = (c: Coords, alt: number) => {
    const p = tile.proj.toLocal(c);
    return new THREE.Vector3(p.x, alt, p.z);
  };
  const ground = (x: number, z: number) => heightAt(tile, x, z);
  const span = LEG_SPAN[name];

  // landmarks, the direction the drone approaches each from, and where it hovers
  const landmarks = new Map<number, THREE.Vector3>();
  const approach = new Map<number, THREE.Vector3>();
  const controls: THREE.Vector3[] = [];
  for (const e of PATHS[name]) {
    if (!("stop" in e)) {
      controls.push(local(e.at, e.alt));
      continue;
    }
    const s = STOPS[e.stop];
    const p = tile.proj.toLocal(s.at);
    const lm = new THREE.Vector3(p.x, ground(p.x, p.z), p.z);
    const prev = controls[controls.length - 1];
    const dir = new THREE.Vector3(lm.x - prev.x, 0, lm.z - prev.z).normalize();
    // hover a little short of the stop, so the drone faces it
    const h = lm.clone().addScaledVector(dir, -2);
    h.y = ground(h.x, h.z) + s.hover;
    landmarks.set(e.stop, lm);
    approach.set(e.stop, dir);
    controls.push(h);
  }

  // the path: a smooth curve through the waypoints, sampled every STEP km, kept above the ground
  const curve = new THREE.CatmullRomCurve3(controls, false, "centripetal");
  const raw = curve.getLength();
  const samples: THREE.Vector3[] = [];
  for (let i = 0; i * STEP <= raw; i++) {
    const p = curve.getPointAt(Math.min((i * STEP) / raw, 1));
    p.y = Math.max(p.y, ground(p.x, p.z) + 1.4);
    samples.push(p);
  }
  const length = (samples.length - 1) * STEP;

  // the path distance (km) at each stop: the sample nearest its hover point, in order
  const stopKm = new Map<number, number>();
  let from = 0, ci = 0;
  for (const e of PATHS[name]) {
    ci++;
    if (!("stop" in e)) continue;
    const h = controls[ci - 1];
    let best = from, bestD = Infinity;
    for (let i = from; i < samples.length; i++) {
      const d = samples[i].distanceToSquared(h);
      if (d < bestD) (bestD = d), (best = i);
    }
    stopKm.set(e.stop, best * STEP);
    from = best;
  }

  // journey position to path distance: between keys, slowing into each stop and holding briefly
  type Key = { j: number; km: number; stop: boolean };
  const keys: Key[] = [{ j: span.start, km: 0, stop: false }, ...span.stops.map((k) => ({ j: k, km: stopKm.get(k)!, stop: true }))];
  if (span.end > span.stops[span.stops.length - 1]) keys.push({ j: span.end, km: length, stop: false });
  const kmAt = (j: number) => {
    if (j <= keys[0].j) return keys[0].km;
    for (let i = 1; i < keys.length; i++) {
      const b = keys[i];
      if (j <= b.j) {
        const a = keys[i - 1];
        // the hold is a fixed share of a journey unit, whatever the length of the stretch
        const hold = 0.12 / (b.j - a.j);
        return a.km + (b.km - a.km) * dwellEase((j - a.j) / (b.j - a.j), a.stop, b.stop, hold);
      }
    }
    return keys[keys.length - 1].km;
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

  // scan times per sample, as a texture the terrain shader reads
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

  const { lat, lon } = tile.proj.toCoords(0, 0);
  const terrainMat = new THREE.ShaderMaterial({
    vertexShader: TERRAIN_VERT,
    fragmentShader: TERRAIN_FRAG,
    uniforms: {
      ...opt.uniforms,
      uImage: { value: image },
      uTimes: { value: timesTex },
      uRows: { value: rows },
      uLat0: { value: lat },
      uLon0: { value: lon },
      uKx: { value: tile.proj.size.x / (tile.meta.east - tile.meta.west) },
      uKz: { value: tile.proj.size.z / (tile.meta.north - tile.meta.south) },
    },
  });

  const group = new THREE.Group(); // everything that loop closure moves (not the landmarks)
  group.add(await buildTerrain(tile, samples, opt.range, terrainMat));

  const glow = (c: THREE.Color, k: number) => new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(k), side: THREE.DoubleSide });
  const RADIAL = 3;
  const trailMat = glow(opt.orange, 1.6);
  const trail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(samples, false, "catmullrom", 0), samples.length - 1, 0.03, RADIAL, false), trailMat);
  group.add(trail);

  // a flat chevron, nose along +Z
  const chevron = new THREE.ShapeGeometry(
    new THREE.Shape([new THREE.Vector2(0, 0.5), new THREE.Vector2(0.36, -0.36), new THREE.Vector2(0, -0.14), new THREE.Vector2(-0.36, -0.36)]),
  ).rotateX(Math.PI / 2);
  const drone = new THREE.Mesh(chevron, glow(opt.orange, 1.8));
  drone.scale.setScalar(0.9);
  group.add(drone);

  const poseCount = Math.floor(length / POSE_EVERY);
  const poses = new THREE.InstancedMesh(chevron, glow(opt.orange, 1.0), poseCount);
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
  const drop = new THREE.Line(dropGeo, new THREE.LineBasicMaterial({ color: 0xece6d6, transparent: true, opacity: 0.35 }));
  drop.frustumCulled = false;
  group.add(drop);

  const root = new THREE.Group();
  root.add(group);
  // one small diamond per landmark; only the stop being approached or held shows its diamond
  const markMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xece6d6).multiplyScalar(1.2) });
  const marks = new Map<number, THREE.Mesh>();
  for (const [k, lm] of landmarks) {
    if (!STOPS[k].landmark) continue;
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), markMat);
    m.position.copy(lm).y += 0.25;
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
    approach,
    detectAt,
    times,
    scanTo,
    placeDrone,
    showMark,
    ground,
    trailMat,
    span,
    shot: (k: number): StopShot | undefined => (span.stops.includes(k) ? STOPS[k] : undefined),
    dispose: () => timesTex.dispose(),
  };
}
