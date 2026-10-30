// One renderer, one scene, one loop: the pattern ThreeUI's scene components use.
// React hosts the canvas and the HTML overlay; everything 3D lives here.
//
// The whole site is one camera path. React reports a "journey position" j: 0..1 across the hero,
// 1..2 across Experience, 2..3 across Projects. A list of shots (camera position, look-at point, lens,
// and where the kitten stands) is pinned to values of j; between shots the camera glides, at a stop it
// eases in and holds. HTML panels are pinned to points in the house and fade in near their stop.
import * as THREE from "three";
import { buildBeams, YARD_LANDINGS, type Landing } from "./beams";
import { buildHouse, type Lamp } from "./house";
import { buildInterior } from "./interior";
import { buildKitten } from "./kitten";
import { buildLeaves } from "./leaves";
import { MOODS, moodAt, sunDirection, type LightMode, type Mood } from "./lighting";
import { ALL_ON, createPost, type PostFlags } from "./post";
import { glow } from "./textures";
import { buildWordmark } from "./wordmark";
import { backLampTimes, endStops, experienceStops, projectStop } from "../lib/journey";
import { clamp, damp, easeInOut, lerp, mulberry32, smooth, tex } from "./util";

export type Overlay = { hit: HTMLElement; bubble: HTMLElement };
export type BenchRow = { label: string; ms: number };
export type AnchorState = { id: string; x: number; y: number; a: number };
export type FrameState = { anchors: AnchorState[]; stop: string | null; resting: boolean };

export type HouseRenderer = {
  setJourney: (j: number) => void;
  setPointer: (nx: number, ny: number, active: boolean) => void;
  setLighting: (mode: LightMode) => void;
  setHighlight: (id: string, on: boolean) => void;
  onFrame: (cb: (s: FrameState) => void) => void;
  swing: () => void;
  attachOverlay: (o: Overlay) => void;
  setRunning: (on: boolean) => void;
  resize: () => void;
  dispose: () => void;
};

type Options = {
  word: string;
  fontFamily: string;
  /** Project ids, one per corridor bay, in order. */
  bays: string[];
  quality?: "high" | "low";
  mode?: LightMode;
  post?: Partial<PostFlags>;
  onReady?: () => void;
};

type V = [number, number, number];
/** Kitten pose: position and heading; a null heading means "face the camera". */
type K = [number, number, number, number | null] | "START";
type Shot = { j: number; p: V; l: V; fov: number; k: K; stop?: string };

const PI = Math.PI;
// pillar pairs in the corridor (see interior.ts): bay centres
const BAY_Z = [-27.2, -34.0, -40.8, -47.6];

