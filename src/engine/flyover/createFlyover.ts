// The flyover renderer: a drone flies the route at dusk and its lidar scan reveals the real
// landscape (NASA Blue Marble on NOAA ETOPO relief). Two mapped legs (India, Boston) are joined by
// a flight over the globe; arriving in Boston closes the loop and the drifted map snaps into
// alignment. Motion is one continuous path: scrolling moves a target that the journey follows with
// damped inertia, the drone slows into each stop and holds briefly, and the camera eases from the
// chase view into an aerial overview of the stop. React owns the page around it (see FrameState).
import * as THREE from "three";
import { BloomEffect, EffectComposer, EffectPass, RenderPass, SMAAEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import type { Coords } from "@/content";
import { route } from "@/content";
import { EXAGGERATION, greatCircleKm, lockAt } from "@/lib/flyover";
import { clamp, damp, easeInOut, easeOut, lerp, smooth } from "../util";
import { buildGlobe } from "./globe";
import { buildLeg, type Leg } from "./leg";
import { LAST, STOPS, TRANSIT } from "./route";
import { POSITION_VERT, SKY_FRAG } from "./shaders";
import { loadImagery, loadTile } from "./terrain";

/** A point on screen for an HTML element pinned to the scene. */
export type Anchor = { id: string; x: number; y: number; visible: boolean };

/** What the HTML around the scene needs each frame. */
export type FrameState = {
  journey: number;
  phase: "india" | "transit" | "boston";
  /** the stop being approached or held (its landmark gets the reticle), or 0 */
  stop: number;
  anchors: Anchor[];
  /** the stop's landmark is within lidar range */
  detected: boolean;
  /** 0 to 1 while the reticle closes on the landmark */
  lock: number;
  /** 0 to 1 while the loop closes in Boston (1 once closed) */
  closure: number;
  drone: Coords;
  /** the HUD: altitude and height above ground (scene km), heading in degrees, and km per pixel */
  hud: { alt: number; agl: number; heading: number; kmPerPx: number };
  /** km flown on the way to Boston, during the transit */
  transitKm: number;
  /** 0 to 1: the brief navy fade that covers the switch between legs */
  veil: number;
};

export type FlyoverOptions = {
  labels: { id: string; coords: Coords; leg: "india" | "boston"; from: number; to: number }[];
  onBytes: (loaded: number, total: number) => void;
  onStage: (stage: "loading" | "preparing" | "ready") => void;
  onFrame: (s: FrameState) => void;
  /** Called when the panel for a stop should open (the drone is holding there), or 0 when it leaves. */
  onArrive: (stop: number) => void;
};

const PALETTE = {
  zenith: "#08111f",
  horizon: "#2e2d4a",
  ember: "#ff7a3a",
  land: "#0e1a2f",
  landLit: "#2f3350",
  deep: "#040a15",
  line: "#ffb38a",
  index: "#ffc8a3",
  coast: "#ff6a2b",
  orange: "#ff6a2b",
  white: "#ece6d6",
  rim: "#5a6fa8",
};
// The sun has just set in the west-north-west: an ember seam along the horizon, navy above.
const SUN = new THREE.Vector3(-1, -0.018, -0.32).normalize();
const RANGE = 30; // lidar range, km
const SCAN_EVERY = 0.3; // seconds between scans
const INERTIA = 5; // how quickly the journey catches up with scrolling (per second)
const HOLD = 0.12; // journey units around a stop where the drone holds and the panel shows
/** The chase camera, relative to the drone and its heading (km); scaled up when the drone flies high. */
const CHASE = { back: 13, side: 7, up: 7.5, ahead: 10 };
/** Loop closure: before it, the Boston map has drifted this much from the truth. */
const DRIFT = { angle: (2.6 * Math.PI) / 180, x: 1.7, z: -1.1 };
const CLOSE_SECONDS = 1.1;

const pause = (ms = 0) => new Promise((r) => setTimeout(r, ms));

export async function createFlyover(canvas: HTMLCanvasElement, opt: FlyoverOptions) {
  opt.onStage("loading");
  const progress = new Map<string, { loaded: number; total: number }>();
  const track = (key: string) => (loaded: number, total: number) => {
    progress.set(key, { loaded, total });
    let l = 0, t = 0;
    for (const p of progress.values()) (l += p.loaded), (t += p.total);
    opt.onBytes(l, t);
  };
  const [indiaTile, bostonTile, indiaImg, bostonImg, worldImg] = await Promise.all([
    loadTile("india", track("india")),
    loadTile("boston", track("boston")),
    loadImagery("india", track("img-india")),
    loadImagery("boston", track("img-boston")),
    loadImagery("world", track("img-world")),
  ]);
  opt.onStage("preparing");
  await pause(30); // let the loading line repaint before the build

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false, powerPreference: "high-performance" });
  let pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.zenith);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2400);
  const color = (hex: string) => new THREE.Color(hex);

  const uniforms = {
    uSun: { value: SUN },
    uZenith: { value: color(PALETTE.zenith) },
    uHorizon: { value: color(PALETTE.horizon) },
    uEmber: { value: color(PALETTE.ember) },
    uCam: { value: camera.position },
    uFog: { value: 1 / 300 },
    uDrone: { value: new THREE.Vector3() },
    uRange: { value: RANGE },
    uBeam: { value: 0 },
    uOrange: { value: color(PALETTE.orange) },
    uTime: { value: 0 },
    uExag: { value: EXAGGERATION },
    uLand: { value: color(PALETTE.land) },
    uLandLit: { value: color(PALETTE.landLit) },
    uDeep: { value: color(PALETTE.deep) },
    uLine: { value: color(PALETTE.line) },
    uIndex: { value: color(PALETTE.index).multiplyScalar(1.15) },
    uCoast: { value: color(PALETTE.coast).multiplyScalar(1.6) },
    uWhite: { value: color(PALETTE.white) },
  };

  // the dusk sky: a big sphere that follows the camera (hidden over the globe)
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(2000, 32, 16),
    new THREE.ShaderMaterial({ vertexShader: POSITION_VERT, fragmentShader: SKY_FRAG, uniforms, side: THREE.BackSide, depthWrite: false }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);

  // ---- the two mapped legs and the globe between them ----
  const legOpt = { range: RANGE, uniforms, orange: color(PALETTE.orange) };
  const india = await buildLeg("india", indiaTile, indiaImg, legOpt);
  await pause();
  const boston = await buildLeg("boston", bostonTile, bostonImg, legOpt);
  await pause();
  const globe = buildGlobe(worldImg, route[2].coords, route[3].coords, { white: color(PALETTE.white), orange: color(PALETTE.orange), rim: color(PALETTE.rim), cam: camera.position });
  const transitTotal = greatCircleKm(route[2].coords, route[3].coords);
  scene.add(india.root, boston.root, globe.root);

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

  // ---- post-processing: bloom on the glow, tone mapping, vignette, then SMAA ----
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.6, luminanceSmoothing: 0.25, intensity: 0.95, radius: 0.65 });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new EffectPass(camera, bloom, new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), new VignetteEffect({ offset: 0.3, darkness: 0.5 })));
  composer.addPass(new EffectPass(camera, new SMAAEffect()));

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    composer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // ---- journey state ----
  let journey = 0, target = 0;
  let auto: { from: number; to: number; t: number; dur: number } | null = null;
  let zoneStop = 0, zoneAt = -1, opened = 0;
  let closure = 0; // 1 once the loop has closed (kept while the drone stays in Boston)
  let lastScan = -1;

  const up = new THREE.Vector3(0, 1, 0);
  const D = new THREE.Vector3(), T = new THREE.Vector3(), right = new THREE.Vector3();
  const look = new THREE.Vector3(), cam = new THREE.Vector3(), tmp = new THREE.Vector3(), v = new THREE.Vector3();
  const holdCam = new THREE.Vector3(), holdLook = new THREE.Vector3(), side = new THREE.Vector3();
  let agl = 0;

  /** Camera and drone for a mapped leg at journey j. */
  const placeLeg = (leg: Leg, j: number, time: number) => {
    const km = leg.kmAt(j);
    leg.placeDrone(km, D, T);
    uniforms.uDrone.value.copy(D);
    right.crossVectors(T, up);
    // chase: behind the drone and off to its side, so the trajectory crosses the frame; further
    // back when the drone flies high. It starts high, looking down on the first scan.
    agl = D.y - leg.ground(D.x, D.z);
    const s = clamp(agl / 4.5, 1, 2.6);
    const start = leg.name === "india" ? 1 - smooth(0, 0.45, j) : 0;
    cam.copy(D).addScaledVector(T, -CHASE.back * s).addScaledVector(right, -CHASE.side * s).addScaledVector(up, CHASE.up * s * (1 + 0.9 * start));
    look.copy(D).addScaledVector(T, CHASE.ahead * s * (1 - 0.4 * start)).addScaledVector(up, -agl * (0.55 + 0.3 * (s - 1)));
    // near a stop, ease into its aerial overview: back along the approach, higher, stop left of centre
    const k = Math.round(j);
    if (leg.span.stops.includes(k)) {
      const w = easeInOut(1 - smooth(HOLD * 0.5, 0.45, Math.abs(j - k)));
      if (w > 0) {
        const shot = STOPS[k];
        const lm = leg.landmarks.get(k)!;
        const dir = leg.approach.get(k)!;
        side.crossVectors(dir, up);
        holdCam.copy(lm).addScaledVector(dir, -shot.back).addScaledVector(side, -shot.aim * 0.5).setY(lm.y + shot.up);
        holdLook.copy(lm).addScaledVector(side, shot.aim).setY(lm.y + 0.6);
        cam.lerp(holdCam, w);
        look.lerp(holdLook, w);
        const a = Math.sin(time * 0.08) * 0.05 * w; // a slow drift while holding
        v.copy(cam).sub(lm).applyAxisAngle(up, a);
        cam.copy(lm).add(v);
      }
    }
    camera.position.copy(cam);
    camera.lookAt(look);
    uniforms.uFog.value = 1 / (170 * clamp(agl / 6, 1, 3));
    return km;
  };

  const project = (p: THREE.Vector3, id: string): Anchor => {
    tmp.copy(p).project(camera);
    const visible = tmp.z < 1 && Math.abs(tmp.x) < 0.85 && Math.abs(tmp.y) < 0.85;
    return { id, x: ((tmp.x + 1) / 2) * canvas.clientWidth, y: ((1 - tmp.y) / 2) * canvas.clientHeight, visible };
  };
  const labelPoints = opt.labels.map((l) => {
    const leg = l.leg === "india" ? india : boston;
    const p = leg.tile.proj.toLocal(l.coords);
    return { ...l, legRef: leg, p: new THREE.Vector3(p.x, leg.ground(p.x, p.z) + 0.3, p.z) };
  });

  // ---- adaptive quality: drop bloom resolution, then pixel ratio, if frames run slow ----
  let quality = 2, slowFrames = 0, frames = 0;
  const stats = { fps: 0, quality, frameMs: 0, journey: 0, maxStep: 0, slowFrames: 0, frames: 0 };
  (window as unknown as { __flyStats: typeof stats }).__flyStats = stats;
  let fpsWindow = 0, fpsFrames = 0;

  const clock = new THREE.Timer();
  const frame = (now: number) => {
    clock.update(now);
    const dt = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsed();

    const before = journey;
    stats.frames++;
    if (dt > 1 / 40) stats.slowFrames++;
    if (auto) {
      // an eased flight along the path: the journey follows the curve exactly, no extra lag
      auto.t = Math.min(auto.t + dt / auto.dur, 1);
      journey = target = lerp(auto.from, auto.to, easeInOut(auto.t));
      if (auto.t >= 1) auto = null;
    } else {
      // scrolling: the journey glides after the target with damped inertia, the same both ways
      journey = damp(journey, target, INERTIA, dt);
      if (Math.abs(journey - target) < 1e-4) journey = target;
    }
    stats.maxStep = Math.max(stats.maxStep, Math.abs(journey - before));
    const j = (stats.journey = journey);
    uniforms.uTime.value = time;
    uniforms.uBeam.value = (time * Math.PI * 2) / 2.4; // one turn every 2.4 s

    const phase: FrameState["phase"] = j < TRANSIT.from ? "india" : j < TRANSIT.to ? "transit" : "boston";
    india.root.visible = phase === "india";
    globe.root.visible = phase === "transit";
    boston.root.visible = phase === "boston";
    sky.visible = phase !== "transit";
    scene.background = phase === "transit" ? uniforms.uZenith.value : null;

    let drone: Coords, transitKm = 0, heading = 0;
    const leg = phase === "india" ? india : phase === "boston" ? boston : null;
    if (leg) {
      const km = placeLeg(leg, j, time);
      if (time - lastScan >= SCAN_EVERY) {
        lastScan = time;
        leg.scanTo(km, time);
      }
      drone = leg.tile.proj.toCoords(D.x, D.z);
      heading = (Math.atan2(T.x, -T.z) * 180) / Math.PI;
    } else {
      const t = (j - TRANSIT.from) / (TRANSIT.to - TRANSIT.from);
      drone = globe.place(t, camera);
      transitKm = transitTotal * t;
      agl = 0;
    }

    // the stop being approached or held: its landmark gets the reticle; holding opens the panel
    const k = Math.round(j);
    const shot = leg?.shot(k);
    const stop = shot && j <= k + 0.2 ? k : 0;
    const detected = !!stop && shot!.landmark && leg!.times[leg!.detectAt.get(k)!] <= time;
    leg?.showMark(stop);
    const holding = !!shot && Math.abs(j - k) < HOLD;
    if (holding && zoneStop !== k) (zoneStop = k), (zoneAt = time);
    if (!holding && zoneStop) (zoneStop = 0), (zoneAt = -1);
    const since = zoneAt < 0 ? 0 : time - zoneAt;
    const lock = zoneStop && STOPS[zoneStop].landmark ? lockAt(since).lock : zoneStop ? 1 : 0;
    if (zoneStop === 4) closure = Math.max(closure, clamp((since - 0.6) / CLOSE_SECONDS, 0, 1));
    if (j < 3.9) closure = 0;
    if (zoneStop !== opened) opt.onArrive((opened = zoneStop));

    // before the loop closes, the Boston map drifts; at closure it snaps into place
    setDrift(smooth(TRANSIT.to, 3.97, j) * (1 - easeOut(closure)));
    boston.trailMat.color.copy(uniforms.uOrange.value).multiplyScalar(1.6 + (closure < 1 ? 0.9 * Math.sin(Math.PI * closure) : 0));

    sky.position.copy(camera.position);
    composer.render(dt);

    const lm = stop && leg ? leg.landmarks.get(stop)! : null;
    const anchors: Anchor[] = [lm ? project(tmp.copy(lm).setY(lm.y + 0.25), "landmark") : { id: "landmark", x: 0, y: 0, visible: false }];
    for (const lp of labelPoints) {
      const a = project(lp.p, lp.id);
      a.visible &&= lp.legRef === leg && j >= lp.from && j <= lp.to;
      anchors.push(a);
    }
    // the HUD's scale: km per pixel at the point the camera looks at
    const viewKm = 2 * camera.position.distanceTo(look) * Math.tan((camera.fov * Math.PI) / 360);
    const hud = { alt: leg ? D.y : 0, agl: leg ? agl : 0, heading: (heading + 360) % 360, kmPerPx: leg ? viewKm / canvas.clientHeight : 0 };
    const veil = Math.max(0, 1 - Math.abs(j - TRANSIT.from) / 0.03, 1 - Math.abs(j - TRANSIT.to) / 0.03);
    opt.onFrame({ journey: j, phase, stop, anchors, detected, lock, closure, drone, hud, transitKm, veil });

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
    for (const leg of [india, boston]) leg.root.traverse((o) => (o.frustumCulled = false));
    renderer.render(scene, camera);
    for (const leg of [india, boston]) leg.root.traverse((o) => (o.frustumCulled = !(o instanceof THREE.Line)));
    await pause();
  }
  composer.render(0);
  await pause();
  opt.onStage("ready");
  clock.connect(document); // pauses the clock while the tab is hidden
  renderer.setAnimationLoop(frame);

  return {
    /** Scroll and touch move the target; the journey glides after it. */
    nudge(delta: number) {
      if (auto) target = journey; // take over from an eased flight where it is
      auto = null;
      target = clamp(target + delta, 0, LAST);
    },
    /** An eased flight along the path to a journey position (buttons, keys and the rail). */
    flyTo(to: number) {
      const dist = Math.abs(to - journey);
      if (dist < 1e-3) return;
      const crosses = journey < TRANSIT.to !== to < TRANSIT.to;
      auto = { from: journey, to, t: 0, dur: Math.min(2.2 + 0.6 * Math.max(dist - 1, 0) + (crosses ? 2 : 0), 6) };
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
      for (const tex of [indiaImg, bostonImg, worldImg]) tex.dispose();
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
