// The inside of the house, behind the front door (z < 0):
//   hall      z 0 .. -8    carved teak ceiling of stepped brackets, turned pillars on blue bases
//   courtyard z -8 .. -24  open to the sky: a sunken court ringed by a pillared walkway, green bell
//                          lamps on the beams, two swings, yellow Athangudi tiles, a blue tile dado
//   corridor  z -24 .. -52 green faceted pillars on painted bases, a sunlit garden on the open side,
//                          a glossy tiled floor with real (planar) reflections, one exhibit per bay
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import type { Lamp, Mats } from "./house";
import { buildPalms } from "./palms";
import * as T from "./textures";
import { tex } from "./util";

const PLINTH = 0.9;

/** An exhibit bay in the corridor: its anchor for the HTML panel and its lamp. */
export type Bay = { id: string; anchor: THREE.Vector3; center: THREE.Vector3; lamp: Lamp };

export type Interior = {
  /** The three rooms as separate groups, so the renderer can skip the ones you cannot see. */
  zones: { hall: THREE.Group; court: THREE.Group; corridor: THREE.Group };
  lamps: Lamp[];
  bays: Bay[];
  /** Points in the courtyard colonnade where the experience panels are pinned. */
  courtAnchors: THREE.Vector3[];
  reflector: THREE.Mesh | null;
};