function buildShots(): Shot[] {
  const shots: Shot[] = [
    // ---- hero: the yard, the gate, the steps, the veranda, the door
    { j: 0.0, p: [8.6, 1.6, 14.2], l: [-1.2, 2.85, 0.6], fov: 45, k: "START", stop: "hero" },
    { j: 0.12, p: [8.6, 1.6, 14.2], l: [-1.2, 2.85, 0.6], fov: 45, k: "START", stop: "hero" },
    { j: 0.32, p: [1.2, 1.55, 11.0], l: [0, 2.8, 0], fov: 46, k: [0.9, 0, 6.2, PI] },
    { j: 0.5, p: [0.1, 2.0, 6.0], l: [0, 2.7, -1], fov: 47, k: [1.1, 0, 5.0, PI] },
    { j: 0.66, p: [0.15, 2.45, 3.6], l: [0, 2.45, -6], fov: 52, k: [1.4, 0.9, 0.3, null], stop: "door" },
    { j: 0.84, p: [0.15, 2.45, 3.6], l: [0, 2.45, -6], fov: 52, k: [1.4, 0.9, 0.3, null], stop: "door" },
    { j: 1.0, p: [0, 2.4, -1.2], l: [0, 2.7, -10], fov: 56, k: [0.4, 0.9, -3.6, PI] },
    // ---- experience: the carved hall, then the open courtyard with one stop per job
    // looking up into the carved ceiling as you pass under it
    { j: 1.12, p: [0, 2.1, -1.9], l: [0, 5.0, -6.5], fov: 62, k: [0.3, 0.9, -6.2, PI] },
    { j: 1.24, p: [0, 2.6, -8.4], l: [0, 1.6, -16], fov: 56, k: [0.4, 0.9, -10.2, PI] },
        // at each stop the kitten sits to the right of the panel, so its bubble never covers the text
    { j: 1.36, p: [2.4, 2.5, -12.2], l: [-5.4, 2.4, -14.8], fov: 50, k: [-0.9, 0.48, -15.0, null], stop: "exp-0" },
    { j: 1.52, p: [2.4, 2.5, -12.2], l: [-5.4, 2.4, -14.8], fov: 50, k: [-0.9, 0.48, -15.0, null], stop: "exp-0" },
    { j: 1.66, p: [-2.4, 2.5, -15.2], l: [5.4, 2.4, -17.6], fov: 50, k: [1.9, 0.48, -14.85, null], stop: "exp-1" },
    { j: 1.82, p: [-2.4, 2.5, -15.2], l: [5.4, 2.4, -17.6], fov: 50, k: [1.9, 0.48, -14.85, null], stop: "exp-1" },
    { j: 2.0, p: [0, 2.5, -21.8], l: [0, 2.5, -30], fov: 54, k: [0.3, 0.9, -25.5, PI] },
  ];
  // ---- projects: the corridor, one stop per bay
  BAY_Z.forEach((zc, i) => {
    const j0 = 2 + i * 0.25;
    const s: Omit<Shot, "j"> = { p: [0.9, 2.45, zc + 3.6], l: [-1.7, 2.2, zc - 0.4], fov: 52, k: [0.05, 0.9, zc + 0.4, null], stop: `bay-${i}` };
    shots.push({ j: j0 + 0.06, ...s }, { j: j0 + 0.19, ...s });
  });
  shots.push(
    // ---- other work: the accountant's desk at the end of the corridor; the kitten sits on the ledger
    { j: 3.12, p: [-1.0, 2.3, -46.6], l: [0.3, 1.5, -51.0], fov: 50, k: [1.12, 1.6, -50.85, null], stop: "ledger" },
    { j: 3.72, p: [-1.0, 2.3, -46.6], l: [0.3, 1.5, -51.0], fov: 50, k: [1.12, 1.6, -50.85, null], stop: "ledger" },
    // ---- out through the low door into the back courtyard at dusk
    { j: 4.0, p: [-0.65, 2.25, -50.6], l: [-0.6, 2.5, -58], fov: 56, k: [-0.4, 0.9, -54.2, PI] },
    // ---- about: the tulsi planter, the lamps lighting along the walls
    // the tulsi planter sits right of centre so the letter can hang beside it
    { j: 4.2, p: [-3.7, 2.5, -53.9], l: [-1.4, 1.8, -59.8], fov: 50, k: [1.35, 0.9, -58.3, null], stop: "about" },
    { j: 4.78, p: [-3.7, 2.5, -53.9], l: [-1.4, 1.8, -59.8], fov: 50, k: [1.35, 0.9, -58.3, null], stop: "about" },
    { j: 5.02, p: [0.2, 2.35, -55.6], l: [0, 2.7, -64], fov: 52, k: [0.95, 0.9, -61.2, PI] },
    // ---- contact: every lamp lit, the sky gone to indigo over the back wall
    // from the left of the court, looking past the tulsi to the lit back wall and the door
    { j: 5.25, p: [-2.6, 2.25, -57.0], l: [1.0, 2.7, -66.4], fov: 52, k: [1.6, 0.9, -62.6, null], stop: "contact" },
    { j: 6.0, p: [-2.6, 2.25, -57.0], l: [1.0, 2.7, -66.4], fov: 52, k: [1.6, 0.9, -62.6, null], stop: "contact" }
  );
  return shots;
}

const KITTEN_SCALE = 0.9;
const WORD_DISTANCE = 5.6;
const POOL = 5;

/**
 * Builds the house over many short steps, handing the main thread back to the browser between them,
 * so scrolling and clicks keep working while it loads (one long build froze the page for about 0.6 s).
 */
