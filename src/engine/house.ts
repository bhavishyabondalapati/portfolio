// The front of the Chettinad house, built from boxes, lathe-turned pillars and painted textures.
// World units are metres. The facade wall sits on z = 0 and the street is toward +z.
import * as THREE from "three";
import * as T from "./textures";
import { buildPalms } from "./palms";
import { mulberry32, tex } from "./util";

export type House = {
  doorLeft: THREE.Group;
  doorRight: THREE.Group;
  /** Sheets in front of the camera that sway and dissolve as the camera passes. */
  cutouts: THREE.Mesh[];
  /** Shared materials, reused by the interior. */
  mat: Mats;
  /** Everything in the front of the house, so the renderer can skip it once you are deep inside. */
  root: THREE.Group;
  kolam: THREE.Mesh;
  /** A jasmine sprig the renderer hangs right in front of the lens (out of focus). */
  branch: THREE.Mesh | null;
  /** Brass oil lamps: lit at dusk. */
  lamps: Lamp[];
  /** Materials that glow from inside at dusk. */
  glow: { windows: THREE.MeshStandardMaterial; fanlights: THREE.MeshStandardMaterial[] };
  uTime: { value: number };
};

/**
 * A lamp is a glowing flame or bulb plus a position. Real lights come from a small pool the renderer
 * moves to whichever lamps are nearest the camera, so the number of lights in the shaders stays fixed.
 */
export type Lamp = {
  flame: THREE.Mesh;
  pos: THREE.Vector3;
  base: number;
  color: number;
  id?: string;
  boost?: number;
  /** Journey position at which this lamp lights by itself (the back courtyard lights one by one). */
  at?: number;
};

const PLINTH = 0.9; // height of the thinnai platform
const VERANDA_DEPTH = 3.2;
const DOOR_W = 1.9;
const DOOR_H = 3.0;

