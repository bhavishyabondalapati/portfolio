// One renderer, one scene, one loop: the pattern ThreeUI's scene components use.
// React hosts the canvas and the HTML overlay; everything 3D lives here.
import * as THREE from "three";
import { buildHouse } from "./house";
import { buildKitten } from "./kitten";
import { buildPetals } from "./petals";
import { glow } from "./textures";
import { buildWordmark, WORD_Z } from "./wordmark";
import { clamp, damp, easeInOut, lerp, mulberry32, smooth, tex } from "./util";

export type Overlay = { hit: HTMLElement; bubble: HTMLElement };

export type HouseRenderer = {
  setProgress: (p: number) => void;
  setPointer: (nx: number, ny: number, active: boolean) => void;
  swing: () => void;
  attachOverlay: (o: Overlay) => void;
  setRunning: (on: boolean) => void;
  resize: () => void;
  dispose: () => void;
};

type Options = { word: string; fontFamily: string; quality?: "high" | "low"; onReady?: () => void };

// Camera waypoints for the hero walk: street, gate, foot of the steps, veranda, through the door.
// The hero camera stands a little above the yard (3.3 m), so the house rises above the
// giant name instead of hiding behind it.
const CAM = [
  { p: [0, 3.3, 23], t: [0, 3.4, 0], fov: 40 },
  { p: [0, 2.6, 15], t: [0, 3.0, 0], fov: 42 },
  { p: [0, 2.2, 8.0], t: [0, 2.8, -1], fov: 46 },
  { p: [0, 2.5, 3.6], t: [0, 2.45, -6], fov: 52 },
  { p: [0, 2.45, -1.8], t: [0, 2.3, -12], fov: 56 },
];

// Where the kitten is at each point of the scroll: [progress, x, y, z, heading].
// The first two entries are replaced at layout time with the top of the last letter.
const KITTEN_PATH: [number, number, number, number, number][] = [
  [0.0, 5, 1.3, 10.5, -0.3],
  [0.14, 5, 1.3, 10.5, -0.3],
  [0.25, 1.3, 0.0, 8.4, Math.PI],
  [0.36, 1.1, 0.0, 5.0, Math.PI],
  [0.44, 1.2, 0.9, 2.4, Math.PI],
  [0.5, 1.55, 0.9, 1.0, -0.35],
  [0.66, 1.55, 0.9, 1.0, -0.35],
  [0.8, 0.5, 0.9, -1.4, Math.PI],
  [1.0, 0.25, 0.9, -5.6, Math.PI],
];
const KITTEN_SCALE = 1.3;

