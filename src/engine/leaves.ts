// A few green leaves (neem and mango) drifting down in the breeze: sparse, slow, turning on two
// axes so they flash as they catch the light. Instanced quads, recycled into the space ahead of the
// camera so a small count always reads (the leaf-fall idea from ThreeUI's Temple Night).
import * as THREE from "three";
import { driftLeaf } from "./textures";
import { mulberry32, tex, TAU } from "./util";

type L = { x: number; y: number; z: number; fall: number; sway: number; ph: number; amp: number; roll: number; rollSp: number; spin: number; tilt: number; s: number };

export type Leaves = { mesh: THREE.InstancedMesh; update: (dt: number, t: number, cam: THREE.Camera) => void };

// leaves respawn in a disc this far ahead of the lens, never right in front of it
const AHEAD = 9;
const SPREAD = 7;

export function buildLeaves(scene: THREE.Scene, count: number): Leaves {
  const mat = new THREE.MeshStandardMaterial({ map: tex(driftLeaf(), { clamp: true }), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.45 });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09, 0.22), mat, count);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const rnd = mulberry32(404);
  const list: L[] = [];
  const greens = [0x4f7a2a, 0x3d6b2a, 0x6b8a2e, 0x8a9a3a, 0x5d7f33];
  for (let i = 0; i < count; i++) {
    mesh.setColorAt(i, new THREE.Color(greens[i % greens.length]));
    list.push({
      x: 0,
      y: 0,
      z: 0,
      fall: 0.08 + rnd() * 0.12,
      sway: 0.25 + rnd() * 0.5,
      ph: rnd() * TAU,
      amp: 0.4 + rnd() * 0.9,
      roll: rnd() * TAU,
      rollSp: 0.5 + rnd() * 1.4,
      spin: (rnd() - 0.5) * 1.6,
      tilt: rnd() * TAU,
      s: 0.8 + rnd() * 0.6,
    });
  }
  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const E = new THREE.Euler();
  const P = new THREE.Vector3();
  const S = new THREE.Vector3();
  const F = new THREE.Vector3();
  let seeded = false;

  function respawn(l: L, cam: THREE.Camera, first: boolean) {
    cam.getWorldDirection(F);
    F.y = 0;
    if (F.lengthSq() < 1e-6) F.set(0, 0, -1);
    F.normalize();
    const a = Math.random() * TAU;
    const r = Math.sqrt(Math.random()) * SPREAD;
    l.x = cam.position.x + F.x * AHEAD + Math.cos(a) * r;
    l.z = cam.position.z + F.z * AHEAD + Math.sin(a) * r * 0.8;
    l.y = first ? Math.random() * 6 : cam.position.y + 3.5 + Math.random() * 2.5;
  }

  function update(dt: number, t: number, cam: THREE.Camera) {
    for (let i = 0; i < list.length; i++) {
      const l = list[i];
      if (!seeded) respawn(l, cam, true);
      l.y -= l.fall * dt;
      l.roll += l.rollSp * dt;
      l.tilt += l.spin * dt;
      if (l.y < 0.02) respawn(l, cam, false);
      // a long, lazy side-slip, like a leaf shedding air off one edge and then the other
      const sw = Math.sin(t * l.sway + l.ph);
      P.set(l.x + sw * l.amp, l.y, l.z + Math.cos(t * l.sway * 0.7 + l.ph) * l.amp * 0.6);
      E.set(l.roll, l.tilt, sw * 0.9);
      Q.setFromEuler(E);
      S.setScalar(l.s);
      M.compose(P, Q, S);
      mesh.setMatrixAt(i, M);
    }
    seeded = true;
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, update };
}