export async function buildHouse(scene: THREE.Scene, quality: "high" | "low", y: () => Promise<void>): Promise<House> {
  const uTime = { value: 0 };
  // each painted texture takes tens of milliseconds, so hand the main thread back between them
  const plasterS = T.plaster();
  await y();
  const teakS = T.teak();
  await y();
  const oxideS = T.redOxide();
  await y();
  const earthS = T.earth();
  await y();
  const roofS = T.roofTiles();
  await y();

  const mat = {
    plaster: surface(plasterS, [3, 2], { roughness: 0.92, color: 0xffffff }),
    plasterUpper: surface(plasterS, [3, 1.5], { roughness: 0.92, color: 0xf6f1e6 }),
    teak: surface(teakS, [1, 2], { roughness: 0.55 }),
    teakDark: surface(teakS, [1, 1], { roughness: 0.6, color: 0x9a8070 }),
    oxide: surface(oxideS, [4, 1.5], { roughness: 0.32 }),
    earth: surface(earthS, [10, 10], { roughness: 1 }),
    roof: surface(roofS, [6, 2], { roughness: 0.85 }),
    granite: new THREE.MeshStandardMaterial({ color: 0x6f6a63, roughness: 0.75 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x2c5f86, roughness: 0.6 }),
    teal: new THREE.MeshStandardMaterial({ color: 0x3e6b5a, roughness: 0.65 }),
    ochre: new THREE.MeshStandardMaterial({ color: 0xd19a2a, roughness: 0.55 }),
    redBand: new THREE.MeshStandardMaterial({ color: 0x9c2f24, roughness: 0.7 }),
    indigoBand: new THREE.MeshStandardMaterial({ color: 0x2b3a7a, roughness: 0.7 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.32, metalness: 0.85 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1b120c, roughness: 0.95 }),
    windowGlow: new THREE.MeshStandardMaterial({ color: 0x1b120c, roughness: 0.95, emissive: 0xffa24a, emissiveIntensity: 0 }),
  };
  const fanlights: THREE.MeshStandardMaterial[] = [];
  const lamps: Lamp[] = [];

  const root = new THREE.Group();
  scene.add(root);
  const add = (m: THREE.Object3D) => {
    root.add(m);
    return m;
  };

  // ---------------------------------------------------------------- ground and yard
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), mat.earth);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 20);
  ground.receiveShadow = true;
  add(ground);

  const kolamMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshStandardMaterial({ map: tex(T.kolam(), { clamp: true }), transparent: true, roughness: 1, depthWrite: false })
  );
  kolamMesh.rotation.x = -Math.PI / 2;
  kolamMesh.position.set(0, 0.012, 9.6);
  kolamMesh.receiveShadow = true;
  add(kolamMesh);

  // ---------------------------------------------------------------- thinnai platform
  const platform = box(16.4, PLINTH, VERANDA_DEPTH, mat.oxide, 0, PLINTH / 2, VERANDA_DEPTH / 2);
  // the platform front gets a granite face and an ochre band
  add(platform);
  add(box(16.5, PLINTH - 0.12, 0.06, mat.granite, 0, (PLINTH - 0.12) / 2, VERANDA_DEPTH + 0.02));
  add(box(16.5, 0.1, 0.08, mat.ochre, 0, PLINTH - 0.06, VERANDA_DEPTH + 0.03));

  // steps up to the veranda, centred on the door
  const steps = 3;
  for (let i = 0; i < steps; i++) {
    const h = (PLINTH / steps) * (i + 1);
    const d = 0.42;
    add(box(2.9 - i * 0.12, h, d, mat.granite, 0, h / 2, VERANDA_DEPTH + (steps - i) * d - d / 2 + 0.02));
  }

  // ---------------------------------------------------------------- pillars, beam, roof
  const pillarXs = [-6.9, -4.4, -1.9, 1.9, 4.4, 6.9];
  const pillarZ = VERANDA_DEPTH - 0.35;
  const pillarTop = PLINTH + 3.25;
  for (const px of pillarXs) add(pillar(px, pillarZ, PLINTH, pillarTop, mat));
  for (const lx of [-5.65, -3.15, 3.15, 5.65]) add(oilLamp(lx, PLINTH, pillarZ - 0.25, mat, lamps, 1.6));
  add(box(16.4, 0.3, 0.32, mat.teak, 0, pillarTop + 0.15, pillarZ));

  // sloping veranda roof from the wall down to the beam, with the tile rows running across
  const roofTopY = PLINTH + 4.3;
  const roofLowY = pillarTop + 0.25;
  const roofDepth = VERANDA_DEPTH + 0.7;
  const slope = Math.atan2(roofTopY - roofLowY, roofDepth);
  const roofLen = Math.hypot(roofDepth, roofTopY - roofLowY);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(17.2, 0.12, roofLen), mat.roof);
  roof.position.set(0, (roofTopY + roofLowY) / 2 + 0.06, roofDepth / 2);
  roof.rotation.x = slope;
  roof.castShadow = true;
  roof.receiveShadow = true;
  add(roof);
  // teak rafters under the roof, visible from the veranda
  for (let x = -8; x <= 8.01; x += 0.8) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, roofLen), mat.teakDark);
    r.position.set(x, (roofTopY + roofLowY) / 2 - 0.08, roofDepth / 2);
    r.rotation.x = slope;
    add(r);
  }
  // fascia board
  add(box(17.2, 0.22, 0.06, mat.teak, 0, roofLowY - 0.02, roofDepth + 0.02));

  // ---------------------------------------------------------------- ground-floor facade
  const wallH = roofTopY - PLINTH + 0.4;
  const wallY = PLINTH + wallH / 2;
  // wall split into pieces around the door opening
  const sideW = (16.4 - (DOOR_W + 1.3)) / 2;
  add(box(sideW, wallH, 0.4, mat.plaster, -(DOOR_W + 1.3) / 2 - sideW / 2, wallY, -0.2));
  add(box(sideW, wallH, 0.4, mat.plaster, (DOOR_W + 1.3) / 2 + sideW / 2, wallY, -0.2));
  const aboveH = wallH - (DOOR_H + 0.75);
  add(box(DOOR_W + 1.3, aboveH, 0.4, mat.plaster, 0, PLINTH + DOOR_H + 0.75 + aboveH / 2, -0.2));
  add(box(DOOR_W + 1.3, 0.75, 0.4, mat.plaster, 0, PLINTH + DOOR_H + 0.375, -0.2));
  // painted dado along the base of the wall
  add(box(16.4, 0.5, 0.03, mat.redBand, 0, PLINTH + 0.25, 0.015));
  add(box(16.4, 0.06, 0.035, mat.ochre, 0, PLINTH + 0.53, 0.02));

  // barred windows either side of the door
  for (const wx of [-4.4 + 1.25, 4.4 - 1.25, -6.9 + 1.25, 6.9 - 1.25]) add(barredWindow(wx, PLINTH + 1.1, mat));

  await y();
  // ---------------------------------------------------------------- the carved door
  const frameZ = 0.02;
  // stepped teak frame: three nested mouldings
  for (let k = 0; k < 3; k++) {
    const pad = 0.42 - k * 0.12;
    const depth = 0.12 + k * 0.06;
    const fm = k === 1 ? mat.ochre : mat.teak;
    add(box(0.14, DOOR_H + pad, depth, fm, -(DOOR_W / 2 + pad - 0.07), PLINTH + (DOOR_H + pad) / 2, frameZ + depth / 2));
    add(box(0.14, DOOR_H + pad, depth, fm, DOOR_W / 2 + pad - 0.07, PLINTH + (DOOR_H + pad) / 2, frameZ + depth / 2));
    add(box(DOOR_W + pad * 2, 0.14, depth, fm, 0, PLINTH + DOOR_H + pad - 0.07, frameZ + depth / 2));
  }
  // carved lintel panel above the frame
  await y();
  const lintelS = T.lintel();
  const lintelM = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR_W + 1.0, 0.55, 0.16),
    surface(lintelS, [1, 1], { roughness: 0.55, normal: 1.2 })
  );
  lintelM.position.set(0, PLINTH + DOOR_H + 0.75, 0.12);
  lintelM.castShadow = true;
  add(lintelM);
  // threshold
  add(box(DOOR_W + 0.3, 0.12, 0.5, mat.teak, 0, PLINTH + 0.06, 0.05));

  await y();
  const leafS = T.doorLeaf();
  await y();
  const leafMat = surface(leafS, [1, 1], { roughness: 0.5, normal: 1.4 });
  const leafW = DOOR_W / 2;
  const mkLeaf = (side: -1 | 1) => {
    const g = new THREE.Group();
    g.position.set(side * leafW, PLINTH + 0.12, -0.08);
    const m = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.01, DOOR_H - 0.12, 0.09), leafMat);
    m.position.set(-side * (leafW / 2), (DOOR_H - 0.12) / 2, 0);
    if (side === 1) m.scale.x = -1; // mirror the carving on the right leaf
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    // brass ring handle
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 20), mat.brass);
    ring.position.set(-side * (leafW - 0.16), DOOR_H * 0.48, 0.07);
    g.add(ring);
    add(g);
    return g;
  };
  const doorLeft = mkLeaf(-1);
  const doorRight = mkLeaf(1);

  await y();
  // ---------------------------------------------------------------- upper storey
  const upperY0 = roofTopY - 0.1;
  const upperH = 3.9;
  add(box(16.4, upperH, 0.4, mat.plasterUpper, 0, upperY0 + upperH / 2, -0.9));
  // painted bands: red oxide, indigo, ochre
  add(box(16.6, 0.22, 0.46, mat.redBand, 0, upperY0 + 0.11, -0.88));
  add(box(16.6, 0.08, 0.48, mat.ochre, 0, upperY0 + 0.26, -0.88));
  add(box(16.6, 0.26, 0.5, mat.indigoBand, 0, upperY0 + upperH - 0.13, -0.86));
  add(box(16.6, 0.08, 0.52, mat.ochre, 0, upperY0 + upperH - 0.3, -0.86));
  // arched windows with coloured-glass fanlights, red pilasters between them
  const winXs = [-6.2, -3.1, 0, 3.1, 6.2];
  winXs.forEach((wx, i) => add(archedWindow(wx, upperY0 + 0.75, -0.68, i, mat, fanlights)));
  for (let i = 0; i < winXs.length + 1; i++) {
    const px = -7.75 + i * 3.1;
    add(box(0.34, upperH - 0.5, 0.1, i % 2 ? mat.indigoBand : mat.redBand, px, upperY0 + upperH / 2, -0.66));
  }
  // parapet with balusters and urns
  const parY = upperY0 + upperH;
  add(box(16.6, 0.14, 0.5, mat.plaster, 0, parY + 0.07, -0.86));
  add(box(16.6, 0.14, 0.5, mat.plaster, 0, parY + 0.86, -0.86));
  const balG = new THREE.CylinderGeometry(0.055, 0.075, 0.66, 8);
  const bal = new THREE.InstancedMesh(balG, mat.plaster, 70);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 70; i++) {
    m4.makeTranslation(-8.1 + i * (16.2 / 69), parY + 0.47, -0.86);
    bal.setMatrixAt(i, m4);
  }
  bal.castShadow = true;
  add(bal);
  for (const ux of [-8.1, -2.7, 2.7, 8.1]) add(urn(ux, parY + 0.93, -0.86, mat));
  // a small semicircular gable over the door bay, with an urn on top
  const gableShape = new THREE.Shape();
  gableShape.absarc(0, 0, 1.4, 0, Math.PI, false);
  gableShape.lineTo(1.4, 0);
  const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(gableShape, { depth: 0.45, bevelEnabled: false, curveSegments: 24 }), mat.plaster);
  gable.position.set(0, parY + 0.93, -1.08);
  gable.castShadow = true;
  add(gable);
  const gableRing = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.07, 6, 32, Math.PI), mat.redBand);
  gableRing.position.set(0, parY + 0.93, -0.6);
  add(gableRing);
  add(urn(0, parY + 2.33, -0.86, mat));

  // side returns so the house has depth from an angle
  add(box(0.4, 9.5, 12, mat.plasterUpper, -8.4, 4.75, -6));
  add(box(0.4, 9.5, 12, mat.plasterUpper, 8.4, 4.75, -6));

  // ---------------------------------------------------------------- front compound wall and gate
  const wallZ = 7.4;
  const cwH = 0.62;
  const gateHalf = 1.7;
  const cwLen = 14;
  for (const s of [-1, 1]) {
    add(box(cwLen, cwH, 0.32, mat.plaster, s * (gateHalf + cwLen / 2), cwH / 2, wallZ));
    add(box(cwLen, 0.08, 0.4, mat.redBand, s * (gateHalf + cwLen / 2), cwH + 0.04, wallZ));
    // gate pillars with a little brass lamp niche
    add(box(0.55, 1.55, 0.55, mat.plaster, s * gateHalf, 0.775, wallZ));
    add(box(0.65, 0.12, 0.65, mat.redBand, s * gateHalf, 1.6, wallZ));
    add(oilLamp(s * gateHalf, 1.66, wallZ, mat, lamps, 1.3));
  }

  // ---------------------------------------------------------------- palms behind the house
  const cutouts: THREE.Mesh[] = [];
  await y();
  // coconut palms behind the house, and a grove off to the left of the yard for the low sun to stream through
  buildPalms(
    scene,
    [
      { x: -13, z: -10, height: 13, lean: [0.06, 0.02], seed: 1 },
      { x: -9.5, z: -12, height: 16.5, lean: [-0.04, -0.05], seed: 2 },
      { x: 11, z: -14, height: 12, lean: [0.08, 0.03], seed: 3 },
      { x: 14.5, z: -16, height: 17, lean: [-0.06, 0.02], seed: 4 },
      { x: -10, z: 4, height: 11.5, lean: [0.12, 0.05], seed: 5 },
      { x: -12.5, z: 0, height: 15.5, lean: [0.05, -0.03], seed: 6 },
      { x: -15, z: -3, height: 9.5, lean: [0.14, 0.08], seed: 7 },
      { x: 13, z: 6, height: 10.5, lean: [-0.1, 0.06], seed: 8 },
    ],
    uTime
  );

  // a far treeline closing the horizon
  const trees = new THREE.Mesh(new THREE.PlaneGeometry(160, 20), cutoutMaterial(T.treeline(), 0.01, uTime));
  trees.position.set(0, 9.5, -48);
  add(trees);

  // ---------------------------------------------------------------- foreground cut-outs (sway, then dissolve)
  // one jasmine sprig hung right in front of the lens; depth of field turns it into soft bokeh
  let branch: THREE.Mesh | null = null;
  if (quality === "high") {
    // unlit, so the flowers stay cream instead of picking up the blue sky; the renderer tints it per mood
    branch = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.2),
      new THREE.MeshBasicMaterial({ map: tex(T.sprig(), { clamp: true }), transparent: true, depthWrite: false, fog: false })
    );
    branch.renderOrder = 22;
    branch.userData.nearLens = true;
    add(branch);
    cutouts.push(branch);
  }

  // box() and the builders already cast shadows; everything solid also receives them
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !cutouts.includes(m)) m.receiveShadow = true;
  });

  return { doorLeft, doorRight, cutouts, mat, root, kolam: kolamMesh, branch, lamps, glow: { windows: mat.windowGlow, fanlights }, uTime };
}