export function buildInterior(scene: THREE.Scene, mat: Mats, uTime: { value: number }, quality: "high" | "low", bayIds: string[]): Interior {
  const root = new THREE.Group();
  scene.add(root);
  const lamps: Lamp[] = [];
  const add = <O extends THREE.Object3D>(o: O) => {
    root.add(o);
    return o;
  };
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = true;
    b.receiveShadow = true;
    return add(b);
  };
  const surf = (s: T.Surface, repeat: [number, number], o: { roughness?: number; color?: number; metalness?: number } = {}) => {
    const m = new THREE.MeshStandardMaterial({ map: tex(s.map, { repeat }), roughness: o.roughness ?? 0.8, color: o.color ?? 0xffffff, metalness: o.metalness ?? 0 });
    if (s.normal) m.normalMap = tex(s.normal, { repeat, srgb: false });
    return m;
  };
  // one carved-door material for every door in the house (painting it is the slowest texture)
  const doorMat = surf(T.doorLeaf(), [1, 1], { roughness: 0.5 });
  const dadoMat = new THREE.MeshStandardMaterial({ map: tex(T.blueDado(), { repeat: [8, 1] }), roughness: 0.35 });
  const graniteS = T.granite();
  const greenPillar = new THREE.MeshStandardMaterial({ color: 0x6d9a52, roughness: 0.45 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xe0b54a, roughness: 0.5 });
  const bell = new THREE.MeshStandardMaterial({ color: 0x2f7a4a, roughness: 0.15, metalness: 0.1, emissive: 0x3aa860, emissiveIntensity: 0.25, transparent: true, opacity: 0.88 });

  // ================================================================ hall (z 0 .. -8)
  const HW = 3.0;
  const HD = 8;
  const hallTop = PLINTH + 4.2;
  // polished red oxide floor, as on the veranda
  box(HW * 2, 0.05, HD, mat.oxide, 0, PLINTH + 0.02, -HD / 2);
  for (const s of [-1, 1]) {
    box(0.3, 4.2, HD, mat.plaster, s * HW, PLINTH + 2.1, -HD / 2);
    box(0.02, 0.9, HD, dadoMat, s * (HW - 0.16), PLINTH + 0.45, -HD / 2);
  }
  // the carved ceiling: a grid of coffers, each hung with three stepped teak brackets
  const cell = 0.75;
  const nx = Math.floor((HW * 2) / cell);
  const nz = Math.floor(HD / cell);
  const steps = [
    { w: 0.66, h: 0.12, y: 0 },
    { w: 0.5, h: 0.1, y: -0.12 },
    { w: 0.32, h: 0.09, y: -0.22 },
  ];
  const bracketGeo = new THREE.BoxGeometry(1, 1, 1);
  const brackets = new THREE.InstancedMesh(bracketGeo, mat.teak, nx * nz * steps.length);
  const m4 = new THREE.Matrix4();
  let bi = 0;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const cx = -HW + cell / 2 + i * cell;
      const cz = -cell / 2 - j * cell;
      for (const st of steps) {
        m4.compose(new THREE.Vector3(cx, hallTop - 0.1 + st.y, cz), new THREE.Quaternion(), new THREE.Vector3(st.w, st.h, st.w));
        brackets.setMatrixAt(bi++, m4);
      }
    }
  }
  brackets.castShadow = true;
  brackets.receiveShadow = true;
  add(brackets);
  box(HW * 2 + 0.3, 0.12, HD, mat.teakDark, 0, hallTop + 0.06, -HD / 2);
  for (let j = 0; j <= nz; j++) box(HW * 2, 0.08, 0.06, mat.teakDark, 0, hallTop - 0.04, -j * cell);
  // two rows of turned teak pillars on blue bases
  for (const z of [-2.2, -4.4, -6.6]) for (const x of [-1.9, 1.9]) add(turnedPillar(x, z, PLINTH, hallTop - 0.35, mat));
  // the far doorway, framing the courtyard
  frame(add, 0, -HD, 2.2, 3.1, mat);

  // ================================================================ courtyard (z -8 .. -24)
  const CW = 8; // half width
  const Z0 = -8;
  const Z1 = -24;
  const COURT = { x: 5.4, z0: -10.6, z1: -21.4 }; // edge of the sunken court
  const SUNK = 0.45; // the court floor sits this far below the walkway
  // waxed, not mirror-polished: a sharper finish turned the overhead sun into a column of glare
  const walkway = surf(T.athangudi(), [14, 14], { roughness: 0.6 });
  // walkway floor all round, then the sunken granite court in the middle
  box(CW * 2, 0.05, Z0 - Z1, walkway, 0, PLINTH + 0.02, (Z0 + Z1) / 2);
  const courtFloor = box(COURT.x * 2, 0.06, COURT.z0 - COURT.z1, surf(graniteS, [4, 4], { roughness: 0.55 }), 0, PLINTH - SUNK, (COURT.z0 + COURT.z1) / 2);
  courtFloor.position.y = PLINTH - SUNK;
  // the step down into the court, a granite kerb
  for (const s of [-1, 1]) {
    box(0.3, SUNK, COURT.z0 - COURT.z1, mat.granite, s * COURT.x, PLINTH - SUNK / 2, (COURT.z0 + COURT.z1) / 2);
    box(COURT.x * 2, SUNK, 0.3, mat.granite, 0, PLINTH - SUNK / 2, s > 0 ? COURT.z0 : COURT.z1);
  }
  // hide the walkway floor inside the court opening
  box(COURT.x * 2 - 0.3, 0.07, COURT.z0 - COURT.z1 - 0.3, mat.granite, 0, PLINTH - SUNK - 0.03, (COURT.z0 + COURT.z1) / 2).visible = false;
  // outer walls with a dado, and doors leading off the walkway
  const wallH = 4.7;
  for (const s of [-1, 1]) {
    box(0.3, wallH, Z0 - Z1, mat.plaster, s * CW, PLINTH + wallH / 2, (Z0 + Z1) / 2);
    box(0.02, 1.0, Z0 - Z1, dadoMat, s * (CW - 0.16), PLINTH + 0.5, (Z0 + Z1) / 2);
    for (const z of [-12, -16, -20]) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 1.2), doorMat);
      d.position.set(s * (CW - 0.18), PLINTH + 1.2, z);
      d.castShadow = true;
      add(d);
      frame(add, s * (CW - 0.2), z, 1.4, 2.6, mat, Math.PI / 2);
    }
  }
  for (const [z, gap] of [[Z0, 2.2], [Z1, 2.2]] as const) {
    const side = (CW * 2 - gap) / 2;
    box(side, wallH, 0.3, mat.plaster, -(gap / 2 + side / 2), PLINTH + wallH / 2, z);
    box(side, wallH, 0.3, mat.plaster, gap / 2 + side / 2, PLINTH + wallH / 2, z);
    box(gap, wallH - 3.1, 0.3, mat.plaster, 0, PLINTH + 3.1 + (wallH - 3.1) / 2, z);
  }
  frame(add, 0, Z1, 2.2, 3.1, mat);
  // pillars round the court, a beam ring on top, and the roof sloping in toward the open sky
  const pillarTop = PLINTH + 3.4;
  const courtPillars: [number, number][] = [];
  for (const z of [-10.6, -13.3, -16, -18.7, -21.4]) courtPillars.push([-COURT.x, z], [COURT.x, z]);
  for (const x of [-2.7, 2.7]) courtPillars.push([x, COURT.z0], [x, COURT.z1]);
  for (const [x, z] of courtPillars) add(turnedPillar(x, z, PLINTH, pillarTop, mat));
  for (const s of [-1, 1]) {
    box(0.3, 0.3, COURT.z0 - COURT.z1 + 0.3, mat.teak, s * COURT.x, pillarTop + 0.15, (COURT.z0 + COURT.z1) / 2);
    box(COURT.x * 2 + 0.3, 0.3, 0.3, mat.teak, 0, pillarTop + 0.15, s > 0 ? COURT.z0 : COURT.z1);
  }
  const roofLow = pillarTop + 0.3;
  const roofHigh = PLINTH + wallH;
  // four sloping roof planes, tiles visible from below as teak boards
  const slopeRoof = (cx: number, cz: number, w: number, d: number, rotX: number, rotY: number) => {
    const g = new THREE.Group();
    const run = Math.hypot(d, roofHigh - roofLow);
    const plane = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, run), mat.roof);
    plane.castShadow = true;
    plane.receiveShadow = true;
    g.add(plane);
    const under = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, run), mat.teakDark);
    under.position.y = -0.06;
    g.add(under);
    g.rotation.set(rotX, rotY, 0, "YXZ");
    g.position.set(cx, (roofLow + roofHigh) / 2, cz);
    add(g);
  };
  const tilt = Math.atan2(roofHigh - roofLow, CW - COURT.x);
  slopeRoof(-(CW + COURT.x) / 2, (COURT.z0 + COURT.z1) / 2, COURT.z0 - COURT.z1 + 2.6, CW - COURT.x, -tilt, Math.PI / 2);
  slopeRoof((CW + COURT.x) / 2, (COURT.z0 + COURT.z1) / 2, COURT.z0 - COURT.z1 + 2.6, CW - COURT.x, -tilt, -Math.PI / 2);
  const tiltZ = Math.atan2(roofHigh - roofLow, 2.6);
  slopeRoof(0, (Z0 + COURT.z0) / 2, CW * 2, 2.6, tiltZ, 0);
  slopeRoof(0, (Z1 + COURT.z1) / 2, CW * 2, 2.6, -tiltZ, 0);
  // green glass bell lamps hanging in each bay of the walkway
  for (const z of [-11.95, -14.65, -17.35, -20.05]) {
    for (const s of [-1, 1]) lamps.push(bellLamp(add, s * (COURT.x + 0.9), pillarTop - 0.2, z, bell, mat));
  }
  // two swings on chains, one each side
  for (const [x, z] of [[-6.7, -14.6], [6.7, -18.4]] as const) swing(add, x, z, pillarTop, mat);
  // potted plants at the corners of the court
  for (const [x, z] of [[-4.6, -11.4], [4.6, -11.4], [-4.6, -20.6], [4.6, -20.6]] as const) pot(add, x, PLINTH - SUNK, z);
  const courtAnchors = [new THREE.Vector3(-COURT.x - 0.2, PLINTH + 1.9, -14.65), new THREE.Vector3(COURT.x + 0.2, PLINTH + 1.9, -17.35)];

  // ================================================================ corridor (z -24 .. -52)
  const C0 = -24;
  const C1 = -52;
  const LEFT = -1.7; // pillar line, open to the garden
  const RIGHT = 1.9; // solid wall
  const ceil = PLINTH + 3.6;
  const corridorTile = T.corridorTile();
  const tileMat = new THREE.MeshStandardMaterial({ map: tex(corridorTile.map, { repeat: [4, 30] }), roughness: 0.18, transparent: true, opacity: 0.84 });
  let reflector: THREE.Mesh | null = null;
  if (quality === "high") {
    // a mirror just under the tiles; the tiles are slightly see-through, so the reflections show in them
    const r = new Reflector(new THREE.PlaneGeometry(RIGHT - LEFT + 0.6, C0 - C1), {
      textureWidth: 1024,
      textureHeight: 1024,
      clipBias: 0.003,
      color: 0x8a8a8a,
    });
    r.rotation.x = -Math.PI / 2;
    r.position.set((LEFT + RIGHT) / 2, PLINTH + 0.004, (C0 + C1) / 2);
    add(r);
    reflector = r;
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(RIGHT - LEFT + 0.6, C0 - C1), quality === "high" ? tileMat : new THREE.MeshStandardMaterial({ map: tileMat.map, roughness: 0.3 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((LEFT + RIGHT) / 2, PLINTH + 0.008, (C0 + C1) / 2);
  floor.receiveShadow = true;
  add(floor);
  // the solid wall: plaster, dado, teak doors and barred windows
  box(0.3, 3.6, C0 - C1, mat.plaster, RIGHT + 0.15, PLINTH + 1.8, (C0 + C1) / 2);
  box(0.02, 0.9, C0 - C1, dadoMat, RIGHT - 0.01, PLINTH + 0.45, (C0 + C1) / 2);
  for (let z = -27; z > C1 + 2; z -= 6.8) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 1.2), doorMat);
    d.position.set(RIGHT - 0.02, PLINTH + 1.2, z);
    add(d);
    frame(add, RIGHT - 0.04, z, 1.4, 2.6, mat, -Math.PI / 2);
    windowBars(add, RIGHT - 0.03, PLINTH + 1.3, z - 3.4, mat);
  }
  // ceiling: teak beams across, planks above
  box(RIGHT - LEFT + 0.6, 0.06, C0 - C1, mat.teakDark, (LEFT + RIGHT) / 2, ceil + 0.2, (C0 + C1) / 2);
  for (let z = C0; z >= C1; z -= 1.7) box(RIGHT - LEFT + 0.6, 0.2, 0.18, mat.teak, (LEFT + RIGHT) / 2, ceil, z);
  box(0.3, 0.32, C0 - C1, mat.teak, LEFT, ceil - 0.2, (C0 + C1) / 2);
  // green faceted pillars with yellow capitals on painted bases
  const baseMat = new THREE.MeshStandardMaterial({ map: tex(T.pillarBase(), { clamp: true }), roughness: 0.6 });
  const pillarZs: number[] = [];
  for (let z = C0 - 1.5; z > C1 + 1; z -= 3.4) pillarZs.push(z);
  for (const z of pillarZs) add(greenPillarAt(LEFT, z, PLINTH, ceil - 0.36, greenPillar, yellow, baseMat));
  // the garden outside the pillars: a step down, a low wall, plants and palms in the low sun
  box(8, 0.1, C0 - C1, mat.earth, LEFT - 4.4, PLINTH - 0.5, (C0 + C1) / 2);
  box(0.4, 0.55, C0 - C1, mat.plaster, LEFT - 8.2, PLINTH - 0.2, (C0 + C1) / 2);
  box(0.25, 0.5, C0 - C1, mat.granite, LEFT - 0.2, PLINTH - 0.25, (C0 + C1) / 2);
  for (let z = C0 - 3; z > C1; z -= 5.5) pot(add, LEFT - 2 - ((z * 7) % 3), PLINTH - 0.45, z);
  buildPalms(
    scene,
    [
      { x: -7.5, z: -30, height: 9, lean: [0.08, 0.02], seed: 21 },
      { x: -6.5, z: -41, height: 11, lean: [0.06, -0.04], seed: 22 },
      { x: -8, z: -49, height: 8, lean: [0.1, 0.05], seed: 23 },
    ],
    uTime
  );
  // exhibits: one project per bay, between pillar pairs, each with a hanging lamp
  const bays: Bay[] = [];
  bayIds.forEach((id, i) => {
    const za = pillarZs[i * 2];
    const zb = pillarZs[i * 2 + 1];
    if (za === undefined || zb === undefined) return;
    const zc = (za + zb) / 2;
    const lamp = bellLamp(add, LEFT + 0.55, ceil - 0.15, zc, bell, mat);
    lamp.id = id;
    lamps.push(lamp);
    bays.push({ id, anchor: new THREE.Vector3(LEFT - 0.1, PLINTH + 1.8, zc), center: new THREE.Vector3(LEFT + 0.6, PLINTH, zc), lamp });
  });
  // the end wall of the corridor (the ledger comes here in the next slice)
  box(RIGHT - LEFT + 0.6, 3.6, 0.3, mat.plaster, (LEFT + RIGHT) / 2, PLINTH + 1.8, C1);

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m !== reflector) m.receiveShadow = true;
  });
  // sort everything into the room it stands in, by the centre of its bounding box
  const zones = { hall: new THREE.Group(), court: new THREE.Group(), corridor: new THREE.Group() };
  const box3 = new THREE.Box3();
  const c = new THREE.Vector3();
  for (const o of [...root.children]) {
    box3.setFromObject(o).getCenter(c);
    (c.z > -8.2 ? zones.hall : c.z > -24.2 ? zones.court : zones.corridor).add(o);
  }
  root.add(zones.hall, zones.court, zones.corridor);
  return { zones, lamps, bays, courtAnchors, reflector };
}

