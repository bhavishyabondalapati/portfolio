// The placeholder kitten: built from spheres, capsules and boxes so there is no licence
// question. A real rigged GLB can replace it later behind the same small interface.
import * as THREE from "three";
import { capeCloth } from "./textures";
import { clamp, damp, easeOut, tex } from "./util";

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
  ginger: 0xd98b45,
  gingerDark: 0xb86a2e,
  cream: 0xf3e2c6,
  pink: 0xe89aa0,
  eye: 0x1c1410,
};

export function buildKitten(uTime: { value: number }): Kitten {
  const fur = new THREE.MeshStandardMaterial({ color: C.ginger, roughness: 0.85 });
  const furDark = new THREE.MeshStandardMaterial({ color: C.gingerDark, roughness: 0.85 });
  const cream = new THREE.MeshStandardMaterial({ color: C.cream, roughness: 0.9 });
  const pink = new THREE.MeshStandardMaterial({ color: C.pink, roughness: 0.7 });
  const eyeM = new THREE.MeshStandardMaterial({ color: C.eye, roughness: 0.2 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.3, metalness: 0.85 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xdde1e6, roughness: 0.22, metalness: 0.9 });
  const teak = new THREE.MeshStandardMaterial({ color: 0x5b321b, roughness: 0.6 });

  const sph = (r: number, m: THREE.Material, w = 20, h = 14) => new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m);

  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.3;
  root.add(body);

  const torso = sph(1, fur);
  torso.scale.set(0.2, 0.24, 0.18);
  body.add(torso);
  const belly = sph(1, cream);
  belly.scale.set(0.14, 0.18, 0.09);
  belly.position.set(0, -0.03, 0.1);
  body.add(belly);
  // brass breastplate over the chest (front half of a sphere band)
  const plate = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI, 0.55, 1.15), brass);
  plate.scale.set(0.212, 0.252, 0.192);
  body.add(plate);
  const plateRim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 24, Math.PI), brass);
  plateRim.rotation.set(-Math.PI / 2 + 0.25, 0, 0);
  plateRim.position.set(0, 0.17, 0.02);
  body.add(plateRim);

  // legs and feet
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.08, 6, 12), fur);
    leg.position.set(s * 0.075, -0.2, 0.02);
    body.add(leg);
    const foot = sph(0.06, cream);
    foot.scale.set(1, 0.6, 1.3);
    foot.position.set(s * 0.075, -0.27, 0.06);
    body.add(foot);
  }

  // left arm resting at the side
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.12, 6, 12), fur);
  armL.position.set(-0.19, 0.0, 0.05);
  armL.rotation.z = -0.35;
  body.add(armL);
  const pawL = sph(0.05, cream);
  pawL.position.set(-0.22, -0.09, 0.07);
  body.add(pawL);

  // right arm on a shoulder pivot, holding the sword upright in front of the chest
  const shoulder = new THREE.Group();
  shoulder.position.set(0.16, 0.12, 0.04);
  body.add(shoulder);
  const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.14, 6, 12), fur);
  armR.position.set(-0.04, -0.06, 0.08);
  armR.rotation.set(1.1, 0, 0.7);
  shoulder.add(armR);
  const grip = new THREE.Group();
  grip.position.set(-0.12, -0.08, 0.17);
  shoulder.add(grip);
  const pawR = sph(0.052, cream);
  grip.add(pawR);
  const sword = new THREE.Group();
  // held slightly across the body, so the blade reads at a distance
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
  hilt.position.y = 0.0;
  sword.add(hilt);
  const pommel = sph(0.022, brass, 10, 8);
  pommel.position.y = -0.05;
  sword.add(pommel);

  // cape hanging from the shoulders, curved around the back, swaying in the shader
  const capeG = new THREE.PlaneGeometry(0.44, 0.46, 8, 10);
  const pos = capeG.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, -x * x * 1.6 - (0.23 - y) * 0.12);
    pos.setX(i, x * (1 + (0.23 - y) * 0.6));
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
  cape.position.set(0, -0.02, -0.16);
  body.add(cape);

  // tail: a chain of spheres that sways
  const tailBalls: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const b = sph(0.042 - i * 0.002, i > 5 ? furDark : fur, 10, 8);
    body.add(b);
    tailBalls.push(b);
  }

  // head on a neck pivot so it can turn toward the cursor
  const neck = new THREE.Group();
  neck.position.set(0, 0.2, 0.01);
  body.add(neck);
  const head = new THREE.Group();
  neck.add(head);
  const skull = sph(0.19, fur, 28, 20);
  skull.scale.set(1.08, 0.95, 1);
  skull.position.y = 0.16;
  head.add(skull);
  const face = sph(0.15, cream, 24, 16);
  face.scale.set(1.05, 0.72, 0.6);
  face.position.set(0, 0.11, 0.1);
  head.add(face);
  for (const s of [-1, 1]) {
    const cheek = sph(0.05, cream);
    cheek.position.set(s * 0.042, 0.085, 0.165);
    head.add(cheek);
    // forehead stripes
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.06, 0.02), furDark);
    stripe.position.set(s * 0.035, 0.3, 0.155);
    stripe.rotation.set(-0.5, 0, s * 0.25);
    head.add(stripe);
  }
  const stripeC = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.07, 0.02), furDark);
  stripeC.position.set(0, 0.315, 0.15);
  stripeC.rotation.x = -0.55;
  head.add(stripeC);
  const nose = sph(0.02, pink, 10, 8);
  nose.scale.set(1.2, 0.8, 0.8);
  nose.position.set(0, 0.118, 0.198);
  head.add(nose);

  const eyes: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const eg = new THREE.Group();
    eg.position.set(s * 0.078, 0.175, 0.155);
    const e = sph(0.042, eyeM, 16, 12);
    e.scale.set(1, 1.15, 0.7);
    eg.add(e);
    const hl = sph(0.012, shine, 8, 6);
    hl.position.set(-0.012, 0.016, 0.026);
    eg.add(hl);
    head.add(eg);
    eyes.push(eg);
    // ears
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.15, 12), fur);
    ear.position.set(s * 0.115, 0.335, -0.01);
    ear.rotation.z = -s * 0.38;
    head.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 10), pink);
    inner.position.set(s * 0.113, 0.32, 0.02);
    inner.rotation.z = -s * 0.38;
    head.add(inner);
  }

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  shine.toneMapped = false;

  // ---------------------------------------------------------------- behaviour
  let yaw = 0;
  let pitch = 0;
  let blinkAt = 2.5;
  let blinkT = -1;
  let swingT = -1;
  const local = new THREE.Vector3();

  function update(dt: number, t: number, look: THREE.Vector3 | null, gait: number) {
    // breathing and a gentle bob while walking
    const breath = Math.sin(t * 2.2);
    torso.scale.y = 0.24 * (1 + breath * 0.015);
    body.position.y = 0.3 + Math.abs(Math.sin(t * 9)) * 0.05 * gait;

    // head and eyes follow the target (the cursor, projected into the scene)
    let ty = 0;
    let tp = 0;
    if (look) {
      local.copy(look);
      root.worldToLocal(local);
      const n = neck.position.clone().add(body.position);
      local.sub(n);
      ty = clamp(Math.atan2(local.x, Math.max(0.05, local.z)), -0.85, 0.85);
      tp = clamp(-Math.atan2(local.y, Math.hypot(local.x, local.z)), -0.45, 0.4);
    }
    yaw = damp(yaw, ty, 7, dt);
    pitch = damp(pitch, tp, 7, dt);
    head.rotation.set(pitch, yaw, -yaw * 0.12);
    for (const e of eyes) {
      e.position.x = Math.sign(e.position.x) * 0.078 + clamp(ty, -0.5, 0.5) * 0.012;
    }

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

    // tail sway
    for (let i = 0; i < tailBalls.length; i++) {
      const k = i / (tailBalls.length - 1);
      const sw = Math.sin(t * 2.4 - k * 2.2) * 0.07 * k;
      tailBalls[i].position.set(sw + Math.sin(k * 1.4) * 0.02, -0.17 + k * 0.32 + Math.sin(k * 2.6) * 0.04, -0.17 - Math.sin(k * 1.6) * 0.14);
    }

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
    out.set(0, 0.4, 0);
    return head.localToWorld(out);
  }

  function bounds(out: THREE.Vector3) {
    out.set(0, 0.35, 0);
    root.localToWorld(out);
    return 0.42 * root.scale.x;
  }

  return { root, update, swing, headTop, bounds };
}