// ------------------------------------------------------------------ builders

function box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export type Mats = Record<string, THREE.MeshStandardMaterial>;

/** A turned teak pillar on a painted base block, with an ochre capital and a carved bracket. */
function pillar(x: number, z: number, y0: number, y1: number, mat: Mats, plain = false) {
  const g = new THREE.Group();
  const h = y1 - y0;
  const baseH = 0.55;
  const capH = 0.32;
  const shaftH = h - baseH - capH;
  const profile: THREE.Vector2[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // tapering shaft with turned rings near both ends
    let r = 0.15 - t * 0.035;
    r += 0.025 * Math.exp(-Math.pow((t - 0.06) / 0.03, 2));
    r += 0.02 * Math.exp(-Math.pow((t - 0.94) / 0.03, 2));
    r += 0.012 * Math.exp(-Math.pow((t - 0.5) / 0.02, 2));
    profile.push(new THREE.Vector2(r, t * shaftH));
  }
  const shaft = new THREE.Mesh(new THREE.LatheGeometry(profile, 18), mat.teak);
  shaft.position.y = y0 + baseH;
  g.add(shaft);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.44, baseH, 0.44), plain ? mat.granite : mat.blue);
  base.position.y = y0 + baseH / 2;
  g.add(base);
  const baseRim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), mat.ochre);
  baseRim.position.y = y0 + baseH;
  g.add(baseRim);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.4, capH, 0.4), mat.ochre);
  cap.position.y = y1 - capH / 2;
  g.add(cap);
  if (!plain) {
    // bracket arms reaching out along the beam
    const br = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.14, 0.24), mat.teak);
    br.position.y = y1 - 0.04;
    g.add(br);
  }
  g.position.set(x, 0, z);
  g.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return g;
}

