// The flyover renderer, as a SLAM run: a drone flies the route and its lidar builds the map live.
// Off-white points are the map, orange is the live scan and the trajectory, the background is navy.
// React owns the page around it; this reports screen positions for the HTML labels and panel.
//
// Slice 1 flies from off the Coromandel coast (journey 0) to SRM, Kattankulathur (journey 1).
import * as THREE from "three";
import { BloomEffect, EffectComposer, EffectPass, RenderPass, SMAAEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import type { Coords } from "@/content";
import { EXAGGERATION, lockAt } from "@/lib/flyover";
import { clamp, damp, easeInOut, lerp, smooth } from "../util";
import { GRID_FRAG, POINTS_FRAG, POINTS_VERT, POSITION_VERT } from "./shaders";
import { buildCloud, heightAt, loadTile } from "./terrain";

/** A point on screen for an HTML element pinned to the scene. */
export type Anchor = { id: string; x: number; y: number; visible: boolean };

/** What the HTML around the scene needs each frame. */
export type FrameState = {
  journey: number;
  anchors: Anchor[];
  /** the landmark is within lidar range */
  detected: boolean;
  /** 0 to 1 while the reticle closes on the landmark */
  lock: number;
  drone: Coords;
};

export type FlyoverOptions = {
  landmark: Coords;
  /** Map labels drawn as HTML, shown between two journey positions. */
  labels: { id: string; coords: Coords; from: number; to: number }[];
  onBytes: (loaded: number, total: number) => void;
  onStage: (stage: "loading" | "preparing" | "ready") => void;
  onFrame: (s: FrameState) => void;
  /** Called when the landmark lock finishes (true) or the drone leaves the stop (false). */
  onArrive: (arrived: boolean) => void;
};

const PALETTE = { navy: "#0a1426", white: "#ece6d6", orange: "#ff6a2b" };

/** The drone's flight: where it is and how high (km), in from the Bay of Bengal over the coast. */
const FLIGHT: { at: Coords; alt: number }[] = [
  { at: { lat: 13.0, lon: 80.45 }, alt: 6.5 },
  { at: { lat: 12.95, lon: 80.3 }, alt: 5.6 },
  { at: { lat: 12.89, lon: 80.15 }, alt: 4.6 },
];
/** The hover, relative to the landmark: km east, km north and km up. */
const HOVER = { east: 1.5, north: 2.6, up: 3.4 };
/**
 * The hold at the stop: the camera north of the landmark looking south, so the coast recedes on
 * the left and the panel can sit over the sea. `aim` shifts the view east of the landmark (km),
 * which puts the landmark right of centre.
 */
const HOLD = { east: 7, north: 30, up: 13, aim: 6 };
const RANGE = 30; // lidar range, km
const STEP = 0.5; // km between path samples (and between possible scans)
const SCAN_EVERY = 0.3; // seconds between scans
/** The chase camera, relative to the drone and its heading (km). */
const CHASE = { back: 13, side: 8, up: 7.5, ahead: 10 };

const pause = (ms = 0) => new Promise((r) => setTimeout(r, ms));

export async function createFlyover(canvas: HTMLCanvasElement, opt: FlyoverOptions) {
  opt.onStage("loading");
  const tile = await loadTile("india", opt.onBytes);
  opt.onStage("preparing");
  await pause(30); // let the loading line repaint before the build

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false, powerPreference: "high-performance" });
  let pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(PALETTE.navy);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.navy);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1200);
  const color = (hex: string) => new THREE.Color(hex);

  // ---- the flight path ----
  const local = (c: Coords, alt: number) => {
    const p = tile.proj.toLocal(c);
    return new THREE.Vector3(p.x, alt, p.z);
  };
  const lm = tile.proj.toLocal(opt.landmark);
  const landmark = new THREE.Vector3(lm.x, heightAt(tile, lm.x, lm.z), lm.z);
  const hover = new THREE.Vector3(lm.x + HOVER.east, HOVER.up, lm.z - HOVER.north);
  const holdCam = new THREE.Vector3(lm.x + HOLD.east, landmark.y + HOLD.up, lm.z - HOLD.north);
  const holdLook = landmark.clone().add(new THREE.Vector3(HOLD.aim, 0.8, 0));
  const flight = new THREE.CatmullRomCurve3([...FLIGHT.map((f) => local(f.at, f.alt)), hover], false, "centripetal");
  const length = flight.getLength();
  const samples = Array.from({ length: Math.floor(length / STEP) + 1 }, (_, i) => flight.getPointAt(Math.min((i * STEP) / length, 1)));

  // ---- scan times: when each stretch of the flight was scanned (seconds), or never (1e9) ----
  const times = new Float32Array(samples.length).fill(1e9);
  const timesTex = new THREE.DataTexture(times, samples.length, 1, THREE.RedFormat, THREE.FloatType);
  timesTex.magFilter = timesTex.minFilter = THREE.NearestFilter;
  timesTex.needsUpdate = true;

  const scan = {
    uDrone: { value: new THREE.Vector3() },
    uRange: { value: RANGE },
    uBeam: { value: 0 },
    uCam: { value: camera.position },
    uFog: { value: 1 / 150 },
    uOrange: { value: color(PALETTE.orange) },
    uWhite: { value: color(PALETTE.white) },
  };

  // ---- the map: lidar returns along the flight ----
  const cloudMat = new THREE.ShaderMaterial({
    vertexShader: POINTS_VERT,
    fragmentShader: POINTS_FRAG,
    uniforms: {
      ...scan,
      uTimes: { value: timesTex },
      uSteps: { value: samples.length },
      uStep: { value: STEP },
      uTime: { value: 0 },
      uExag: { value: EXAGGERATION },
      uPx: { value: pixelRatio },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const cloud = buildCloud(tile, samples, STEP, RANGE, cloudMat);
  scene.add(cloud);

  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({ vertexShader: POSITION_VERT, fragmentShader: GRID_FRAG, uniforms: scan, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  grid.renderOrder = -1;
  scene.add(grid);

  // ---- the trajectory, pose markers, the drone and the landmark ----
  const glow = (hex: string, k: number) => new THREE.MeshBasicMaterial({ color: color(hex).multiplyScalar(k), side: THREE.DoubleSide });
  const SEGMENTS = 400, RADIAL = 3;
  const trail = new THREE.Mesh(new THREE.TubeGeometry(flight, SEGMENTS, 0.02, RADIAL, false), glow(PALETTE.orange, 1.3));
  scene.add(trail);

  // a flat chevron, nose along +Z
  const chevron = new THREE.ShapeGeometry(
    new THREE.Shape([new THREE.Vector2(0, 0.5), new THREE.Vector2(0.36, -0.36), new THREE.Vector2(0, -0.14), new THREE.Vector2(-0.36, -0.36)]),
  ).rotateX(Math.PI / 2);
  const drone = new THREE.Mesh(chevron, glow(PALETTE.orange, 1.35));
  drone.scale.setScalar(0.8);
  scene.add(drone);

  const POSE_EVERY = 3; // km
  const poseCount = Math.floor(length / POSE_EVERY);
  const poses = new THREE.InstancedMesh(chevron, glow(PALETTE.orange, 0.9), poseCount);
  const o = new THREE.Object3D();
  for (let i = 0; i < poseCount; i++) {
    const t = ((i + 1) * POSE_EVERY) / length;
    o.position.copy(flight.getPointAt(t));
    o.lookAt(o.position.clone().add(flight.getTangentAt(t)));
    o.scale.setScalar(0.32);
    o.updateMatrix();
    poses.setMatrixAt(i, o.matrix);
  }
  poses.count = 0;
  scene.add(poses);

  // a faint line from the drone straight down, so its altitude reads
  const dropGeo = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  const drop = new THREE.Line(dropGeo, new THREE.LineBasicMaterial({ color: color(PALETTE.white), transparent: true, opacity: 0.28 }));
  drop.frustumCulled = false;
  scene.add(drop);

  const mark = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), glow(PALETTE.white, 1.1));
  mark.position.copy(landmark).y += 0.2;
  scene.add(mark);

  // the first scan sample that reaches the landmark: from then on it is "detected"
  const detectAt = samples.findIndex((s) => Math.hypot(s.x - landmark.x, s.z - landmark.z) <= RANGE * 0.8);

  // ---- post-processing: a little bloom on the orange, tone mapping, vignette, then SMAA ----
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.85, luminanceSmoothing: 0.2, intensity: 0.9, radius: 0.6 });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new EffectPass(camera, bloom, new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), new VignetteEffect({ offset: 0.3, darkness: 0.45 })));
  composer.addPass(new EffectPass(camera, new SMAAEffect()));

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    composer.setSize(w, h, false);
    cloudMat.uniforms.uPx.value = pixelRatio;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // ---- journey state ----
  let journey = 0, target = 0;
  let auto: { from: number; to: number; t: number; dur: number } | null = null;
  let arrivedAt = -1, arrived = false;
  let lastScan = -1;

  const up = new THREE.Vector3(0, 1, 0);
  const D = new THREE.Vector3(), T = new THREE.Vector3(), right = new THREE.Vector3();
  const look = new THREE.Vector3(), tmp = new THREE.Vector3(), v = new THREE.Vector3();

  const place = (j: number, time: number) => {
    flight.getPointAt(j, D);
    flight.getTangentAt(j, T);
    T.y = 0;
    T.normalize();
    right.crossVectors(T, up);
    // chase: behind the drone and off to its left, so the trajectory crosses the frame
    // it starts high and looking down on the first scan, then settles in behind the drone
    const settle = smooth(0, 0.45, j);
    camera.position.copy(D).addScaledVector(T, -CHASE.back).addScaledVector(right, -CHASE.side).addScaledVector(up, lerp(CHASE.up * 1.9, CHASE.up, settle));
    look.copy(D).addScaledVector(T, lerp(CHASE.ahead * 0.6, CHASE.ahead, settle)).addScaledVector(up, -D.y * 0.55);
    // at the stop, swing round to the hold: north of the landmark, looking south
    const hold = easeInOut(smooth(0.62, 1, j));
    if (hold > 0) {
      camera.position.lerp(holdCam, hold);
      look.lerp(holdLook, hold);
      const a = Math.sin(time * 0.08) * 0.06 * hold; // a slow drift while holding
      v.copy(camera.position).sub(landmark).applyAxisAngle(up, a);
      camera.position.copy(landmark).add(v);
    }
    camera.lookAt(look);

    drone.position.copy(D);
    drone.lookAt(tmp.copy(D).add(T));
    scan.uDrone.value.copy(D);
    const pos = dropGeo.attributes.position as THREE.BufferAttribute;
    pos.setXYZ(0, D.x, D.y, D.z);
    pos.setXYZ(1, D.x, Math.max(heightAt(tile, D.x, D.z), 0), D.z);
    pos.needsUpdate = true;
    trail.geometry.setDrawRange(0, Math.floor(j * SEGMENTS) * RADIAL * 6);
    poses.count = Math.min(Math.floor((j * length) / POSE_EVERY), poseCount);
  };

  /** A scan: everything within range of the flight so far gets this moment as its scan time. */
  const scanNow = (time: number) => {
    const k = Math.round((journey * length) / STEP);
    for (let i = 0; i < times.length; i++) times[i] = i <= k ? Math.min(times[i], time) : 1e9;
    timesTex.needsUpdate = true;
  };

  const project = (p: THREE.Vector3, id: string): Anchor => {
    tmp.copy(p).project(camera);
    const visible = tmp.z < 1 && Math.abs(tmp.x) < 0.82 && Math.abs(tmp.y) < 0.85;
    return { id, x: ((tmp.x + 1) / 2) * canvas.clientWidth, y: ((1 - tmp.y) / 2) * canvas.clientHeight, visible };
  };
  const labelPoints = opt.labels.map((l) => {
    const p = tile.proj.toLocal(l.coords);
    return { ...l, p: new THREE.Vector3(p.x, Math.max(heightAt(tile, p.x, p.z), 0) + 0.3, p.z) };
  });

  // ---- adaptive quality: drop bloom resolution, then pixel ratio, if frames run slow ----
  let quality = 2, slowFrames = 0, frames = 0;
  const stats = { fps: 0, quality, frameMs: 0, points: cloud.geometry.attributes.position.count };
  (window as unknown as { __flyStats: typeof stats }).__flyStats = stats;
  let fpsWindow = 0, fpsFrames = 0;

  const clock = new THREE.Timer();
  const frame = (now: number) => {
    clock.update(now);
    const dt = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsed();

    if (auto) {
      auto.t = Math.min(auto.t + dt / auto.dur, 1);
      target = lerp(auto.from, auto.to, easeInOut(auto.t));
      if (auto.t >= 1) auto = null;
    }
    journey = damp(journey, target, auto ? 8 : 3.2, dt);
    if (Math.abs(journey - target) < 1e-4) journey = target;
    place(journey, time);

    if (time - lastScan >= SCAN_EVERY) {
      lastScan = time;
      scanNow(time);
    }
    cloudMat.uniforms.uTime.value = time;
    scan.uBeam.value = (time * Math.PI * 2) / 2.4; // one turn every 2.4 s

    if (journey > 0.985 && arrivedAt < 0) arrivedAt = time;
    if (journey < 0.9 && arrivedAt >= 0) {
      arrivedAt = -1;
      if (arrived) opt.onArrive((arrived = false));
    }
    const l = lockAt(arrivedAt < 0 ? 0 : time - arrivedAt);
    if (l.done && !arrived) opt.onArrive((arrived = true));

    composer.render(dt);

    const anchors = [project(tmp.copy(landmark).setY(landmark.y + 0.2), "landmark")];
    for (const lp of labelPoints) {
      const a = project(lp.p, lp.id);
      a.visible &&= journey >= lp.from && journey <= lp.to;
      anchors.push(a);
    }
    opt.onFrame({ journey, anchors, detected: detectAt >= 0 && times[detectAt] <= time, lock: l.lock, drone: tile.proj.toCoords(D.x, D.z) });

    fpsWindow += dt;
    fpsFrames++;
    if (fpsWindow >= 1) {
      stats.fps = Math.round(fpsFrames / fpsWindow);
      stats.frameMs = +((fpsWindow / fpsFrames) * 1000).toFixed(1);
      fpsWindow = fpsFrames = 0;
    }
    if (++frames > 90 && quality > 0) {
      slowFrames = dt > 1 / 45 ? slowFrames + 1 : Math.max(slowFrames - 1, 0);
      if (slowFrames > 45) {
        quality--;
        slowFrames = 0;
        if (quality === 1) bloom.resolution.scale = 0.5;
        if (quality === 0) {
          pixelRatio = 1;
          resize();
        }
        stats.quality = quality;
      }
    }
  };

  // Compile every shader and upload the map before the first visible frame, in steps with a pause
  // between them, so no single step blocks the page for long (Firefox compiles on first draw).
  place(0, 0);
  scanNow(0);
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera);
  await pause();
  composer.render(0);
  await pause();
  opt.onStage("ready");
  clock.connect(document); // pauses the clock while the tab is hidden
  renderer.setAnimationLoop(frame);

  return {
    /** Scroll and touch move the drone by a fraction of the journey. */
    nudge(delta: number) {
      auto = null;
      target = clamp(target + delta, 0, 1);
    },
    /** Fly to a journey position with an eased glide (for buttons and keys). */
    flyTo(to: number) {
      const dist = Math.abs(to - journey);
      if (dist < 1e-3) return;
      auto = { from: journey, to, t: 0, dur: lerp(2.5, 8, dist) };
    },
    get journey() {
      return journey;
    },
    dispose() {
      renderer.setAnimationLoop(null);
      clock.dispose();
      ro.disconnect();
      composer.dispose();
      timesTex.dispose();
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose?.();
      });
      renderer.dispose();
    },
  };
}

export type Flyover = Awaited<ReturnType<typeof createFlyover>>;