export async function createHouseRenderer(canvas: HTMLCanvasElement, opts: Options): Promise<HouseRenderer> {
  const sched = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  const y = () => (sched?.yield ? sched.yield() : new Promise<void>((r) => setTimeout(r, 0)));
  const marks: [string, number][] = [];
  const mark = (label: string) => marks.push([label, performance.now()]);
  const quality = opts.quality ?? "high";
  let mode: LightMode = opts.mode ?? "golden";
  let mood: Mood = MOODS[mode];
  const vpW = () => Math.max(1, canvas.clientWidth);
  const vpH = () => Math.max(1, canvas.clientHeight);
  const DPR_CAP = 1.5;
  let dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);

  // antialias is off: the post stack renders into its own buffers and uses SMAA instead
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance", stencil: false });
  renderer.setPixelRatio(dpr);
  renderer.setSize(vpW(), vpH(), false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xffffff, 0.02);
  scene.background = new THREE.Color();
  const camera = new THREE.PerspectiveCamera(45, vpW() / vpH(), 0.1, 260);

  // ---------------------------------------------------------------- sky
  const skyU = {
    uZenith: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uSun: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3() },
    uStrength: { value: 1 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(200, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: skyU,
      vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader:
        "uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunDir; uniform float uStrength; varying vec3 vDir;\n" +
        "void main(){ float h = clamp(vDir.y, 0.0, 1.0);\n" +
        " vec3 c = mix(uHorizon, uZenith, pow(h, 0.45));\n" +
        " float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);\n" +
        " c += uSun * uStrength * (pow(s, 64.0) * 2.5 + pow(s, 8.0) * 0.35 + pow(s, 2.0) * 0.08);\n" +
        " gl_FragColor = vec4(c, 1.0);\n }",
    })
  );
  scene.add(sky);

  // ---------------------------------------------------------------- lights
  const hemi = new THREE.HemisphereLight();
  scene.add(hemi);
  const sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality === "high" ? 2048 : 1024, quality === "high" ? 2048 : 1024);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 16, bottom: -16, near: 5, far: 90 });
  sun.shadow.radius = 3;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const keyLight = new THREE.PointLight(0xffffff, 0, 5, 2);
  scene.add(keyLight);
  // warm light spilling from the bright courtyard back into the hall
  const spill = new THREE.PointLight(0xffd8a8, 7, 10, 1.6);
  spill.position.set(0, 3.4, -7.4);
  scene.add(spill);
  const rim = new THREE.DirectionalLight();
  scene.add(rim, rim.target);
  // a fixed pool of lamp lights, moved each frame to the lamps nearest the camera
  const pool: THREE.PointLight[] = [];
  for (let i = 0; i < POOL; i++) {
    const l = new THREE.PointLight(0xffa858, 0, 8, 2);
    scene.add(l);
    pool.push(l);
  }

  // ---------------------------------------------------------------- the world
  await y();
  const house = await buildHouse(scene, quality, y);
  await y();
  const interior = await buildInterior(scene, house.mat, house.uTime, quality, opts.bays, backLampTimes, y);
  await y();
  const lamps: Lamp[] = [...house.lamps, ...interior.lamps];
  const word = buildWordmark(scene, opts.word, opts.fontFamily);
  await y();
  const leaves = buildLeaves(scene, quality === "high" ? 26 : 14);
  const beamSets = [
    buildBeams(scene, sunDirection(MOODS.golden), quality, YARD_LANDINGS),
    buildBeams(scene, new THREE.Vector3(-0.35, 0.9, 0.25).normalize(), quality, COURT_LANDINGS, 400),
    buildBeams(scene, new THREE.Vector3(-0.82, 0.38, 0.12).normalize(), quality, corridorLandings(), 500),
  ];
  await y();
  const kitten = buildKitten(house.uTime);
  kitten.root.scale.setScalar(KITTEN_SCALE);
  scene.add(kitten.root);

  // haze slabs drifting across the yard, tinted to the mood
  const hazeTex = tex(glow("rgba(255,255,255,.55)", "rgba(255,255,255,.16)"), { clamp: true });
  const haze: THREE.Mesh[] = [];
  const rnd = mulberry32(66);
  for (let i = 0; i < 6; i++) {
    const s = 10 + rnd() * 12;
    const h = new THREE.Mesh(
      new THREE.PlaneGeometry(s, s * 0.4),
      new THREE.MeshBasicMaterial({ map: hazeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.04 + rnd() * 0.05 })
    );
    h.position.set(-14 + rnd() * 26, 0.8 + rnd() * 4, -10 + rnd() * 20);
    h.userData = { x0: h.position.x, sp: 0.05 + rnd() * 0.1, ph: rnd() * 6 };
    scene.add(h);
    haze.push(h);
  }

  await y();
  const post = createPost(renderer, scene, camera, { ...ALL_ON, ...opts.post });
  await y();

  // ---------------------------------------------------------------- mood (blended every frame by depth)
  const white = new THREE.Color(1, 1, 1);
  function applyMood(m: Mood) {
    mood = m;
    const sd = sunDirection(m);
    skyU.uZenith.value.set(m.zenith);
    skyU.uHorizon.value.set(m.horizon);
    skyU.uSun.value.set(m.sunGlow);
    skyU.uSunDir.value.copy(sd);
    skyU.uStrength.value = m.sunGlowStrength;
    const fog = scene.fog as THREE.FogExp2;
    fog.color.set(m.fog);
    fog.density = m.fogDensity;
    (scene.background as THREE.Color).set(m.fog);
    hemi.color.set(m.hemiSky);
    hemi.groundColor.set(m.hemiGround);
    hemi.intensity = m.hemiIntensity;
    sun.color.set(m.sunColor);
    sun.intensity = m.sunIntensity;
    sun.position.copy(sun.target.position).addScaledVector(sd, 45);
    rim.color.set(m.rimColor);
    rim.intensity = m.rimIntensity;
    rim.target.position.copy(sun.target.position);
    rim.position.set(sun.target.position.x + sd.x * 20, 8, sun.target.position.z - 18);
    keyLight.color.set(m.key.color);
    keyLight.intensity = m.key.intensity;
    house.glow.windows.emissiveIntensity = m.windowGlow;
    for (const f of house.glow.fanlights) f.emissiveIntensity = m.fanlightGlow;
    beamSets.forEach((b, i) => b.setOpacity(m.beams[i], m.beamColor));
    for (const h of haze) (h.material as THREE.MeshBasicMaterial).color.set(m.fog).lerp(white, 0.5);
    if (house.branch) (house.branch.material as THREE.MeshBasicMaterial).color.set(m.sprig);
    word.setGlow(m.letterGlow);
    post.setMood(m);
    renderer.toneMappingExposure = m.exposure;
  }

  // ---------------------------------------------------------------- the path
  const shots = buildShots();
  // distinct camera points (holds repeat a point), so the spline never loops back on itself
  const distinct: { p: THREE.Vector3; l: THREE.Vector3 }[] = [];
  const shotIndex: number[] = [];
  for (const s of shots) {
    const last = distinct[distinct.length - 1];
    const p = new THREE.Vector3(...s.p);
    if (!last || last.p.distanceToSquared(p) > 1e-6) distinct.push({ p, l: new THREE.Vector3(...s.l) });
    shotIndex.push(distinct.length - 1);
  }
  const curveP = new THREE.CatmullRomCurve3(distinct.map((d) => d.p), false, "centripetal");
  const curveT = new THREE.CatmullRomCurve3(distinct.map((d) => d.l), false, "centripetal");
  const lastJ = shots[shots.length - 1].j;

  /** Which segment j falls in, and how far along it, eased at stops. */
  function segment(j: number) {
    j = clamp(j, 0, lastJ);
    let i = 0;
    while (i < shots.length - 2 && j > shots[i + 1].j) i++;
    const a = shots[i];
    const b = shots[i + 1];
    let s = clamp((j - a.j) / Math.max(1e-6, b.j - a.j), 0, 1);
    if (a.stop || b.stop) s = s * s * (3 - 2 * s);
    return { i, s, a, b };
  }

  const rig = { target: 0, j: 0, mx: 0, my: 0, tmx: 0, tmy: 0, pointer: false, intro: 0 };
  const _p = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const _d = new THREE.Vector3();
  let clock = 0;

  function placeCamera(cam: THREE.PerspectiveCamera, j: number, live: boolean) {
    const { i, s, a, b } = segment(j);
    const di = shotIndex[i];
    const dj = shotIndex[i + 1];
    const u = (di + (dj > di ? s : 0)) / Math.max(1, distinct.length - 1);
    curveP.getPoint(u, _p);
    curveT.getPoint(u, _t);
    let fov = lerp(a.fov, b.fov, s);
    // on a squarer frame at the start, step back and widen rather than crop the house
    const nf = clamp((1.62 - cam.aspect) / 1.05, 0, 1) * (1 - smooth(0.3, 0.7, j));
    if (nf > 0) {
      _d.subVectors(_p, _t).normalize();
      _p.addScaledVector(_d, nf * 4);
      _p.y += nf * 0.4;
      fov *= 1 + nf * 0.3;
    }
    if (live) {
      const io = 1 - rig.intro;
      _p.addScaledVector(_d.subVectors(_p, _t).normalize(), io * 2.2);
      fov += io * 4;
      // a slow hand-held drift, and mouse parallax; both calmer once you are inside
      const amt = j < 0.3 ? 1 - smooth(0.04, 0.3, j) * 0.7 : 0.3;
      _p.x += Math.sin(clock * 0.23) * 0.14 * amt;
      _p.y += Math.sin(clock * 0.19 + 1.3) * 0.05 * amt;
      _p.z += Math.cos(clock * 0.17) * 0.1 * amt;
      _t.y += Math.sin(clock * 0.13 + 0.4) * 0.05 * amt;
      _p.x += rig.mx * 0.6 * amt;
      _p.y += rig.my * 0.22 * amt;
      _t.x -= rig.mx * 0.25 * amt;
      _t.y -= rig.my * 0.12 * amt;
    }
    cam.position.copy(_p);
    cam.lookAt(_t);
    if (Math.abs(cam.fov - fov) > 1e-4) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }

  // ---------------------------------------------------------------- hero layout (name, kitten start, sprig)
  const heroCam = new THREE.PerspectiveCamera(45, vpW() / vpH(), 0.1, 260);
  const kStart: [number, number, number, number] = [5, 0.6, 9, 0];
  function layoutHero() {
    heroCam.aspect = vpW() / vpH();
    placeCamera(heroCam, 0, false);
    heroCam.updateProjectionMatrix();
    heroCam.updateMatrixWorld(true);
    word.layout(heroCam, WORD_DISTANCE, 0.74);
    // the kitten starts on top of the last letter, its paws on the stroke, facing the camera
    const top = word.letterTop(opts.word.length - 1, new THREE.Vector3());
    kStart[0] = top.x;
    kStart[1] = top.y + 0.035;
    kStart[2] = top.z;
    kStart[3] = word.placed.yaw;
    if (house.branch) {
      const fwd = heroCam.getWorldDirection(new THREE.Vector3());
      const right = new THREE.Vector3().crossVectors(fwd, heroCam.up).normalize();
      const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
      house.branch.position.copy(heroCam.position).addScaledVector(fwd, 0.95).addScaledVector(right, 0.55).addScaledVector(up, 0.4);
      house.branch.quaternion.copy(heroCam.quaternion);
    }
  }

  // ---------------------------------------------------------------- kitten along the path
  const kPos = new THREE.Vector3();
  const kPrev = new THREE.Vector3();
  let kHeading = 0;
  let gait = 0;
  const pose = (k: K): [number, number, number, number | null] => (k === "START" ? kStart : k);

  function kittenAt(j: number, out: THREE.Vector3) {
    const { s, a, b } = segment(j);
    const ka = pose(a.k);
    const kb = pose(b.k);
    const e = easeInOut(s);
    out.set(lerp(ka[0], kb[0], e), lerp(ka[1], kb[1], e), lerp(ka[2], kb[2], e));
    // hop when the height changes (down from the letter, up the steps, down into the court)
    if (Math.abs(kb[1] - ka[1]) > 0.05) out.y += Math.sin(s * PI) * 0.45;
    const face = (h: number | null) => (h === null ? Math.atan2(camera.position.x - out.x, camera.position.z - out.z) : h);
    const ha = face(ka[3]);
    const hb = face(kb[3]);
    let dh = hb - ha;
    while (dh > PI) dh -= PI * 2;
    while (dh < -PI) dh += PI * 2;
    return ha + dh * Math.min(1, s * 3);
  }

  // ---------------------------------------------------------------- panel anchors
  type Anchor = { id: string; pos: THREE.Vector3; j: number; range: number };
  const anchors: Anchor[] = [
    // ranges are wide enough that each panel stays fully visible for about a screen of scrolling
    ...experienceStops.map((j, i) => ({ id: `exp-${i}`, pos: interior.courtAnchors[i], j, range: 0.15 })),
    ...interior.bays.map((b, i) => ({ id: b.id, pos: b.anchor, j: projectStop(i), range: 0.12 })),
    { id: "ledger", pos: interior.endAnchors.ledger, j: endStops.ledger, range: 0.36 },
    { id: "about", pos: interior.endAnchors.about, j: endStops.about, range: 0.36 },
    { id: "contact", pos: interior.endAnchors.contact, j: endStops.contact, range: 0.6 },
  ];
  const frameState: FrameState = { anchors: anchors.map((a) => ({ id: a.id, x: 0, y: 0, a: 0 })), stop: null, resting: false };
  let frameCb: ((s: FrameState) => void) | null = null;
  const highlight = new Map<string, number>();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();

  function updateAnchors() {
    const w = vpW();
    const h = vpH();
    anchors.forEach((an, i) => {
      const st = frameState.anchors[i];
      const d = Math.abs(rig.j - an.j);
      st.a = 1 - smooth(an.range * 0.55, an.range, d);
      tmp.copy(an.pos).project(camera);
      st.x = (tmp.x * 0.5 + 0.5) * w;
      st.y = (-tmp.y * 0.5 + 0.5) * h;
      if (tmp.z > 1) st.a = 0;
    });
    const { a, b, s } = segment(rig.j);
    const holding = !!(a.stop && a.stop === b.stop);
    frameState.stop = holding ? a.stop! : ((s < 0.5 ? a.stop : b.stop) ?? null);
    frameState.resting = holding && gait < 0.3;
  }

  // ---------------------------------------------------------------- overlay and pointer
  let overlay: Overlay | null = null;
  const ray = new THREE.Raycaster();
  const look = new THREE.Vector3();
  const lookPlane = new THREE.Plane();
  const ndc = new THREE.Vector2();

  function updateOverlay() {
    if (!overlay) return;
    const w = vpW();
    const h = vpH();
    const r = kitten.bounds(tmp);
    const dist = camera.position.distanceTo(tmp);
    tmp.project(camera);
    const px = (tmp.x * 0.5 + 0.5) * w;
    const py = (-tmp.y * 0.5 + 0.5) * h;
    const rpx = (r / dist) * (h / 2 / Math.tan((camera.fov * PI) / 360));
    const visible = tmp.z < 1 && dist > 0.6;
    overlay.hit.style.transform = `translate(${(px - rpx).toFixed(1)}px, ${(py - rpx).toFixed(1)}px)`;
    overlay.hit.style.width = overlay.hit.style.height = `${(rpx * 2).toFixed(1)}px`;
    overlay.hit.style.visibility = visible ? "visible" : "hidden";
    kitten.headTop(tmp2).project(camera);
    overlay.bubble.style.setProperty("--bx", `${((tmp2.x * 0.5 + 0.5) * w).toFixed(1)}px`);
    overlay.bubble.style.setProperty("--by", `${((-tmp2.y * 0.5 + 0.5) * h).toFixed(1)}px`);
    overlay.bubble.dataset.visible = visible && frameState.resting && frameState.stop !== "door" ? "true" : "false";
  }

  // ---------------------------------------------------------------- lamps: glow everywhere, real light near the camera
  const lampScore: number[] = [];
  const order: number[] = lamps.map((_, i) => i);
  function updateLamps(dt: number) {
    lamps.forEach((l, i) => {
      const lit = l.at !== undefined && rig.j > l.at ? 1 : 0;
      const target = Math.max(mood.lamps, highlight.get(l.id ?? "") ?? 0, lit);
      l.boost = damp(l.boost ?? 0, target, 6, dt);
      l.flame.visible = l.boost > 0.04;
      const d2 = camera.position.distanceToSquared(l.pos);
      lampScore[i] = l.boost > 0.04 ? l.boost / (1 + d2 * 0.04) : -1;
    });
    order.sort((a, b) => lampScore[b] - lampScore[a]);
    pool.forEach((light, k) => {
      const i = order[k];
      const l = lamps[i];
      if (!l || lampScore[i] <= 0) {
        light.intensity = 0;
        return;
      }
      const f = 0.84 + 0.1 * Math.sin(clock * (7.1 + i)) + 0.06 * Math.sin(clock * (13.7 + i * 2.3) + i);
      light.position.copy(l.pos);
      light.color.set(l.color);
      light.intensity = l.base * (l.boost ?? 0) * f;
    });
  }

  // ---------------------------------------------------------------- per-frame update
  let reflections = true;
  function update(dt: number) {
    clock += dt;
    house.uTime.value = clock;
    rig.intro = damp(rig.intro, 1, 1.2, dt);
    rig.j = damp(rig.j, rig.target, 5, dt);
    rig.mx = damp(rig.mx, rig.pointer ? rig.tmx : 0, 2.2, dt);
    rig.my = damp(rig.my, rig.pointer ? rig.tmy : 0, 2.2, dt);
    placeCamera(camera, rig.j, true);
    const j = rig.j;

    // light follows the walk; the sun's shadow box follows the camera
    camera.getWorldDirection(_d);
    sun.target.position.copy(camera.position).addScaledVector(_d, 6);
    sun.target.position.y = 1;
    applyMood(moodAt(mode, camera.position.z));

    // door swings inward as the camera reaches the veranda
    const open = easeInOut(smooth(0.55, 0.8, j)) * 1.62;
    house.doorLeft.rotation.y = open;
    house.doorRight.rotation.y = -open;
    debugState.j = j;

    // the name and the foreground sheets dissolve as the camera walks through them
    word.setOpacity(smooth(1.0, 3.2, camera.position.distanceTo(word.placed.center)));
    for (const m of house.cutouts) {
      const d = camera.position.distanceTo(m.position);
      let a = smooth(0.5, 2.2, d);
      if (m.userData.nearLens) a = camera.aspect < 1.2 ? 0 : 1 - smooth(1.6, 2.6, d);
      (m.material as THREE.Material).opacity = a;
      m.visible = a > 0.01;
    }
    for (const h of haze) {
      h.position.x = h.userData.x0 + Math.sin(clock * h.userData.sp + h.userData.ph) * 4;
      h.quaternion.copy(camera.quaternion);
      h.visible = camera.position.z > -2;
    }
    // draw only the rooms you can see from here (saves hundreds of draw calls at the front door)
    const cz = camera.position.z;
    interior.zones.hall.visible = cz < 6 && j > 0.45;
    interior.zones.court.visible = cz < 1;
    interior.zones.corridor.visible = cz < -12;
    interior.zones.back.visible = cz < -42;
    interior.zones.hall.visible = interior.zones.hall.visible && cz > -30;
    interior.zones.court.visible = interior.zones.court.visible && cz > -44;
    house.root.visible = cz > -23;
    // planar reflections only while in the corridor
    if (interior.reflector) interior.reflector.visible = reflections && cz < -21 && cz > -53;
    updateLamps(dt);
    for (const b of beamSets) b.update(clock, camera);
    leaves.update(dt, clock, camera);

    // kitten: follow the path, turn to face where it is going, track the cursor when resting
    kPrev.copy(kPos);
    const heading = kittenAt(j, kPos);
    kitten.root.position.copy(kPos);
    let dh = heading - kHeading;
    while (dh > PI) dh -= PI * 2;
    while (dh < -PI) dh += PI * 2;
    kHeading += dh * (1 - Math.exp(-8 * dt));
    kitten.root.rotation.y = kHeading;
    const speed = dt > 0 ? kPrev.distanceTo(kPos) / dt : 0;
    gait = damp(gait, clamp(speed * 1.5, 0, 1), 6, dt);
    let target: THREE.Vector3 | null = null;
    if (gait < 0.3) {
      if (rig.pointer) {
        ray.setFromCamera(ndc.set(rig.tmx, rig.tmy), camera);
        const toCam = tmp.subVectors(camera.position, kPos).normalize();
        lookPlane.setFromNormalAndCoplanarPoint(toCam, kPos.clone().addScaledVector(toCam, 1.5));
        target = ray.ray.intersectPlane(lookPlane, look);
      } else {
        target = look.copy(camera.position);
      }
    }
    kitten.update(dt, clock, target, gait);
    // the kitten's own light, and focus between the kitten and what the camera looks at
    keyLight.position.copy(kPos).addScaledVector(tmp.subVectors(camera.position, kPos).normalize(), 1.4);
    keyLight.position.y += 1.1;
    kitten.headTop(post.focus).lerp(_t, 0.3);
    updateAnchors();
  }

  // ---------------------------------------------------------------- loop and adaptive quality
  let running = true;
  let frame = 0;
  let last = performance.now();
  let disposed = false;
  let readySent = false;
  const perf = { acc: 0, n: 0, warm: 0, level: 0 };
  const debugState = { marks,
    j: 0, level: () => perf.level, flags: () => post.flags(), bench: (frames?: number) => bench(frames), scene, renderer, post };
  if (/[?&](debug|bench)=1/.test(location.search)) (window as unknown as { __house: unknown }).__house = debugState;

  // if frames are slow for a couple of seconds, give up the most expensive extras first
  function adapt(dt: number) {
    perf.warm += dt;
    if (perf.warm < 3) return;
    perf.acc += dt;
    perf.n++;
    if (perf.acc < 2) return;
    const avg = perf.acc / perf.n;
    perf.acc = 0;
    perf.n = 0;
    if (avg <= 1 / 45 || perf.level >= 4) return;
    perf.level++;
    if (perf.level === 1) reflections = false;
    if (perf.level === 2) post.setFlags({ dof: false });
    if (perf.level === 3) post.setFlags({ ao: false });
    if (perf.level === 4) {
      dpr = 1;
      resize();
    }
  }

  function tick(now: number) {
    frame = 0;
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    post.render(dt);
    updateOverlay();
    frameCb?.(frameState);
    adapt(dt);
    if (!readySent) {
      mark("first frame");
      readySent = true;
      opts.onReady?.();
    }
    schedule();
  }

  function schedule() {
    if (!disposed && running && !document.hidden && !frame) frame = requestAnimationFrame(tick);
  }

  const onVisibility = () => {
    if (document.hidden && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      last = performance.now();
      schedule();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  function resize() {
    renderer.setPixelRatio(dpr);
    renderer.setSize(vpW(), vpH(), false);
    post.setSize(vpW(), vpH());
    camera.aspect = vpW() / vpH();
    camera.updateProjectionMatrix();
    layoutHero();
  }

  /**
   * Measures the GPU cost of each effect at the current camera position: renders a fixed number of
   * frames per configuration and waits for the GPU each time (gl.finish), so timings are not capped
   * by the display's refresh rate.
   */
  async function bench(frames = 90): Promise<BenchRow[]> {
    const wasRunning = running;
    running = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    const gl = renderer.getContext();
    const saved = post.flags();
    const measure = async () => {
      for (let i = 0; i < 20; i++) {
        update(1 / 60);
        post.render(1 / 60);
      }
      gl.finish();
      await new Promise((r) => setTimeout(r, 30));
      const times: number[] = [];
      for (let i = 0; i < frames; i++) {
        const t0 = performance.now();
        update(1 / 60);
        post.render(1 / 60);
        gl.finish();
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      return times[Math.floor(times.length / 2)];
    };
    const rows: BenchRow[] = [];
    const steps: [string, Partial<PostFlags>][] = [
      ["scene only, no post-processing", { post: false }],
      ["+ post pipeline (tone mapping)", { post: true, smaa: false, bloom: false, ao: false, dof: false, grade: false }],
      ["+ SMAA anti-aliasing", { smaa: true }],
      ["+ bloom", { bloom: true }],
      ["+ grade, vignette, grain", { grade: true }],
      ["+ ambient occlusion (N8AO, half res)", { ao: true }],
      ["+ depth of field", { dof: true }],
    ];
    for (const [label, f] of steps) {
      post.setFlags(f);
      rows.push({ label, ms: await measure() });
    }
    const wasRefl = reflections;
    reflections = false;
    rows.push({ label: "all on, minus floor reflections", ms: await measure() });
    reflections = wasRefl;
    post.setFlags(saved);
    running = wasRunning;
    last = performance.now();
    schedule();
    return rows;
  }

  resize();
  applyMood(moodAt(mode, 20));
  // compile every shader up front, off the main thread where the browser supports it,
  // so the first frame does not freeze the page while about 60 programs build
  running = false;
  mark("built");
  // Warm up while the canvas is still invisible: compile the scene's shaders in the background, then
  // switch the post-processing effects on one per task, so no single frame has to compile them all
  // (that first frame alone blocked the page for about 0.3 s).
  void (async () => {
    try {
      if (renderer.extensions.has("KHR_parallel_shader_compile")) {
        await renderer.compileAsync(scene, camera);
      } else {
        // Firefox cannot compile shaders in the background, so compile the scene a piece at a time
        const pieces: THREE.Object3D[] = [];
        for (const c of scene.children) pieces.push(...(c.children.length > 12 ? c.children : [c]));
        for (const piece of pieces) {
          if (disposed) return;
          renderer.compile(piece, camera, scene);
          await y();
        }
      }
    } catch {
      // anything left compiles on first use instead
    }
    mark("compiled");
    // upload the painted textures to the GPU a few at a time (otherwise the first frame uploads them all)
    const textures = new Set<THREE.Texture>();
    scene.traverse((o) => {
      const mats = (o as THREE.Mesh).material;
      for (const m of mats ? (Array.isArray(mats) ? mats : [mats]) : []) {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) textures.add(v);
      }
    });
    let n = 0;
    for (const t of textures) {
      if (disposed) return;
      renderer.initTexture(t);
      if (++n % 4 === 0) await y();
    }
    mark("textures");
    const target = post.flags();
    const steps: Partial<PostFlags>[] = [
      { post: false },
      { post: true, smaa: false, bloom: false, ao: false, dof: false, grade: false },
      ...(["smaa", "bloom", "grade", "ao", "dof"] as const).filter((k) => target[k]).map((k) => ({ [k]: true })),
    ];
    for (const step of target.post ? steps : steps.slice(0, 1)) {
      if (disposed) return;
      post.setFlags(step);
      update(1 / 60);
      post.render(1 / 60);
      mark("step " + Object.keys(step).join("+"));
      await y();
    }
    if (disposed) return;
    mark("warmed");
    running = true;
    last = performance.now();
    schedule();
  })();

  return {
    setJourney: (j) => {
      rig.target = clamp(j, 0, lastJ);
    },
    setPointer: (nx, ny, active) => {
      rig.tmx = nx;
      rig.tmy = ny;
      rig.pointer = active;
    },
    setLighting: (m) => {
      mode = m;
    },
    setHighlight: (id, on) => {
      highlight.set(id, on ? 1 : 0);
    },
    onFrame: (cb) => {
      frameCb = cb;
    },
    swing: () => kitten.swing(),
    attachOverlay: (o) => {
      overlay = o;
    },
    setRunning: (on) => {
      running = on;
      if (on) {
        last = performance.now();
        schedule();
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    resize,
    dispose: () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      post.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
        for (const mat of mats) {
          for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
          mat.dispose();
        }
      });
      renderer.dispose();
    },
  };
}

// sun shafts falling from the open sky into the sunken court
const COURT_LANDINGS: Landing[] = [
  [-2.6, 0.47, -14.4, 1.6, 13],
  [1.4, 0.47, -17.2, 2.0, 13],
  [-0.6, 0.47, -20.2, 1.4, 13],
];

// low shafts raking in from the garden between each pair of corridor pillars
function corridorLandings(): Landing[] {
  const out: Landing[] = [];
  for (let z = -27.2; z > -50; z -= 3.4) out.push([0.6, 0.92, z, 1.1, 10]);
  return out;
}