function barredWindow(x: number, y: number, mat: Mats) {
  const g = new THREE.Group();
  const w = 1.1;
  const h = 1.5;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat.windowGlow);
  back.position.set(0, h / 2, 0.005);
  g.add(back);
  const frame = [
    [w + 0.2, 0.14, 0, h + 0.07],
    [w + 0.2, 0.14, 0, -0.07],
    [0.14, h, -w / 2 - 0.03, h / 2],
    [0.14, h, w / 2 + 0.03, h / 2],
  ];
  for (const [fw, fh, fx, fy] of frame) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.14), mat.teak);
    m.position.set(fx, fy, 0.06);
    g.add(m);
  }
  const barG = new THREE.CylinderGeometry(0.018, 0.018, h, 6);
  for (let i = 1; i < 8; i++) {
    const b = new THREE.Mesh(barG, mat.teakDark);
    b.position.set(-w / 2 + (i * w) / 8, h / 2, 0.05);
    g.add(b);
  }
  g.position.set(x, y, 0.01);
  return g;
}

function archedWindow(x: number, y: number, z: number, seed: number, mat: Mats, fanlights: THREE.MeshStandardMaterial[]) {
  const g = new THREE.Group();
  const w = 1.25;
  const h = 1.7;
  const r = w / 2;
  const fanTex = tex(T.fanlight(seed), { clamp: true });
  const fanMat = new THREE.MeshStandardMaterial({ map: fanTex, emissive: 0xffffff, emissiveMap: fanTex, emissiveIntensity: 0.15, roughness: 0.25 });
  fanlights.push(fanMat);
  const fan = new THREE.Mesh(new THREE.CircleGeometry(r, 24, 0, Math.PI), fanMat);
  // CircleGeometry UVs are planar, so the half-disc maps onto the top half of the texture
  const uv = fan.geometry.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 2 - 1);
  fan.position.set(0, h, 0.01);
  g.add(fan);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex(T.shutter(), { clamp: true }), roughness: 0.7 }));
  sh.position.set(0, h / 2, 0.01);
  g.add(sh);
  // teak surround: arch ring plus jambs
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.06, 0.07, 6, 24, Math.PI), mat.teak);
  ring.position.set(0, h, 0.04);
  g.add(ring);
  for (const s of [-1, 1]) {
    const j = new THREE.Mesh(new THREE.BoxGeometry(0.14, h, 0.14), mat.teak);
    j.position.set(s * (r + 0.06), h / 2, 0.04);
    g.add(j);
  }
  const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.1, 0.3), mat.ochre);
  sill.position.set(0, -0.05, 0.1);
  g.add(sill);
  g.position.set(x, y, z);
  g.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return g;
}

