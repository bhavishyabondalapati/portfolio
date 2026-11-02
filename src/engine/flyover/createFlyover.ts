// The flyover renderer, as a SLAM run: a drone flies the route and its lidar builds the map live.
// Off-white points are the map, orange is the live scan and the trajectory, the background is navy.
// Two mapped legs (India, Boston) are joined by a flight over a dotted globe; arriving in Boston
// closes the loop and the drifted map snaps into alignment. React owns the page around it; this
// reports what the HTML needs each frame (see FrameState).
import * as THREE from "three";
import { BloomEffect, EffectComposer, EffectPass, RenderPass, SMAAEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import type { Coords } from "@/content";
import { route } from "@/content";
import { EXAGGERATION, greatCircleKm, lockAt } from "@/lib/flyover";
import { clamp, damp, easeInOut, easeOut, lerp, smooth } from "../util";
import { buildGlobe } from "./globe";
import { buildLeg, heading, type Leg } from "./leg";
import { LAST, STOPS, TRANSIT } from "./route";
import { GRID_FRAG, POSITION_VERT } from "./shaders";
import { loadTile } from "./terrain";

/** A point on screen for an HTML element pinned to the scene. */
export type Anchor = { id: string; x: number; y: number; visible: boolean };

/** What the HTML around the scene needs each frame. */
export type FrameState = {
  journey: number;
  phase: "india" | "transit" | "boston";
  /** the stop the reticle is on (approaching or holding), or 0 */
  stop: number;
  anchors: Anchor[];
  /** the stop's landmark is within lidar range */
  detected: boolean;
  /** 0 to 1 while the reticle closes on the landmark */
  lock: number;
  /** 0 to 1 while the loop closes in Boston (1 once closed) */
  closure: number;
  drone: Coords;
  /** km flown on the way to Boston, during the transit */
  transitKm: number;
  /** 0 to 1: the navy veil that hides the switch between legs */
  veil: number;
};

export type FlyoverOptions = {
  labels: { id: string; coords: Coords; leg: "india" | "boston"; from: number; to: number }[];
  onBytes: (loaded: number, total: number) => void;
  onStage: (stage: "loading" | "preparing" | "ready") => void;
  onFrame: (s: FrameState) => void;
  /** Called when the panel for a stop should open (its lock has finished), or 0 when the drone leaves. */
  onArrive: (stop: number) => void;
};

const PALETTE = { navy: "#0a1426", white: "#ece6d6", orange: "#ff6a2b" };
const RANGE = 30; // lidar range, km
const SCAN_EVERY = 0.3; // seconds between scans
/** The chase camera, relative to the drone and its heading (km); scaled up when the drone flies high. */
const CHASE = { back: 13, side: 8, up: 7.5, ahead: 10 };
/** Loop closure: before it, the Boston map has drifted this much from the truth. */
const DRIFT = { angle: (2.6 * Math.PI) / 180, x: 1.7, z: -1.1 };
const CLOSE_SECONDS = 1.1;

const pause = (ms = 0) => new Promise((r) => setTimeout(r, ms));

export async function createFlyover(canvas: HTMLCanvasElement, opt: FlyoverOptions) {
  opt.onStage("loading");
  const names = ["india", "world", "boston"] as const;
  const progress = names.map(() => ({ loaded: 0, total: 0 }));
  const report = () => opt.onBytes(progress.reduce((s, p) => s + p.loaded, 0), progress.reduce((s, p) => s + p.total, 0));
  const [indiaTile, worldTile, bostonTile] = await Promise.all(
    names.map((n, i) =>
      loadTile(n, (loaded, total) => {
        progress[i] = { loaded, total };
        report();
      }),
    ),
  );
  opt.onStage("preparing");
  await pause(30); // let the loading line repaint before the build

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false, powerPreference: "high-performance" });
  let pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.navy);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1500);
  const color = (hex: string) => new THREE.Color(hex);

  const scan = {
    uDrone: { value: new THREE.Vector3() },
    uRange: { value: RANGE },
    uBeam: { value: 0 },
    uCam: { value: camera.position },
    uFog: { value: 1 / 150 },
    uOrange: { value: color(PALETTE.orange) },
    uWhite: { value: color(PALETTE.white) },
    uTime: { value: 0 },
    uExag: { value: EXAGGERATION },
  };

  // ---- the two mapped legs and the globe between them ----
  const legOpt = { range: RANGE, scan, orange: color(PALETTE.orange), pixelRatio };
  const india = await buildLeg("india", indiaTile, { ...legOpt, perSide: 4 });
  await pause();
  const boston = await buildLeg("boston", bostonTile, { ...legOpt, perSide: 4 });
  await pause();
  const globe = buildGlobe(worldTile, route[2].coords, route[3].coords, {
    white: color(PALETTE.white),
    orange: color(PALETTE.orange),
    navy: color(PALETTE.navy),
    pixelRatio,
    cam: camera.position,
  });
  const transitTotal = greatCircleKm(route[2].coords, route[3].coords);
  scene.add(india.root, boston.root, globe.root);

  // a faint reference grid at sea level under each leg, like the floor grid in RViz
  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({ vertexShader: POSITION_VERT, fragmentShader: GRID_FRAG, uniforms: scan, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  grid.renderOrder = -1;
  scene.add(grid);

  // loop closure moves the Boston map (not its landmarks) about the campus
  const pivot = boston.landmarks.get(4)!;
  boston.group.matrixAutoUpdate = false;
  const rot = new THREE.Matrix4(), shift = new THREE.Matrix4();
  const setDrift = (d: number) => {
    boston.group.matrix
      .makeTranslation(pivot.x, 0, pivot.z)
      .multiply(rot.makeRotationY(DRIFT.angle * d))
      .multiply(shift.makeTranslation(-pivot.x + DRIFT.x * d, 0, -pivot.z + DRIFT.z * d));
    boston.group.matrixWorldNeedsUpdate = true;
  };

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
    for (const leg of [india, boston]) leg.cloudMat.uniforms.uPx.value = pixelRatio;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // ---- journey state ----
  let journey = 0, target = 0;
  let auto: { from: number; to: number; t: number; dur: number } | null = null;
  let arrivedStop = 0, arrivedAt = -1, opened = 0;
  let closure = 0; // 1 once the loop has closed (kept while the drone stays in Boston)
  let lastScan = -1;

  const up = new THREE.Vector3(0, 1, 0);
  const D = new THREE.Vector3(), T = new THREE.Vector3(), right = new THREE.Vector3();
  const look = new THREE.Vector3(), cam = new THREE.Vector3(), tmp = new THREE.Vector3(), v = new THREE.Vector3();
  const holdCam = new THREE.Vector3(), holdLook = new THREE.Vector3();

  /** The hold framing for a stop: camera position and look target. */
  const framing = (leg: Leg, k: number) => {
    const s = STOPS[k];
    const lm = leg.landmarks.get(k)!;
    const dir = heading(s.bearing);
    right.crossVectors(dir, up);
    holdCam.copy(lm).addScaledVector(dir, -s.dist).setY(lm.y + s.up);
    holdLook.copy(lm).addScaledVector(right, s.aim * (s.panel === "right" ? 1 : -1)).setY(lm.y + 0.8);
  };

  /** Camera and drone for a mapped leg at journey j. */
  const placeLeg = (leg: Leg, j: number, time: number) => {
    const km = leg.kmAt(j);
    leg.placeDrone(km, D, T);
    scan.uDrone.value.copy(D);
    right.crossVectors(T, up);
    // chase: behind the drone and off to its left, so the trajectory crosses the frame; further
    // back when the drone flies high. It starts high, looking down on the first scan.
    const above = D.y - leg.ground(D.x, D.z);
    const s = clamp(above / 4.5, 1, 2.1);
    const start = leg.name === "india" ? 1 - smooth(0, 0.45, j) : 0;
    cam.copy(D).addScaledVector(T, -CHASE.back * s).addScaledVector(right, -CHASE.side * s).addScaledVector(up, CHASE.up * s * (1 + 0.9 * start));
    // when cruising high, look further down at the map being built
    look.copy(D).addScaledVector(T, CHASE.ahead * s * (1 - 0.4 * start)).addScaledVector(up, -above * (0.55 + 0.4 * (s - 1)));
    // near a stop, swing round to its hold framing
    const k = Math.round(j);
    if (leg.span.stops.includes(k)) {
      const w = easeInOut(1 - smooth(0, 0.38, Math.abs(j - k)));
      if (w > 0) {
        framing(leg, k);
        cam.lerp(holdCam, w);
        look.lerp(holdLook, w);
        const lm = leg.landmarks.get(k)!;
        const a = Math.sin(time * 0.08) * 0.06 * w; // a slow drift while holding
        v.copy(cam).sub(lm).applyAxisAngle(up, a);
        cam.copy(lm).add(v);
      }
    }
    camera.position.copy(cam);
    camera.lookAt(look);
    scan.uFog.value = 1 / (150 * clamp(above / 6, 1, 2.5));
    return km;
  };

  const project = (p: THREE.Vector3, id: string): Anchor => {
    tmp.copy(p).project(camera);
    const visible = tmp.z < 1 && Math.abs(tmp.x) < 0.82 && Math.abs(tmp.y) < 0.85;
    return { id, x: ((tmp.x + 1) / 2) * canvas.clientWidth, y: ((1 - tmp.y) / 2) * canvas.clientHeight, visible };
  };
  const labelPoints = opt.labels.map((l) => {
    const leg = l.leg === "india" ? india : boston;
    const p = leg.tile.proj.toLocal(l.coords);
    return { ...l, legRef: leg, p: new THREE.Vector3(p.x, leg.ground(p.x, p.z) + 0.3, p.z) };
  });

  // ---- adaptive quality: drop bloom resolution, then pixel ratio, if frames run slow ----
  let quality = 2, slowFrames = 0, frames = 0;
  const stats = { fps: 0, quality, frameMs: 0, points: india.points + boston.points + globe.dots, journey: 0 };
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
    const j = (stats.journey = journey);
    scan.uTime.value = time;
    scan.uBeam.value = (time * Math.PI * 2) / 2.4; // one turn every 2.4 s

    const phase: FrameState["phase"] = j < TRANSIT.from ? "india" : j < TRANSIT.to ? "transit" : "boston";
    india.root.visible = phase === "india";
    globe.root.visible = phase === "transit";
    boston.root.visible = phase === "boston";
    grid.visible = phase !== "transit";

    let drone: Coords, transitKm = 0;
    const leg = phase === "india" ? india : phase === "boston" ? boston : null;
    if (leg) {
      const km = placeLeg(leg, j, time);
      if (time - lastScan >= SCAN_EVERY) {
        lastScan = time;
        leg.scanTo(km, time);
      }
      drone = leg.tile.proj.toCoords(D.x, D.z);
    } else {
      const t = (j - TRANSIT.from) / (TRANSIT.to - TRANSIT.from);
      drone = globe.place(easeInOut(t), camera);
      transitKm = transitTotal * easeInOut(t);
    }

    // which stop the reticle is on: the nearest one, while approaching it or holding there
    const k = Math.round(j);
    const shot = leg?.shot(k);
    const stop = shot && j <= k + 0.12 ? k : 0;
    const detected = !!stop && shot!.landmark && leg!.times[leg!.detectAt.get(k)!] <= time;
    leg?.showMark(stop);

    // arrival: lock on, close the loop in Boston, then open the panel
    if (stop && Math.abs(j - k) < 0.012 && arrivedStop !== k) {
      arrivedStop = k;
      arrivedAt = time;
    }
    if (arrivedStop && Math.abs(j - arrivedStop) > 0.06) {
      arrivedStop = 0;
      arrivedAt = -1;
    }
    const since = arrivedAt < 0 ? 0 : time - arrivedAt;
    const lock = arrivedStop && STOPS[arrivedStop].landmark ? lockAt(since).lock : arrivedStop ? 1 : 0;
    if (arrivedStop === 4) closure = Math.max(closure, clamp((since - 0.9) / CLOSE_SECONDS, 0, 1));
    if (j < 3.9) closure = 0;
    const ready = arrivedStop === 4 ? closure >= 1 : arrivedStop > 0 && (!STOPS[arrivedStop].landmark || lock >= 1);
    const want = ready ? arrivedStop : 0;
    if (want !== opened) opt.onArrive((opened = want));

    // before the loop closes, the Boston map drifts; at closure it snaps into place
    setDrift(smooth(TRANSIT.to, 3.97, j) * (1 - easeOut(closure)));
    boston.trailMat.color.copy(scan.uOrange.value).multiplyScalar(1.3 + (closure < 1 ? 0.9 * Math.sin(Math.PI * closure) : 0));

    composer.render(dt);

    const lm = stop && leg ? leg.landmarks.get(stop)! : null;
    const anchors: Anchor[] = [lm ? project(tmp.copy(lm).setY(lm.y + 0.2), "landmark") : { id: "landmark", x: 0, y: 0, visible: false }];
    for (const lp of labelPoints) {
      const a = project(lp.p, lp.id);
      a.visible &&= lp.legRef === leg && j >= lp.from && j <= lp.to;
      anchors.push(a);
    }
    const veil = Math.max(0, 1 - Math.abs(j - TRANSIT.from) / 0.05, 1 - Math.abs(j - TRANSIT.to) / 0.05);
    opt.onFrame({ journey: j, phase, stop, anchors, detected, lock, closure, drone, transitKm, veil });

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

  // Compile every shader and upload each scene before the first visible frame, one at a time
  // with a pause between them, so no single step blocks the page for long.
  placeLeg(india, 0, 0);
  india.scanTo(0, 0);
  await renderer.compileAsync(scene, camera);
  for (const shown of [globe.root, boston.root, india.root]) {
    india.root.visible = boston.root.visible = globe.root.visible = false;
    shown.visible = true;
    renderer.render(scene, camera);
    await pause();
  }
  composer.render(0);
  await pause();
  opt.onStage("ready");
  clock.connect(document); // pauses the clock while the tab is hidden
  renderer.setAnimationLoop(frame);

  return {
    /** Scroll and touch move the drone by a fraction of the journey. */
    nudge(delta: number) {
      auto = null;
      target = clamp(target + delta, 0, LAST);
    },
    /** Fly to a journey position with an eased glide (for buttons, keys and the route rail). */
    flyTo(to: number) {
      const dist = Math.abs(to - journey);
      if (dist < 1e-3) return;
      const crosses = journey < TRANSIT.to !== to < TRANSIT.to;
      auto = { from: journey, to, t: 0, dur: Math.min(2.5 + 5.5 * Math.min(dist, 1) + 1.2 * Math.max(dist - 1, 0) + (crosses ? 5 : 0), 16) };
    },
    get journey() {
      return journey;
    },
    dispose() {
      renderer.setAnimationLoop(null);
      clock.dispose();
      ro.disconnect();
      composer.dispose();
      india.dispose();
      boston.dispose();
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
