// Falling jasmine petals: instanced quads that tumble on two axes, recycled into
// the space in front of the camera so a small count always fills the frame.
// Same recycling idea as the leaf fall in ThreeUI's Temple Night.
import * as THREE from "three";
import { petal } from "./textures";
import { mulberry32, tex, TAU } from "./util";

type P = { x: number; y: number; z: number; fall: number; sway: number; ph: number; amp: number; roll: number; rollSp: number; spin: number; tilt: number; s: number };

export type Petals = { mesh: THREE.InstancedMesh; update: (dt: number, t: number, cam: THREE.Camera, burst?: number) => void };

// petals respawn in a disc this far ahead of the lens, never right in front of it
const AHEAD = 10;
const SPREAD = 6;

export function buildPetals(scene: THREE.Scene, count: number): Petals {
  const mat = new THREE.MeshStandardMaterial({
    map: tex(petal(), { clamp: true }),
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.6,
    emissive: 0xfff6e0,
    emissiveIntensity: 0.18,
  });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.13), mat, count);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const rnd = mulberry32(404);
  const list: P[] = [];
  for (let i = 0; i < count; i++) {
    list.push({
      x: 0,
      y: 0,
      z: 0,
      fall: 0.16 + rnd() * 0.3,
      sway: 0.4 + rnd() * 1.2,
      ph: rnd() * TAU,
      amp: 0.15 + rnd() * 0.5,
      roll: rnd() * TAU,
      rollSp: 0.6 + rnd() * 2.2,
      spin: (rnd() - 0.5) * 2.4,
      tilt: rnd() * TAU,
      s: 0.7 + rnd() * 0.7,
    });
  }
  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const E = new THREE.Euler();
  const Pv = new THREE.Vector3();
  const S = new THREE.Vector3();
  const F = new THREE.Vector3();
  let seeded = false;

  function respawn(p: P, cam: THREE.Camera, first: boolean) {
    cam.getWorldDirection(F);
    F.y = 0;
    if (F.lengthSq() < 1e-6) F.set(0, 0, -1);
    F.normalize();
    const a = Math.random() * TAU;
    const r = Math.sqrt(Math.random()) * SPREAD;
    p.x = cam.position.x + F.x * AHEAD + Math.cos(a) * r;
    p.z = cam.position.z + F.z * AHEAD + Math.sin(a) * r * 0.8;
    p.y = first ? Math.random() * 7 : cam.position.y + 4.5 + Math.random() * 2;
  }

  function update(dt: number, t: number, cam: THREE.Camera, burst = 0) {
    const fallBoost = 1 + burst * 2.5;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!seeded) respawn(p, cam, true);
      p.y -= p.fall * dt * fallBoost;
      p.roll += p.rollSp * dt;
      p.tilt += p.spin * dt;
      if (p.y < 0.02) respawn(p, cam, false);
      const sw = Math.sin(t * p.sway + p.ph);
      Pv.set(p.x + sw * p.amp, p.y, p.z + Math.cos(t * p.sway * 0.7 + p.ph) * p.amp * 0.6);
      E.set(p.roll, p.tilt, sw * 0.6);
      Q.setFromEuler(E);
      S.setScalar(p.s);
      M.compose(Pv, Q, S);
      mesh.setMatrixAt(i, M);
    }
    seeded = true;
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, update };
}