/** A brass kuthu vilakku: turned stand, shallow bowl, a flame and a warm point light (off until dusk). */
function oilLamp(x: number, y: number, z: number, mat: Mats, lamps: Lamp[], scale = 1) {
  const g = new THREE.Group();
  const pts: [number, number][] = [
    [0.0, 0], [0.11, 0], [0.11, 0.02], [0.05, 0.04], [0.02, 0.07], [0.02, 0.2], [0.04, 0.22], [0.02, 0.24],
    [0.018, 0.36], [0.035, 0.38], [0.02, 0.4], [0.09, 0.43], [0.1, 0.46], [0.0, 0.45],
  ];
  const stand = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 18), mat.brass);
  stand.castShadow = true;
  g.add(stand);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.6, 0.9) }));
  flame.scale.set(0.014, 0.034, 0.014);
  flame.position.set(0.075, 0.49, 0);
  flame.visible = false;
  g.add(flame);
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  g.updateMatrixWorld(true);
  lamps.push({ flame, pos: flame.getWorldPosition(new THREE.Vector3()), base: 9, color: 0xffa858 });
  return g;
}

function urn(x: number, y: number, z: number, mat: Mats, scale = 1) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector2(0.06 + 0.14 * Math.sin(t * Math.PI) * (1 - t * 0.3), t * 0.5));
  }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), mat.ochre);
  m.position.set(x, y, z);
  m.scale.setScalar(scale);
  m.castShadow = true;
  return m;
}

