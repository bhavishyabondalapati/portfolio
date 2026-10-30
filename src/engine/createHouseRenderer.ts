// One renderer, one scene, one loop: the pattern ThreeUI's scene components use.
// React hosts the canvas and the HTML overlay; everything 3D lives here.
import * as THREE from "three";
import { buildBeams } from "./beams";
import { buildHouse } from "./house";
import { buildKitten } from "./kitten";
import { MOODS, sunDirection, type LightMode, type Mood } from "./lighting";
import { buildPetals } from "./petals";
import { ALL_ON, createPost, type PostFlags } from "./post";
import { glow } from "./textures";
import { buildWordmark } from "./wordmark";
import { clamp, damp, easeInOut, lerp, mulberry32, smooth, tex } from "./util";

export type Overlay = { hit: HTMLElement; bubble: HTMLElement };
export type BenchRow = { label: string; ms: number };

export type HouseRenderer = {
  setProgress: (p: number) => void;
  setPointer: (nx: number, ny: number, active: boolean) => void;
  setLighting: (mode: LightMode) => void;
  swing: () => void;
  attachOverlay: (o: Overlay) => void;
  setRunning: (on: boolean) => void;
  resize: () => void;
  dispose: () => void;
};

type Options = {
  word: string;
  fontFamily: string;
  quality?: "high" | "low";
  mode?: LightMode;
  post?: Partial<PostFlags>;
  onReady?: () => void;
};

// A low three-quarter view from the right-hand corner of the yard: the veranda recedes to the left,
// pillar after pillar. Then the walk swings round through the gate, up the steps and in at the door.
const CAM = [
  { p: [8.6, 1.6, 14.2], t: [-1.2, 2.85, 0.6], fov: 45 },
  // through the middle of the gate (its pillars stand at x = 1.7 either side)
  { p: [1.2, 1.55, 11.0], t: [0, 2.8, 0], fov: 46 },
  { p: [0.1, 2.0, 6.0], t: [0, 2.7, -1], fov: 47 },
  { p: [0.15, 2.45, 3.6], t: [0, 2.45, -6], fov: 52 },
  { p: [0, 2.45, -1.8], t: [0, 2.3, -12], fov: 56 },
];

// Where the kitten is at each point of the scroll: [progress, x, y, z, heading].
// The first two entries are replaced at layout time with the top of the last letter.
const KITTEN_PATH: [number, number, number, number, number][] = [
  [0.0, 5, 0.6, 9, 0],
  [0.14, 5, 0.6, 9, 0],
  [0.25, 0.9, 0.0, 6.2, Math.PI],
  [0.36, 1.1, 0.0, 5.0, Math.PI],
  [0.44, 1.2, 0.9, 2.4, Math.PI],
  [0.5, 1.55, 0.9, 1.0, -0.35],
  [0.66, 1.55, 0.9, 1.0, -0.35],
  [0.8, 0.5, 0.9, -1.4, Math.PI],
  [1.0, 0.25, 0.9, -5.6, Math.PI],
];
const KITTEN_SCALE = 0.9;
const DOOR_POINT = new THREE.Vector3(0, 2.2, 0);
const WORD_DISTANCE = 5.6;