// ------------------------------------------------------------------ builders

type Add = <O extends THREE.Object3D>(o: O) => O;

function turnedPillar(x: number, z: number, y0: number, y1: number, mat: Mats) {
  const g = new THREE.Group();
  const baseH = 0.55;
  const capH = 0.3;
  const shaftH = y1 - y0 - baseH - capH;
  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    let r = 0.16 - t * 0.04;
    r += 0.03 * Math.exp(-Math.pow((t - 0.05) / 0.03, 2));
    r += 0.025 * Math.exp(-Math.pow((t - 0.95) / 0.03, 2));
    r += 0.015 * Math.exp(-Math.pow((t - 0.5) / 0.02, 2));
    profile.push(new THREE.Vector2(r, t * shaftH));
  }
  const shaft = new THREE.Mesh(new THREE.LatheGeometry(profile, 16), mat.teak);
  shaft.position.y = y0 + baseH;
  g.add(shaft);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, baseH, 0.46), mat.blue);
  base.position.y = y0 + baseH / 2;
  g.add(base);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, capH, 0.42), mat.ochre);
  cap.position.y = y1 - capH / 2;
  g.add(cap);
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.24), mat.teak);
  bracket.position.y = y1 + 0.02;
  g.add(bracket);
  g.position.set(x, 0, z);
  g.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return g;
}