export function createHouseRenderer(canvas: HTMLCanvasElement, opts: Options): HouseRenderer {
  const quality = opts.quality ?? "high";
  const vpW = () => Math.max(1, canvas.clientWidth);
  const vpH = () => Math.max(1, canvas.clientHeight);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(vpW(), vpH(), false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const HAZE = new THREE.Color(0xe9e1cf);
  scene.fog = new THREE.FogExp2(HAZE, 0.0125);
  scene.background = HAZE.clone();
  const camera = new THREE.PerspectiveCamera(CAM[0].fov, vpW() / vpH(), 0.1, 260);

  // ---------------------------------------------------------------- sky
  const sunDir = new THREE.Vector3(-0.55, 0.62, 0.56).normalize();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(200, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenith: { value: new THREE.Color(0x8db6d6) },
        uHorizon: { value: new THREE.Color(0xf1e3c8) },
        uSun: { value: new THREE.Color(0xfff0d2) },
        uSunDir: { value: sunDir },
      },
      vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader:
        "uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunDir; varying vec3 vDir;\n" +
        "void main(){ float h = clamp(vDir.y, 0.0, 1.0);\n" +
        " vec3 c = mix(uHorizon, uZenith, pow(h, 0.55));\n" +
        " float s = max(dot(normalize(vDir), uSunDir), 0.0);\n" +
        " c += uSun * (pow(s, 24.0) * 0.6 + pow(s, 4.0) * 0.12);\n" +
        " gl_FragColor = vec4(c, 1.0);\n #include <colorspace_fragment>\n }",
    })
  );
  scene.add(sky);

  // ---------------------------------------------------------------- light: a low morning sun from the left
  const hemi = new THREE.HemisphereLight(0xdfe9f2, 0xa98463, 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b4, 3.1);
  sun.position.copy(sunDir).multiplyScalar(30);
  sun.target.position.set(0, 2, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality === "high" ? 2048 : 1024, quality === "high" ? 2048 : 1024);
  const sc = sun.shadow.camera;
  sc.left = -16;
  sc.right = 16;
  sc.top = 16;
  sc.bottom = -12;
  sc.near = 5;
  sc.far = 70;
  sun.shadow.radius = 3;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(sun, sun.target);
  const bounce = new THREE.DirectionalLight(0xf3d8c0, 0.35);
  bounce.position.set(10, 3, 12);
  scene.add(bounce);

  // ---------------------------------------------------------------- the world
  const house = buildHouse(scene, quality);
  const word = buildWordmark(scene, opts.word, opts.fontFamily);
  const petals = buildPetals(scene, quality === "high" ? 140 : 60);
  const kitten = buildKitten(house.uTime);
  kitten.root.scale.setScalar(KITTEN_SCALE);
  scene.add(kitten.root);

  // haze slabs drifting across the yard
  const hazeTex = tex(glow("rgba(255,246,226,.55)", "rgba(255,236,206,.16)"), { clamp: true });
  const haze: THREE.Mesh[] = [];
  const rnd = mulberry32(66);
  for (let i = 0; i < 5; i++) {
    const s = 10 + rnd() * 10;
    const h = new THREE.Mesh(
      new THREE.PlaneGeometry(s, s * 0.45),
      new THREE.MeshBasicMaterial({ map: hazeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.05 + rnd() * 0.05 })
    );
    h.position.set((rnd() - 0.5) * 30, 1 + rnd() * 5, -6 + rnd() * 18);
    h.userData = { x0: h.position.x, sp: 0.05 + rnd() * 0.1, ph: rnd() * 6 };
    scene.add(h);
    haze.push(h);
  }

  // ---------------------------------------------------------------- camera rig
  const curveP = new THREE.CatmullRomCurve3(CAM.map((c) => new THREE.Vector3(...(c.p as [number, number, number]))), false, "catmullrom", 0.4);
  const curveT = new THREE.CatmullRomCurve3(CAM.map((c) => new THREE.Vector3(...(c.t as [number, number, number]))), false, "catmullrom", 0.4);
  const rig = { target: 0, prog: 0, mx: 0, my: 0, tmx: 0, tmy: 0, pointer: false, intro: 0 };
  const _p = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const _d = new THREE.Vector3();

  /** Scroll progress to position along the walk: a short hold first, then the walk. */
  const walkU = (p: number) => (p < 0.14 ? (p / 0.14) * 0.04 : 0.04 + ((p - 0.14) / 0.86) * 0.96);

  function placeCamera(cam: THREE.PerspectiveCamera, p: number, withDrift: boolean) {
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
      _p.addScaledVector(_d, nf * 6);
      _p.y += nf * 0.6;
      fov *= 1 + nf * 0.3;
    }
    if (withDrift) {
      const io = 1 - rig.intro;
      _p.z += io * 3.2;
      _p.y += io * 0.3;
      fov += io * 5;
      const par = 1 - smooth(0, 0.5, u) * 0.6;
      _p.x += rig.mx * 0.55 * par;
      _p.y += rig.my * 0.22 * par;
      _t.x -= rig.mx * 0.18 * par;
      _t.y -= rig.my * 0.1 * par;
    }
    cam.position.copy(_p);
    cam.lookAt(_t);
    if (Math.abs(cam.fov - fov) > 1e-4) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }

  function layoutWord() {
    const hero = new THREE.PerspectiveCamera(CAM[0].fov, vpW() / vpH(), 0.1, 260);
    placeCamera(hero, 0, false);
    word.layout(hero);
    // the kitten starts sitting on top of the last letter
    const top = word.letterTop(opts.word.length - 1, new THREE.Vector3());
    for (const k of [0, 1]) {
      KITTEN_PATH[k][1] = top.x;
      KITTEN_PATH[k][2] = top.y;
      KITTEN_PATH[k][3] = WORD_Z + 0.05;
    }
  }

  // ---------------------------------------------------------------- kitten path
  const kPos = new THREE.Vector3();
  const kPrev = new THREE.Vector3();
  let kHeading = KITTEN_PATH[0][4];
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
    // hop when the height changes (down from the wall, up the steps)
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
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();

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
    const bx = (tmp2.x * 0.5 + 0.5) * w;
    const by = (-tmp2.y * 0.5 + 0.5) * h;
    overlay.bubble.style.setProperty("--bx", `${bx.toFixed(1)}px`);
    overlay.bubble.style.setProperty("--by", `${by.toFixed(1)}px`);
    overlay.bubble.dataset.visible = visible && rig.prog < 0.16 ? "true" : "false";
  }

  // ---------------------------------------------------------------- loop
  let running = true;
  let frame = 0;
  let last = performance.now();
  let clock = 0;
  let disposed = false;
  let readySent = false;
  const debugState = { prog: 0, open: 0, target: () => rig.target };
  if (/[?&]debug=1/.test(location.search)) (window as unknown as { __house: unknown }).__house = debugState;

  function tick(now: number) {
    frame = 0;
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    house.uTime.value = clock;

    rig.intro = damp(rig.intro, 1, 1.4, dt);
    rig.prog = damp(rig.prog, rig.target, 5, dt);
    rig.mx = damp(rig.mx, rig.pointer ? rig.tmx : 0, 2.2, dt);
    rig.my = damp(rig.my, rig.pointer ? rig.tmy : 0, 2.2, dt);
    placeCamera(camera, rig.prog, true);
    const p = rig.prog;

    // door swings inward as the camera reaches the veranda
    const open = easeInOut(smooth(0.4, 0.68, p)) * 1.62;
    debugState.prog = p;
    debugState.open = open;
    house.doorLeft.rotation.y = open;
    house.doorRight.rotation.y = -open;
    house.courtyardLight.intensity = (open / 1.62) * 26;

    // the name and the foreground sheets dissolve as the camera walks through them
    word.setOpacity(smooth(1.2, 4.2, camera.position.z - WORD_Z));
    for (const m of house.cutouts) {
      const dz = camera.position.z - m.position.z;
      let a = smooth(0.4, 2.6, dz);
      // the creepers frame the lens; when a tall screen pushes the camera back they would hang mid-frame
      if (m.userData.nearLens) a *= 1 - smooth(4.5, 6, dz);
      (m.material as THREE.Material).opacity = a;
      m.visible = a > 0.01;
    }
    for (const h of haze) {
      h.position.x = h.userData.x0 + Math.sin(clock * h.userData.sp + h.userData.ph) * 4;
      h.quaternion.copy(camera.quaternion);
    }
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
        ray.setFromCamera(new THREE.Vector2(rig.tmx, rig.tmy), camera);
        plane.constant = -(kPos.z + 1.6);
        target = ray.ray.intersectPlane(plane, look);
      } else {
        target = look.copy(camera.position);
      }
    }
    kitten.update(dt, clock, target, gait);

    renderer.render(scene, camera);
    updateOverlay();
    if (!readySent) {
      readySent = true;
      opts.onReady?.();
    }
    schedule();
  }

  function schedule() {
    if (!disposed && running && !document.hidden && !frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  const onVisibility = () => {
    if (document.hidden && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else schedule();
  };
  document.addEventListener("visibilitychange", onVisibility);

  function resize() {
    renderer.setSize(vpW(), vpH(), false);
    camera.aspect = vpW() / vpH();
    camera.updateProjectionMatrix();
    layoutWord();
    sun.shadow.needsUpdate = true;
  }

  resize();
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
    swing: () => kitten.swing(),
    attachOverlay: (o) => {
      overlay = o;
    },
    setRunning: (on) => {
      running = on;
      if (on) schedule();
      else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    resize,
    dispose: () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
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
