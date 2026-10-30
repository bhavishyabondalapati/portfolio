// The placeholder kitten: built from spheres, capsules and tubes so there is no licence question,
// and covered in shell-texture fur. A real rigged GLB can replace it later behind the same interface.
//
// Shell fur: every furry part is drawn LAYERS times as one instanced mesh. Each copy (instance) is
// pushed a little further out along the surface normal and drooped by gravity, and a noise texture
// throws away more of each layer the further out it is, so strands taper to fine tips.
import * as THREE from "three";
import { capeCloth } from "./textures";
import { canvas, clamp, ctx2d, damp, easeOut, mulberry32, tex } from "./util";

export type Kitten = {
  root: THREE.Group;
  update: (dt: number, t: number, look: THREE.Vector3 | null, gait: number) => void;
  swing: () => void;
  /** World position just above the head, for the speech bubble. */
  headTop: (out: THREE.Vector3) => THREE.Vector3;
  /** World-space centre and radius used for the click target. */
  bounds: (out: THREE.Vector3) => number;
};

const C = {
  ginger: 0xdf914b,
  gingerDark: 0xb86a2e,
  cream: 0xf6e7cf,
  pink: 0xe89aa0,
  eye: 0x1c1410,
};
const LAYERS = 14;

function furNoise() {
  const S = 128;
  const c = canvas(S, S);
  const x = ctx2d(c);
  const im = x.createImageData(S, S);
  const r = mulberry32(99);
  for (let i = 0; i < S * S; i++) {
    const v = Math.pow(r(), 0.7) * 255;
    im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v;
    im.data[i * 4 + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  const t = tex(c, { srgb: false });
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

export function buildKitten(uTime: { value: number }): Kitten {
  const noise = furNoise();

  /** A fur material: `len` is the fur length in the part's own (unscaled) units. */
  function furMat(color: number, len: number, density: number) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 1 });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uLen = { value: len };
      sh.uniforms.uT = uTime;
      sh.uniforms.uNoise = { value: noise };
      sh.uniforms.uDensity = { value: density };
      sh.vertexShader =
        "uniform float uLen;\nuniform float uT;\nvarying float vH;\nvarying vec2 vFurUv;\n" +
        sh.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float h = (float(gl_InstanceID) + 1.0) / ${LAYERS}.0;
          vH = h;
          vFurUv = uv;
          transformed += objectNormal * h * uLen;
          transformed.y -= h * h * uLen * 0.5;
          transformed.x += sin(uT * 1.7 + position.y * 18.0) * h * h * uLen * 0.12;`
        );
      sh.fragmentShader =
        "uniform sampler2D uNoise;\nuniform float uDensity;\nvarying float vH;\nvarying vec2 vFurUv;\n" +
        sh.fragmentShader.replace(
          "#include <alphatest_fragment>",
          `float strand = texture2D(uNoise, vFurUv * uDensity).r;
          if (strand < vH * 0.92 + 0.04) discard;
          // darker at the roots, a little brighter at the tips: reads as depth in the coat
          diffuseColor.rgb *= mix(0.6, 1.1, vH);
          #include <alphatest_fragment>`
        );
    };
    m.customProgramCacheKey = () => `fur-${LAYERS}`;
    return m;
  }

  const solid = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const furCache = new Map<string, THREE.MeshStandardMaterial>();

  /** Adds a part twice: a solid base that casts the shadow, and its instanced fur shells. */
  function furry(geo: THREE.BufferGeometry, color: number, len: number, parent: THREE.Object3D, density = 46) {
    const base = new THREE.Mesh(geo, solid(color));
    base.castShadow = true;
    base.receiveShadow = true;
    const key = `${color}-${len}-${density}`;
    let mat = furCache.get(key);
    if (!mat) {
      mat = furMat(color, len, density);
      furCache.set(key, mat);
    }
    const shells = new THREE.InstancedMesh(geo, mat, LAYERS);
    shells.frustumCulled = false;
    shells.castShadow = false;
    shells.receiveShadow = true;
    base.add(shells);
    parent.add(base);
    return base;
  }

  const pink = new THREE.MeshStandardMaterial({ color: C.pink, roughness: 0.7 });
  const eyeM = new THREE.MeshStandardMaterial({ color: C.eye, roughness: 0.15 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.3, metalness: 0.85 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xdde1e6, roughness: 0.22, metalness: 0.9 });
  const teak = new THREE.MeshStandardMaterial({ color: 0x5b321b, roughness: 0.6 });

  const sphere = (seg = 20) => new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7));

  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.3;
  root.add(body);

  // a rounder, softer body: the fur adds about 3 cm all round
  const torso = furry(sphere(), C.ginger, 0.16, body);
  torso.scale.set(0.23, 0.25, 0.21);
  const belly = furry(sphere(16), C.cream, 0.22, body);
  belly.scale.set(0.15, 0.18, 0.1);
  belly.position.set(0, -0.03, 0.12);

  // brass breastplate over the chest (front half of a sphere band)
  const plate = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI, 0.55, 1.15), brass);
  plate.scale.set(0.25, 0.28, 0.235);
  body.add(plate);
  const plateRim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.013, 6, 24, Math.PI), brass);
  plateRim.rotation.set(-Math.PI / 2 + 0.25, 0, 0);
  plateRim.position.set(0, 0.18, 0.03);
  body.add(plateRim);

  // legs and big round feet
  for (const s of [-1, 1]) {
    const leg = furry(new THREE.CapsuleGeometry(0.06, 0.08, 6, 12), C.ginger, 0.03, body);
    leg.position.set(s * 0.085, -0.2, 0.02);
    const foot = furry(sphere(12), C.cream, 0.3, body);
    foot.scale.set(0.068, 0.045, 0.085);
    foot.position.set(s * 0.085, -0.27, 0.07);
  }

  // left arm resting at the side
  const armL = furry(new THREE.CapsuleGeometry(0.05, 0.12, 6, 12), C.ginger, 0.03, body);
  armL.position.set(-0.21, 0.0, 0.06);
  armL.rotation.z = -0.35;
  const pawL = furry(sphere(12), C.cream, 0.4, body);
  pawL.scale.setScalar(0.055);
  pawL.position.set(-0.25, -0.09, 0.08);

  // right arm on a shoulder pivot, holding the sword across the body
  const shoulder = new THREE.Group();
  shoulder.position.set(0.18, 0.12, 0.05);
  body.add(shoulder);
  const armR = furry(new THREE.CapsuleGeometry(0.05, 0.14, 6, 12), C.ginger, 0.03, shoulder);
  armR.position.set(-0.04, -0.06, 0.09);
  armR.rotation.set(1.1, 0, 0.7);
  const grip = new THREE.Group();
  grip.position.set(-0.13, -0.08, 0.2);
  shoulder.add(grip);
  const pawR = furry(sphere(12), C.cream, 0.4, grip);
  pawR.scale.setScalar(0.057);
  const sword = new THREE.Group();
  sword.rotation.z = 0.32;
  grip.add(sword);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.012), steel);
  blade.position.y = 0.3;
  sword.add(blade);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0354, 0.07, 4), steel);
  tip.rotation.y = Math.PI / 4;
  tip.scale.z = 0.25;
  tip.position.y = 0.585;
  sword.add(tip);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.03, 0.035), brass);
  guard.position.y = 0.045;
  sword.add(guard);
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.09, 8), teak);
  sword.add(hilt);
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), brass);
  pommel.position.y = -0.05;
  sword.add(pommel);

  // cape hanging from the shoulders, curved around the back, swaying in the shader
  const capeG = new THREE.PlaneGeometry(0.48, 0.48, 8, 10);
  const cpos = capeG.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cpos.count; i++) {
    const x = cpos.getX(i);
    const y = cpos.getY(i);
    cpos.setZ(i, -x * x * 1.5 - (0.24 - y) * 0.12);
    cpos.setX(i, x * (1 + (0.24 - y) * 0.6));
  }
  capeG.computeVertexNormals();
  const capeM = new THREE.MeshStandardMaterial({ map: tex(capeCloth(), { clamp: true }), side: THREE.DoubleSide, roughness: 0.9 });
  const capeWind = { value: 0 };
  capeM.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uTime;
    sh.uniforms.uWind = capeWind;
    sh.vertexShader =
      "uniform float uT;\nuniform float uWind;\n" +
      sh.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n" +
          "float low = 1.0 - uv.y;\n" +
          "transformed.z -= (0.03 + uWind * 0.12) * low * low * (0.6 + 0.4 * sin(uT * 2.6 + position.x * 9.0));\n" +
          "transformed.x += 0.02 * low * sin(uT * 1.9 + position.y * 7.0);\n"
      );
  };
  const cape = new THREE.Mesh(capeG, capeM);
  cape.position.set(0, -0.02, -0.19);
  cape.castShadow = true;
  body.add(cape);

  // a big plume of a tail: a thick tapering tube that curls up behind, swaying from its root
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, -0.16, -0.17);
  body.add(tailPivot);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.02, 0.06, -0.14),
    new THREE.Vector3(0.05, 0.22, -0.24),
    new THREE.Vector3(0.04, 0.42, -0.2),
    new THREE.Vector3(-0.01, 0.52, -0.09),
  ]);
  const tailSegs = 24;
  const tailRadial = 12;
  const tailGeo = new THREE.TubeGeometry(tailCurve, tailSegs, 1, tailRadial, false);
  const tp = tailGeo.attributes.position as THREE.BufferAttribute;
  const tc = new THREE.Vector3();
  const tv = new THREE.Vector3();
  for (let i = 0; i <= tailSegs; i++) {
    const t = i / tailSegs;
    tailCurve.getPointAt(t, tc);
    const rad = 0.035 + 0.045 * Math.sin(Math.PI * Math.min(1, t * 1.15)) - 0.02 * t;
    for (let j = 0; j <= tailRadial; j++) {
      const k = i * (tailRadial + 1) + j;
      tv.fromBufferAttribute(tp, k).sub(tc).multiplyScalar(rad).add(tc);
      tp.setXYZ(k, tv.x, tv.y, tv.z);
    }
  }
  tailGeo.computeVertexNormals();
  furry(tailGeo, C.ginger, 0.06, tailPivot, 40);

  // head on a neck pivot so it can turn toward the cursor
  const neck = new THREE.Group();
  neck.position.set(0, 0.21, 0.01);
  body.add(neck);
  const head = new THREE.Group();
  neck.add(head);
  const skull = furry(sphere(28), C.ginger, 0.12, head);
  skull.scale.set(0.22, 0.2, 0.205);
  skull.position.y = 0.17;
  const face = furry(sphere(20), C.cream, 0.14, head);
  face.scale.set(0.16, 0.115, 0.095);
  face.position.set(0, 0.115, 0.11);
  for (const s of [-1, 1]) {
    // full cheeks with tufts sticking out sideways
    const cheek = furry(sphere(14), C.cream, 0.3, head);
    cheek.scale.setScalar(0.058);
    cheek.position.set(s * 0.05, 0.09, 0.17);
    const tuft = furry(new THREE.ConeGeometry(0.03, 0.09, 8), C.cream, 0.02, head);
    tuft.position.set(s * 0.19, 0.08, 0.06);
    tuft.rotation.z = s * 1.9;
    // forehead stripes
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.06, 0.02), solid(C.gingerDark));
    stripe.position.set(s * 0.037, 0.32, 0.165);
    stripe.rotation.set(-0.5, 0, s * 0.25);
    head.add(stripe);
  }
  const stripeC = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.07, 0.02), solid(C.gingerDark));
  stripeC.position.set(0, 0.335, 0.16);
  stripeC.rotation.x = -0.55;
  head.add(stripeC);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.021, 10, 8), pink);
  nose.scale.set(1.2, 0.8, 0.8);
  nose.position.set(0, 0.12, 0.21);
  head.add(nose);

  const eyes: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const eg = new THREE.Group();
    eg.position.set(s * 0.082, 0.18, 0.168);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 12), eyeM);
    e.scale.set(1, 1.15, 0.7);
    eg.add(e);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), shine);
    hl.position.set(-0.014, 0.018, 0.03);
    eg.add(hl);
    head.add(eg);
    eyes.push(eg);
    // ears with a pink inside and white tufts
    const ear = furry(new THREE.ConeGeometry(0.08, 0.16, 12), C.ginger, 0.012, head);
    ear.position.set(s * 0.125, 0.35, -0.01);
    ear.rotation.z = -s * 0.38;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.1, 10), pink);
    inner.position.set(s * 0.122, 0.335, 0.025);
    inner.rotation.z = -s * 0.38;
    head.add(inner);
    for (let k = 0; k < 3; k++) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.07, 5), solid(C.cream));
      t.position.set(s * (0.11 + k * 0.01), 0.36 + k * 0.01, 0.035);
      t.rotation.z = -s * (0.2 + k * 0.25);
      head.add(t);
    }
  }

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !(m as unknown as THREE.InstancedMesh).isInstancedMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });

  // ---------------------------------------------------------------- behaviour
  let yaw = 0;
  let pitch = 0;
  let blinkAt = 2.5;
  let blinkT = -1;
  let swingT = -1;
  const local = new THREE.Vector3();

  function update(dt: number, t: number, look: THREE.Vector3 | null, gait: number) {
    const breath = Math.sin(t * 2.2);
    torso.scale.y = 0.25 * (1 + breath * 0.015);
    body.position.y = 0.3 + Math.abs(Math.sin(t * 9)) * 0.05 * gait;

    // head and eyes follow the target (the cursor, projected into the scene)
    let ty = 0;
    let tp2 = 0;
    if (look) {
      local.copy(look);
      root.worldToLocal(local);
      local.sub(neck.position).sub(body.position);
      ty = clamp(Math.atan2(local.x, Math.max(0.05, local.z)), -0.85, 0.85);
      tp2 = clamp(-Math.atan2(local.y, Math.hypot(local.x, local.z)), -0.45, 0.4);
    }
    yaw = damp(yaw, ty, 7, dt);
    pitch = damp(pitch, tp2, 7, dt);
    head.rotation.set(pitch, yaw, -yaw * 0.12);
    for (const e of eyes) e.position.x = Math.sign(e.position.x) * 0.082 + clamp(ty, -0.5, 0.5) * 0.012;

    // blink every few seconds
    if (blinkT < 0 && t > blinkAt) blinkT = 0;
    if (blinkT >= 0) {
      blinkT += dt;
      const k = blinkT < 0.07 ? 1 - blinkT / 0.07 : blinkT < 0.14 ? (blinkT - 0.07) / 0.07 : 1;
      for (const e of eyes) e.scale.y = Math.max(0.08, k);
      if (blinkT > 0.14) {
        blinkT = -1;
        blinkAt = t + 2.2 + Math.random() * 3.5;
      }
    }

    // the tail swishes from its root, faster when walking
    tailPivot.rotation.z = Math.sin(t * (1.6 + gait * 3)) * 0.22;
    tailPivot.rotation.x = Math.sin(t * 1.1 + 1) * 0.08;

    // the sword swing: wind up, slash, settle back to guard
    let wind = gait * 0.6;
    if (swingT >= 0) {
      swingT += dt;
      const s = swingT;
      let ax = 0;
      let az = 0;
      if (s < 0.16) {
        const k = easeOut(s / 0.16);
        ax = -1.1 * k;
        az = 0.35 * k;
      } else if (s < 0.34) {
        const k = easeOut((s - 0.16) / 0.18);
        ax = -1.1 + 2.6 * k;
        az = 0.35 - 0.9 * k;
      } else if (s < 0.8) {
        const k = easeOut((s - 0.34) / 0.46);
        ax = 1.5 * (1 - k);
        az = -0.55 * (1 - k);
      } else {
        swingT = -1;
      }
      shoulder.rotation.set(ax, 0, az);
      const hop = s < 0.5 ? Math.sin((s / 0.5) * Math.PI) : 0;
      body.position.y += hop * 0.09;
      body.scale.set(1 + hop * 0.04, 1 - hop * 0.03, 1);
      wind = Math.max(wind, 1 - s / 0.8);
    } else {
      shoulder.rotation.set(Math.sin(t * 1.3) * 0.03, 0, 0);
      body.scale.set(1, 1, 1);
    }
    capeWind.value = damp(capeWind.value, wind, 6, dt);
  }

  function swing() {
    if (swingT < 0) swingT = 0;
  }

  function headTop(out: THREE.Vector3) {
    out.set(0, 0.42, 0);
    return head.localToWorld(out);
  }

  function bounds(out: THREE.Vector3) {
    out.set(0, 0.36, 0);
    root.localToWorld(out);
    return 0.45 * root.scale.x;
  }

  return { root, update, swing, headTop, bounds };
}