function greenPillarAt(x: number, z: number, y0: number, y1: number, green: THREE.Material, yellow: THREE.Material, baseMat: THREE.Material) {
  const g = new THREE.Group();
  const baseH = 0.85;
  const shaftH = y1 - y0 - baseH - 0.45;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.44, baseH, 0.44), baseMat);
  base.position.y = y0 + baseH / 2;
  g.add(base);
  // faceted (octagonal) shaft, slightly tapered
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, shaftH, 8), green);
  shaft.position.y = y0 + baseH + shaftH / 2;
  g.add(shaft);
  // stepped yellow capital
  [0.24, 0.3, 0.38].forEach((w, i) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, w), yellow);
    c.position.y = y0 + baseH + shaftH + 0.075 + i * 0.15;
    g.add(c);
  });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 8), yellow);
  ring.position.y = y0 + baseH + 0.04;
  g.add(ring);
  g.position.set(x, 0, z);
  g.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return g;
}

/** A teak door frame on a wall, rotated about y for side walls. */
function frame(add: Add, x: number, z: number, w: number, h: number, mat: Mats, rotY = 0) {
  const g = new THREE.Group();
  const parts: [number, number, number, number][] = [
    [0.18, h, -w / 2, h / 2],
    [0.18, h, w / 2, h / 2],
    [w + 0.36, 0.22, 0, h + 0.11],
  ];
  for (const [fw, fh, fx, fy] of parts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.36), mat.teak);
    m.position.set(fx, PLINTH + fy, 0);
    m.castShadow = true;
    g.add(m);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return add(g);
}