export function createHouseRenderer(canvas: HTMLCanvasElement, opts: Options): HouseRenderer {
  const quality = opts.quality ?? "high";
  let mood: Mood = MOODS[opts.mode ?? "golden"];
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
  const camera = new THREE.PerspectiveCamera(CAM[0].fov, vpW() / vpH(), 0.1, 260);

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
  sun.target.position.set(0, 1, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality === "high" ? 2048 : 1024, quality === "high" ? 2048 : 1024);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 16, bottom: -16, near: 5, far: 90 });
  sun.shadow.radius = 3;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  // rim light from behind the house: catches the edges of the pillars and the kitten
  const keyLight = new THREE.PointLight(0xffffff, 0, 5, 2);
  scene.add(keyLight);
  const rim = new THREE.DirectionalLight();
  rim.target.position.set(0, 1.5, 2);
  scene.add(rim, rim.target);

  // ---------------------------------------------------------------- the world
  const house = buildHouse(scene, quality);
  const word = buildWordmark(scene, opts.word, opts.fontFamily);
  const petals = buildPetals(scene, quality === "high" ? 60 : 30);
  const beams = buildBeams(scene, sunDirection(MOODS.golden), quality);
  const kitten = buildKitten(house.uTime);
  kitten.root.scale.setScalar(KITTEN_SCALE);
  scene.add(kitten.root);

  // haze slabs drifting across the yard, tinted to the mood
  const hazeTex = tex(glow("rgba(255,255,255,.55)", "rgba(255,255,255,.16)"), { clamp: true });
  const hazeMat = new THREE.MeshBasicMaterial({ map: hazeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: 0xffffff });
  const haze: THREE.Mesh[] = [];
  const rnd = mulberry32(66);
  for (let i = 0; i < 6; i++) {
    const s = 10 + rnd() * 12;
    const h = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.4), hazeMat.clone());
    (h.material as THREE.MeshBasicMaterial).opacity = 0.04 + rnd() * 0.05;
    h.position.set(-14 + rnd() * 26, 0.8 + rnd() * 4, -10 + rnd() * 20);
    h.userData = { x0: h.position.x, sp: 0.05 + rnd() * 0.1, ph: rnd() * 6 };
    scene.add(h);
    haze.push(h);
  }

  const post = createPost(renderer, scene, camera, { ...ALL_ON, ...opts.post });

  // ---------------------------------------------------------------- mood
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
    rim.position.set(sd.x * 20, 8, -18);
    if (house.branch) (house.branch.material as THREE.MeshBasicMaterial).color.set(m.sprig);
    keyLight.color.set(m.key.color);
    keyLight.intensity = m.key.intensity;
    for (const l of house.lamps) {
      l.flame.visible = m.lampsOn;
      l.light.visible = m.lampsOn;
    }
    house.glow.windows.emissiveIntensity = m.windowGlow;
    for (const f of house.glow.fanlights) f.emissiveIntensity = m.fanlightGlow;
    beams.setOpacity(m.beams, m.beamColor);
    for (const h of haze) (h.material as THREE.MeshBasicMaterial).color.set(m.fog).lerp(new THREE.Color(1, 1, 1), 0.5);
    word.setGlow(m.letterGlow);
    post.setMood(m);
    renderer.toneMappingExposure = m.exposure;
    sun.shadow.needsUpdate = true;
  }
  applyMood(mood);

  // ---------------------------------------------------------------- camera rig
  const curveP = new THREE.CatmullRomCurve3(CAM.map((c) => new THREE.Vector3(...(c.p as [number, number, number]))), false, "catmullrom", 0.4);
  const curveT = new THREE.CatmullRomCurve3(CAM.map((c) => new THREE.Vector3(...(c.t as [number, number, number]))), false, "catmullrom", 0.4);
  const rig = { target: 0, prog: 0, mx: 0, my: 0, tmx: 0, tmy: 0, pointer: false, intro: 0 };
  const _p = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const _d = new THREE.Vector3();
  let clock = 0;

  /** Scroll progress to position along the walk: a short hold first, then the walk. */
  const walkU = (p: number) => (p < 0.14 ? (p / 0.14) * 0.04 : 0.04 + ((p - 0.14) / 0.86) * 0.96);

  function placeCamera(cam: THREE.PerspectiveCamera, p: number, live: boolean) {
    const u = clamp(walkU(p), 0, 1);
    curveP.getPoint(u, _p);
    curveT.getPoint(u, _t);
    const seg = u * (CAM.length - 1);
    const i = Math.min(Math.floor(seg), CAM.length - 2);
    let fov = lerp(CAM[i].fov, CAM[i + 1].fov, seg - i);
    // on a squarer frame, step back and widen rather than crop the house
    const nf = clamp((1.62 - cam.aspect) / 1.05, 0, 1) * (1 - smooth(0.3, 0.7, u));
    if (nf > 0) {
      _d.subVectors(_p, _t).normalize();
      _p.addScaledVector(_d, nf * 4);
      _p.y += nf * 0.4;
      fov *= 1 + nf * 0.3;
    }
    if (live) {
      // the opening dolly: a slightly longer lens easing in
      const io = 1 - rig.intro;
      _p.addScaledVector(_d.subVectors(_p, _t).normalize(), io * 2.2);
      fov += io * 4;
      // a slow hand-held drift, strongest while standing still at the start
      const hold = 1 - smooth(0.04, 0.3, u) * 0.7;
      _p.x += Math.sin(clock * 0.23) * 0.14 * hold;
      _p.y += Math.sin(clock * 0.19 + 1.3) * 0.05 * hold;
      _p.z += Math.cos(clock * 0.17) * 0.1 * hold;
      _t.y += Math.sin(clock * 0.13 + 0.4) * 0.05 * hold;
      // mouse parallax: the camera leans the way the cursor goes, the target a little the other way
      _p.x += rig.mx * 0.6 * hold;
      _p.y += rig.my * 0.22 * hold;
      _t.x -= rig.mx * 0.25 * hold;
      _t.y -= rig.my * 0.12 * hold;
    }
    cam.position.copy(_p);
    cam.lookAt(_t);
    if (Math.abs(cam.fov - fov) > 1e-4) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }

  const heroCam = new THREE.PerspectiveCamera(CAM[0].fov, vpW() / vpH(), 0.1, 260);
  function layoutHero() {
    heroCam.aspect = vpW() / vpH();
    placeCamera(heroCam, 0, false);
    heroCam.updateProjectionMatrix();
    heroCam.updateMatrixWorld(true);
    word.layout(heroCam, WORD_DISTANCE, 0.74);
    const { yaw } = word.placed;
    // the kitten starts on top of the last letter, facing the camera
    const top = word.letterTop(opts.word.length - 1, new THREE.Vector3());
    for (const k of [0, 1]) {
      KITTEN_PATH[k][1] = top.x;
      KITTEN_PATH[k][2] = top.y;
      KITTEN_PATH[k][3] = top.z;
      KITTEN_PATH[k][4] = yaw;
    }
    // the jasmine sprig hangs into the top-right corner, about a metre from the lens
    if (house.branch) {
      const fwd = heroCam.getWorldDirection(new THREE.Vector3());
      const right = new THREE.Vector3().crossVectors(fwd, heroCam.up).normalize();
      const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
      house.branch.position.copy(heroCam.position).addScaledVector(fwd, 0.95).addScaledVector(right, 0.55).addScaledVector(up, 0.4);
      house.branch.quaternion.copy(heroCam.quaternion);
    }
  }

  // ---------------------------------------------------------------- kitten path
  const kPos = new THREE.Vector3();
  const kPrev = new THREE.Vector3();
  let kHeading = 0;
  let gait = 0;

  function kittenAt(p: number, out: THREE.Vector3) {
    let a = KITTEN_PATH[0];
    let b = KITTEN_PATH[KITTEN_PATH.length - 1];
    for (let i = 0; i < KITTEN_PATH.length - 1; i++) {
      if (p >= KITTEN_PATH[i][0] && p <= KITTEN_PATH[i + 1][0]) {
        a = KITTEN_PATH[i];
        b = KITTEN_PATH[i + 1];
        break;
      }
    }
    const k = b[0] > a[0] ? clamp((p - a[0]) / (b[0] - a[0]), 0, 1) : 1;
    const e = easeInOut(k);
    out.set(lerp(a[1], b[1], e), lerp(a[2], b[2], e), lerp(a[3], b[3], e));
    // hop when the height changes (down from the letter, up the steps)
    if (Math.abs(b[2] - a[2]) > 0.05) out.y += Math.sin(k * Math.PI) * 0.45;
    let dh = b[4] - a[4];
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    return a[4] + dh * Math.min(1, k * 3);
  }

  // ---------------------------------------------------------------- overlay and pointer
  let overlay: Overlay | null = null;
  const ray = new THREE.Raycaster();
  const look = new THREE.Vector3();
  const lookPlane = new THREE.Plane();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
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
    const rpx = (r / dist) * (h / 2 / Math.tan((camera.fov * Math.PI) / 360));
    const visible = tmp.z < 1 && dist > 0.6;
    overlay.hit.style.transform = `translate(${(px - rpx).toFixed(1)}px, ${(py - rpx).toFixed(1)}px)`;
    overlay.hit.style.width = overlay.hit.style.height = `${(rpx * 2).toFixed(1)}px`;
    overlay.hit.style.visibility = visible ? "visible" : "hidden";
    kitten.headTop(tmp2).project(camera);
    overlay.bubble.style.setProperty("--bx", `${((tmp2.x * 0.5 + 0.5) * w).toFixed(1)}px`);
    overlay.bubble.style.setProperty("--by", `${((-tmp2.y * 0.5 + 0.5) * h).toFixed(1)}px`);
    overlay.bubble.dataset.visible = visible && rig.prog < 0.16 ? "true" : "false";
  }

  // ---------------------------------------------------------------- per-frame update
  function update(dt: number) {
    clock += dt;
    house.uTime.value = clock;
    rig.intro = damp(rig.intro, 1, 1.2, dt);
    rig.prog = damp(rig.prog, rig.target, 5, dt);
    rig.mx = damp(rig.mx, rig.pointer ? rig.tmx : 0, 2.2, dt);
    rig.my = damp(rig.my, rig.pointer ? rig.tmy : 0, 2.2, dt);
    placeCamera(camera, rig.prog, true);
    const p = rig.prog;

    // door swings inward as the camera reaches the veranda
    const open = easeInOut(smooth(0.4, 0.68, p)) * 1.62;
    house.doorLeft.rotation.y = open;
    house.doorRight.rotation.y = -open;
    house.courtyardLight.intensity = (open / 1.62) * 26;
    debugState.prog = p;
    debugState.open = open;

    // the name and the foreground sheets dissolve as the camera walks through them
    word.setOpacity(smooth(1.0, 3.2, camera.position.distanceTo(word.placed.center)));
    for (const m of house.cutouts) {
      const d = camera.position.distanceTo(m.position);
      let a = smooth(0.5, 2.2, d);
      // the sprig frames a wide screen; on a tall one it would drift into the middle of the picture
      if (m.userData.nearLens) a = camera.aspect < 1.2 ? 0 : 1 - smooth(1.6, 2.6, d);
      (m.material as THREE.Material).opacity = a;
      m.visible = a > 0.01;
    }
    for (const h of haze) {
      h.position.x = h.userData.x0 + Math.sin(clock * h.userData.sp + h.userData.ph) * 4;
      h.quaternion.copy(camera.quaternion);
    }
    // lamp flames flicker; their light breathes with them
    house.lamps.forEach((l, i) => {
      const f = 0.82 + 0.12 * Math.sin(clock * (7.1 + i)) + 0.08 * Math.sin(clock * (13.7 + i * 2.3) + i);
      l.light.intensity = l.base * f;
      l.flame.scale.y = 0.034 * (0.9 + 0.15 * f);
    });
    beams.update(clock, camera);
    petals.update(dt, clock, camera);

    // kitten: follow the path, turn to face where it is going, track the cursor when resting
    kPrev.copy(kPos);
    const heading = kittenAt(p, kPos);
    kitten.root.position.copy(kPos);
    let dh = heading - kHeading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    kHeading += dh * (1 - Math.exp(-8 * dt));
    kitten.root.rotation.y = kHeading;
    const speed = dt > 0 ? kPrev.distanceTo(kPos) / dt : 0;
    gait = damp(gait, clamp(speed * 1.5, 0, 1), 6, dt);
    let target: THREE.Vector3 | null = null;
    if (gait < 0.3) {
      if (rig.pointer) {
        ray.setFromCamera(ndc.set(rig.tmx, rig.tmy), camera);
        // a plane just in front of the kitten, facing the camera
        const toCam = tmp.subVectors(camera.position, kPos).normalize();
        lookPlane.setFromNormalAndCoplanarPoint(toCam, kPos.clone().addScaledVector(toCam, 1.5));
        target = ray.ray.intersectPlane(lookPlane, look);
      } else {
        target = look.copy(camera.position);
      }
    }
    kitten.update(dt, clock, target, gait);
    // focus between the kitten and the door, so both stay sharp
    kitten.headTop(post.focus).lerp(DOOR_POINT, 0.3);
    keyLight.position.copy(kPos).addScaledVector(tmp.subVectors(camera.position, kPos).normalize(), 1.4);
    keyLight.position.y += 1.1;
  }

  // ---------------------------------------------------------------- loop and adaptive quality
  let running = true;
  let frame = 0;
  let last = performance.now();
  let disposed = false;
  let readySent = false;
  const perf = { acc: 0, n: 0, warm: 0, level: 0 };
  const debugState = { prog: 0, open: 0, level: () => perf.level, flags: () => post.flags(), bench: (frames?: number) => bench(frames) };
  if (/[?&](debug|bench)=1/.test(location.search)) (window as unknown as { __house: unknown }).__house = debugState;

  // if frames are slow for a couple of seconds, give up the most expensive effects first
  function adapt(dt: number) {
    perf.warm += dt;
    if (perf.warm < 3) return;
    perf.acc += dt;
    perf.n++;
    if (perf.acc < 2) return;
    const avg = perf.acc / perf.n;
    perf.acc = 0;
    perf.n = 0;
    if (avg <= 1 / 45 || perf.level >= 3) return;
    perf.level++;
    if (perf.level === 1) post.setFlags({ dof: false });
    if (perf.level === 2) post.setFlags({ ao: false });
    if (perf.level === 3) {
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
    adapt(dt);
    if (!readySent) {
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
    sun.shadow.needsUpdate = true;
  }

  /**
   * Measures the GPU cost of each effect: renders a fixed number of frames per configuration and
   * waits for the GPU to finish each one (gl.finish), so the timings are not capped by the display.
   */
  async function bench(frames = 90): Promise<BenchRow[]> {
    const wasRunning = running;
    running = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    const gl = renderer.getContext();
    const saved = post.flags();
    const steps: [string, Partial<PostFlags>, () => void][] = [
      ["scene only, no post-processing", { post: false }, () => {}],
      ["+ post pipeline (tone mapping)", { post: true, smaa: false, bloom: false, ao: false, dof: false, grade: false }, () => {}],
      ["+ SMAA anti-aliasing", { smaa: true }, () => {}],
      ["+ bloom", { bloom: true }, () => {}],
      ["+ grade, vignette, grain", { grade: true }, () => {}],
      ["+ ambient occlusion (N8AO, half res)", { ao: true }, () => {}],
      ["+ depth of field", { dof: true }, () => {}],
    ];
    const rows: BenchRow[] = [];
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
    for (const [label, f] of steps) {
      post.setFlags(f);
      rows.push({ label, ms: await measure() });
    }
    // scene layers, with everything on
    beams.group.visible = false;
    rows.push({ label: "all on, minus sun shafts and dust", ms: await measure() });
    beams.setOpacity(mood.beams, mood.beamColor);
    petals.mesh.visible = false;
    rows.push({ label: "all on, minus petals", ms: await measure() });
    petals.mesh.visible = true;
    post.setFlags(saved);
    running = wasRunning;
    last = performance.now();
    schedule();
    return rows;
  }

  resize();
  last = performance.now();
  schedule();

  return {
    setProgress: (p) => {
      rig.target = clamp(p, 0, 1);
    },
    setPointer: (nx, ny, active) => {
      rig.tmx = nx;
      rig.tmy = ny;
      rig.pointer = active;
    },
    setLighting: (mode) => applyMood(MOODS[mode]),
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
