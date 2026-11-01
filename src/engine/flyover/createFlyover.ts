// The flyover renderer: dusk sky, real terrain, a camera on a curve, the scan sweep at each stop,
// and screen positions for the HTML panels and labels. React owns the page around it.
//
// Slice 1 flies from the Bay of Bengal (journey 0) to SRM, Kattankulathur (journey 1).
import * as THREE from "three";
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from "postprocessing";
import type { Coords } from "@/content";
import { EXAGGERATION, sweepAt } from "@/lib/flyover";
import { clamp, damp, easeInOut, lerp, smooth } from "../util";
import { POSITION_VERT, SKY_FRAG, TERRAIN_FRAG, WATER_FRAG, WORLD_VERT } from "./shaders";
import { buildTerrain, heightAt, loadTile, type Tile } from "./terrain";

/** A point on screen for an HTML element pinned to the scene. */
export type Anchor = { id: string; x: number; y: number; visible: boolean };

export type FlyoverOptions = {
  marker: Coords;
  /** Map labels drawn as HTML, faded in between two journey positions. */
  labels: { id: string; coords: Coords; from: number; to: number }[];
  onBytes: (loaded: number, total: number) => void;
  onStage: (stage: "loading" | "preparing" | "ready") => void;
  onFrame: (journey: number, anchors: Anchor[]) => void;
  /** Called when the sweep at a stop finishes (true) or the camera leaves the stop (false). */
  onArrive: (arrived: boolean) => void;
};

const PALETTE = {
  zenith: "#08111f",
  horizon: "#2e2d4a",
  ember: "#ff7a3a",
  land: "#0e1a2f",
  landLit: "#2f3350",
  seaFloor: "#060d19",
  deep: "#040a15",
  line: "#ffb38a",
  index: "#ffc8a3",
  coast: "#ff6a2b",
  mask: "#ff6a2b",
};

// The sun has just set in the west-north-west, about a degree below the horizon: an ember seam
// along the horizon, deep navy above.
const SUN = new THREE.Vector3(-1, -0.018, -0.32).normalize();

/** Camera shots: where the camera is (with altitude in km) and what it looks at. */
const SHOTS: { at: Coords; alt: number; look: Coords; lookAlt: number }[] = [
  { at: { lat: 12.45, lon: 81.3 }, alt: 34, look: { lat: 13.15, lon: 79.6 }, lookAlt: 0 },
  { at: { lat: 12.58, lon: 80.9 }, alt: 23, look: { lat: 13.0, lon: 79.85 }, lookAlt: 0 },
  { at: { lat: 12.68, lon: 80.48 }, alt: 13, look: { lat: 12.86, lon: 80.02 }, lookAlt: 0 },
];
/** The hold at the stop, relative to the marker: km east, km south, km up. */
const HOLD = { east: 15, south: 25, up: 10 };

const pause = (ms = 0) => new Promise((r) => setTimeout(r, ms));