function bellLamp(add: Add, x: number, y: number, z: number, bell: THREE.Material, mat: Mats): Lamp {
  const g = new THREE.Group();
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4), mat.brass);
  chain.position.y = 0.25;
  g.add(chain);
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector2(0.04 + 0.13 * Math.pow(t, 1.6), -t * 0.26));
  }
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 18), bell);
  g.add(glass);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.05, 12), mat.brass);
  g.add(cap);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3, 1.6) }));
  bulb.position.y = -0.17;
  bulb.visible = false;
  g.add(bulb);
  g.position.set(x, y - 0.5, z);
  add(g);
  g.updateMatrixWorld(true);
  return { flame: bulb, pos: bulb.getWorldPosition(new THREE.Vector3()), base: 7, color: 0xffc27a };
}

function swing(add: Add, x: number, z: number, top: number, mat: Mats) {
  const seatY = PLINTH + 0.55;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 1.6), mat.teak);
  seat.position.set(x, seatY, z);
  seat.castShadow = true;
  add(seat);
  for (const dz of [-0.7, 0.7]) {
    for (const dx of [-0.2, 0.2]) {
      const len = top - seatY;
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 5), mat.brass);
      ch.position.set(x + dx, seatY + len / 2, z + dz);
      add(ch);
    }
  }
}

function pot(add: Add, x: number, y: number, z: number) {
  const potM = new THREE.MeshStandardMaterial({ color: 0x9a4a2a, roughness: 0.8 });
  const leafM = new THREE.MeshStandardMaterial({ color: 0x3f6b2e, roughness: 0.7 });
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.5, 14), potM);
  p.position.set(x, y + 0.25, z);
  p.castShadow = true;
  add(p);
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + (i % 2) * 0.08, 1), leafM);
    b.position.set(x + Math.cos(i * 1.3) * 0.18, y + 0.75 + (i % 3) * 0.12, z + Math.sin(i * 1.3) * 0.18);
    b.castShadow = true;
    add(b);
  }
}

function windowBars(add: Add, x: number, y: number, z: number, mat: Mats) {
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), mat.windowGlow);
  back.rotation.y = -Math.PI / 2;
  back.position.set(x, y + 0.7, z);
  add(back);
  for (let i = 1; i < 7; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.4, 5), mat.teakDark);
    b.position.set(x - 0.03, y + 0.7, z - 0.55 + (i * 1.1) / 7);
    add(b);
  }
  for (const dy of [0, 1.4]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 1.3), mat.teak);
    f.position.set(x - 0.03, y + dy, z);
    add(f);
  }
}