type SurfaceOpts = { roughness?: number; color?: number; normal?: number };

function surface(s: T.Surface, repeat: [number, number], o: SurfaceOpts = {}) {
  const m = new THREE.MeshStandardMaterial({
    map: tex(s.map, { repeat }),
    color: o.color ?? 0xffffff,
    roughness: o.roughness ?? 0.9,
    metalness: 0,
  });
  if (s.normal) {
    m.normalMap = tex(s.normal, { repeat, srgb: false });
    m.normalScale.set(o.normal ?? 0.8, o.normal ?? 0.8);
  }
  if (s.rough) m.roughnessMap = tex(s.rough, { repeat, srgb: false });
  return m;
}

/**
 * Transparent painted sheet that sways from its top or bottom in the vertex shader.
 * Same idea as ThreeUI's cutoutMaterial: hung as real geometry so it parallaxes.
 */
function cutoutMaterial(c: HTMLCanvasElement, sway: number, uTime: { value: number }, anchor: "top" | "bottom" = "bottom") {
  const m = new THREE.MeshStandardMaterial({
    map: tex(c, { clamp: true, aniso: 8 }),
    transparent: true,
    alphaTest: 0.04,
    side: THREE.DoubleSide,
    roughness: 0.9,
    depthWrite: true,
  });
  const seed = mulberry32(c.width + c.height)() * 10;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uTime;
    sh.vertexShader =
      "uniform float uT;\n" +
      sh.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n" +
          (anchor === "top" ? "float hang = 1.0 - uv.y;\n" : "float hang = uv.y;\n") +
          `transformed.x += sin(uT * 0.9 + position.y * 0.7 + ${seed.toFixed(2)}) * ${sway.toFixed(3)} * hang * hang;\n` +
          `transformed.z += cos(uT * 0.7 + position.x * 0.5) * ${(sway * 0.5).toFixed(3)} * hang;\n`
      );
  };
  return m;
}