export async function createFlyover(canvas: HTMLCanvasElement, opt: FlyoverOptions) {
  opt.onStage("loading");
  const tile = await loadTile("india", opt.onBytes);
  opt.onStage("preparing");
  // let the loading line repaint before the build
  await pause(30);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false, powerPreference: "high-performance" });
  let pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(PALETTE.zenith);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2400);

  const color = (hex: string) => new THREE.Color(hex);
  const shared = {
    uSun: { value: SUN },
    uZenith: { value: color(PALETTE.zenith) },
    uHorizon: { value: color(PALETTE.horizon) },
    uEmber: { value: color(PALETTE.ember) },
    uCam: { value: camera.position },
    uFog: { value: 1 / 260 },
  };

  // sky: a big sphere that follows the camera
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(2000, 32, 16),
    new THREE.ShaderMaterial({ vertexShader: POSITION_VERT, fragmentShader: SKY_FRAG, uniforms: shared, side: THREE.BackSide, depthWrite: false }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);

  const marker = tile.proj.toLocal(opt.marker);
  const markerY = heightAt(tile, marker.x, marker.z);
  const terrainMat = new THREE.ShaderMaterial({
    vertexShader: WORLD_VERT,
    fragmentShader: TERRAIN_FRAG,
    uniforms: {
      ...shared,
      uExag: { value: EXAGGERATION },
      uLand: { value: color(PALETTE.land) },
      uLandLit: { value: color(PALETTE.landLit) },
      uSeaFloor: { value: color(PALETTE.seaFloor) },
      uLine: { value: color(PALETTE.line) },
      uIndex: { value: color(PALETTE.index).multiplyScalar(1.15) },
      uCoast: { value: color(PALETTE.coast).multiplyScalar(2.4) },
      uMask: { value: color(PALETTE.mask) },
      uMarker: { value: new THREE.Vector3(marker.x, markerY, marker.z) },
      uSweep: { value: 0 },
      uSettle: { value: 0 },
      uRadius: { value: 9 },
      uCell: { value: 0.7 },
    },
  });
  const terrain = buildTerrain(tile, terrainMat);
  scene.add(terrain);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      vertexShader: POSITION_VERT,
      fragmentShader: WATER_FRAG,
      uniforms: { ...shared, uDeep: { value: color(PALETTE.deep) } },
      transparent: true,
    }),
  );
  water.renderOrder = 1;
  scene.add(water);

  // the marker pin: a thin glowing mast with a diamond on top, rising out of the terrain
  const PIN = 3.2;
  const glow = (hex: string, k: number) => new THREE.MeshBasicMaterial({ color: color(hex).multiplyScalar(k), toneMapped: false });
  const pin = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, PIN, 6).translate(0, PIN / 2, 0), glow(PALETTE.line, 1.6));
  const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), glow(PALETTE.coast, 2.6));
  head.position.y = PIN;
  pin.add(mast, head);
  pin.position.set(marker.x, markerY, marker.z);
  scene.add(pin);

  // ---- the camera path ----
  const local = (c: Coords, alt: number) => {
    const p = tile.proj.toLocal(c);
    return new THREE.Vector3(p.x, alt, p.z);
  };
  const markerV = new THREE.Vector3(marker.x, markerY, marker.z);
  const holdPos = markerV.clone().add(new THREE.Vector3(HOLD.east, HOLD.up, HOLD.south));
  // look a little to the right of the marker, so it sits left of centre with room for the panel
  const toMarker = markerV.clone().sub(holdPos).normalize();
  const right = new THREE.Vector3().crossVectors(toMarker, new THREE.Vector3(0, 1, 0)).normalize();
  const holdLook = markerV.clone().addScaledVector(right, 7.5).add(new THREE.Vector3(0, 2.5, 0));
  const posCurve = new THREE.CatmullRomCurve3([...SHOTS.map((s) => local(s.at, s.alt)), holdPos], false, "centripetal");
  const lookCurve = new THREE.CatmullRomCurve3([...SHOTS.map((s) => local(s.look, s.lookAlt)), holdLook], false, "centripetal");

  // ---- post-processing: bloom on the glowing lines, tone mapping, vignette, then SMAA ----
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.55, luminanceSmoothing: 0.25, intensity: 1.15, radius: 0.7 });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(
    new EffectPass(camera, bloom, new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), new VignetteEffect({ offset: 0.28, darkness: 0.55 })),
  );
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
  let journey = 0; // where the camera is
  let target = 0; // where it is heading
  let auto: { from: number; to: number; t: number; dur: number } | null = null;
  let arrivedAt = -1; // clock time of arrival, or -1
  let arrived = false;

  const v = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3();
  const place = (j: number, time: number) => {
    posCurve.getPoint(j, camera.position);
    lookCurve.getPoint(j, look);
    // a slow drift around the marker while holding at the stop
    const hold = smooth(0.92, 1, j);
    if (hold > 0) {
      const a = Math.sin(time * 0.09) * 0.1 * hold;
      v.copy(camera.position).sub(markerV).applyAxisAngle(THREE.Object3D.DEFAULT_UP, a);
      camera.position.copy(markerV).add(v);
    }
    camera.lookAt(look);
    shared.uFog.value = lerp(1 / 340, 1 / 170, smooth(0.1, 0.95, j));
    pin.scale.set(1, Math.max(smooth(0.35, 0.85, j), 0.001), 1);
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
  const pinTop = markerV.clone().add(new THREE.Vector3(0, PIN, 0));

  // ---- adaptive quality: drop bloom resolution, then pixel ratio, if frames run slow ----
  let quality = 2;
  let slowFrames = 0, frames = 0;
  const stats = { fps: 0, quality, frameMs: 0 };
  (window as unknown as { __flyStats: typeof stats }).__flyStats = stats;

  const clock = new THREE.Timer();
  let fpsWindow = 0, fpsFrames = 0;

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

    // arrival: the sweep starts when the camera settles at the stop, and resets if it leaves
    if (journey > 0.985 && arrivedAt < 0) arrivedAt = time;
    if (journey < 0.9 && arrivedAt >= 0) {
      arrivedAt = -1;
      if (arrived) opt.onArrive((arrived = false));
    }
    const s = sweepAt(arrivedAt < 0 ? 0 : time - arrivedAt);
    terrainMat.uniforms.uSweep.value = s.sweep;
    terrainMat.uniforms.uSettle.value = s.settle;
    if (s.done && !arrived) opt.onArrive((arrived = true));
    head.rotation.y = time * 0.8;

    composer.render(dt);

    const anchors = [project(pinTop, "marker")];
    for (const l of labelPoints) {
      const a = project(l.p, l.id);
      a.visible &&= journey >= l.from && journey <= l.to;
      anchors.push(a);
    }
    opt.onFrame(journey, anchors);

    // frame timing, for adaptive quality and the checks in the slice report
    fpsWindow += dt;
    fpsFrames++;
    if (fpsWindow >= 1) {
      stats.fps = Math.round(fpsFrames / fpsWindow);
      stats.frameMs = +((fpsWindow / fpsFrames) * 1000).toFixed(1);
      fpsWindow = 0;
      fpsFrames = 0;
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

  // Compile every shader and upload the terrain before the first visible frame, in steps with a
  // pause between them, so no single step blocks the page for long (Firefox compiles on first draw).
  place(0, 0);
  terrain.visible = false;
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera); // sky, sea and pin
  await pause();
  terrain.visible = true;
  for (const c of terrain.children) c.frustumCulled = false; // draw every chunk once, so all of it uploads
  renderer.render(scene, camera);
  for (const c of terrain.children) c.frustumCulled = true;
  await pause();
  composer.render(0); // post-processing shaders
  await pause();
  opt.onStage("ready");
  clock.connect(document); // pauses the clock while the tab is hidden
  renderer.setAnimationLoop(frame);

  return {
    /** Scroll and touch move the camera by a fraction of the journey. */
    nudge(delta: number) {
      auto = null;
      target = clamp(target + delta, 0, 1);
    },
    /** Fly to a journey position with an eased glide (for buttons and keys). */
    flyTo(to: number) {
      const dist = Math.abs(to - journey);
      if (dist < 1e-3) return;
      auto = { from: journey, to, t: 0, dur: lerp(2.5, 7, dist) };
    },
    get journey() {
      return journey;
    },
    dispose() {
      renderer.setAnimationLoop(null);
      clock.dispose();
      ro.disconnect();
      composer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose?.();
      });
      renderer.dispose();
    },
  };
}

export type Flyover = Awaited<ReturnType<typeof createFlyover>>;
export type { Tile };
