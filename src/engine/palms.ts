// Coconut palms in real 3D: a curved, ringed, tapering trunk; a crown of fronds, each a drooping
// rachis with two rows of individual leaflets; a cluster of coconuts; and wind sway in the vertex
// shader (the further a vertex is from the crown, the more it moves). Each palm is three draw calls.
import * as THREE from "three";
import { canvas, ctx2d, mulberry32, tex, TAU } from "./util";

export type PalmDef = { x: number; z: number; height: number; lean: [number, number]; seed: number };

function trunkTexture() {
  const W = 128;
  const H = 512;
  const c = canvas(W, H);
  const x = ctx2d(c);
  x.fillStyle = "#7d7262";
  x.fillRect(0, 0, W, H);
  const r = mulberry32(5);
  // u runs along the trunk in a TubeGeometry, so the leaf-scar rings are vertical stripes here
  for (let px = 0; px < W; px += 3 + r() * 4) {
    x.fillStyle = `rgba(40,30,20,${0.25 + r() * 0.3})`;
    x.fillRect(px, 0, 1 + r() * 1.5, H);
    x.fillStyle = "rgba(220,205,180,.12)";
    x.fillRect(px + 2, 0, 1, H);
  }
  for (let i = 0; i < 400; i++) {
    x.fillStyle = r() > 0.5 ? "rgba(30,25,20,.18)" : "rgba(200,190,170,.12)";
    x.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 6);
  }
  return c;
}

const windVS = (amp: number) => `
  float w = aWind * aWind;
  float ph = aPhase + position.y * 0.15;
  transformed.x += sin(uT * 1.3 + ph) * ${amp.toFixed(3)} * w;
  transformed.z += cos(uT * 1.05 + ph * 1.3) * ${(amp * 0.7).toFixed(3)} * w;
  transformed.y += sin(uT * 2.1 + ph * 2.0) * ${(amp * 0.25).toFixed(3)} * w;
`;

function windMaterial(base: THREE.MeshStandardMaterial, uTime: { value: number }, amp: number) {
  base.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uTime;
    sh.vertexShader =
      "uniform float uT;\nattribute float aWind;\nattribute float aPhase;\n" +
      sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n" + windVS(amp));
  };
  return base;
}

export function buildPalms(scene: THREE.Scene, defs: PalmDef[], uTime: { value: number }) {
  const group = new THREE.Group();
  scene.add(group);
  const trunkMat = windMaterial(new THREE.MeshStandardMaterial({ map: tex(trunkTexture(), { repeat: [3, 1] }), roughness: 0.95 }), uTime, 0.08);
  const frondMat = windMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.75 }), uTime, 0.28);
  const nutMat = windMaterial(new THREE.MeshStandardMaterial({ color: 0x6b6a2a, roughness: 0.6 }), uTime, 0.08);

  for (const d of defs) {
    const r = mulberry32(d.seed);
    const phase = r() * TAU;
    // ---- trunk: a curve that leans and bows, tapering toward the crown
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push(new THREE.Vector3(d.lean[0] * Math.pow(t, 1.6) * d.height, t * d.height, d.lean[1] * Math.pow(t, 1.6) * d.height));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const segs = 28;
    const radial = 10;
    const trunk = new THREE.TubeGeometry(curve, segs, 1, radial, false);
    const pos = trunk.attributes.position as THREE.BufferAttribute;
    const wind = new Float32Array(pos.count);
    const c = new THREE.Vector3();
    const v = new THREE.Vector3();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      curve.getPointAt(t, c);
      const rad = 0.2 - 0.08 * t + 0.03 * Math.exp(-t * 18); // flared base, slimmer top
      for (let j = 0; j <= radial; j++) {
        const k = i * (radial + 1) + j;
        v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(rad).add(c);
        pos.setXYZ(k, v.x, v.y, v.z);
        wind[k] = t * 0.5;
      }
    }
    trunk.computeVertexNormals();
    trunk.setAttribute("aWind", new THREE.BufferAttribute(wind, 1));
    trunk.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(pos.count).fill(phase), 1));
    const trunkMesh = new THREE.Mesh(trunk, trunkMat);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;

    // ---- crown of fronds, merged into one geometry
    const crown = curve.getPointAt(1);
    const fp: number[] = [];
    const fc: number[] = [];
    const fw: number[] = [];
    const nFronds = 13 + Math.floor(r() * 4);
    const col = new THREE.Color();
    for (let f = 0; f < nFronds; f++) {
      const yaw = (f / nFronds) * TAU + r() * 0.3;
      const pitch = 0.55 - (f % 3) * 0.32 + (r() - 0.5) * 0.2; // some fronds reach up, older ones droop
      const L = 3.2 + r() * 1.4;
      const droop = 0.7 + r() * 0.5;
      const rot = new THREE.Matrix4().makeRotationY(yaw).multiply(new THREE.Matrix4().makeRotationZ(pitch));
      const at = (s: number) =>
        new THREE.Vector3(s * L, Math.sin(s * Math.PI * 0.55) * 0.35 * L * (1 - droop * 0.4) - s * s * droop * L * 0.55, 0).applyMatrix4(rot).add(crown);
      const n = 30;
      for (let k = 1; k <= n; k++) {
        const s = k / n;
        const p0 = at(s);
        const ahead = at(Math.min(1, s + 0.02)).sub(p0).normalize();
        const side = new THREE.Vector3(0, 1, 0).cross(ahead).normalize();
        const len = 0.95 * Math.sin(Math.PI * (0.12 + 0.88 * s)) * (0.7 + 0.3 * (1 - s));
        for (const sgn of [-1, 1]) {
          // leaflets point out, forward and hang down in a shallow V
          const dir = side.clone().multiplyScalar(sgn).addScaledVector(ahead, 0.55).add(new THREE.Vector3(0, -0.55 - s * 0.3, 0)).normalize();
          const tip = p0.clone().addScaledVector(dir, len);
          const w = ahead.clone().multiplyScalar(0.045);
          const a = p0.clone().sub(w);
          const b = p0.clone().add(w);
          fp.push(a.x, a.y, a.z, b.x, b.y, b.z, tip.x, tip.y, tip.z);
          const g = 0.3 + r() * 0.12;
          col.setRGB(g * 0.55, g * 1.05, g * 0.35);
          const tipCol = col.clone().lerp(new THREE.Color(0.55, 0.55, 0.25), 0.35 + s * 0.3);
          fc.push(col.r, col.g, col.b, col.r, col.g, col.b, tipCol.r, tipCol.g, tipCol.b);
          fw.push(s, s, Math.min(1, s + len / L));
        }
        // the rachis itself, as a thin ribbon segment
        const prev = at((k - 1) / n);
        const up = new THREE.Vector3(0, 0.02, 0);
        fp.push(prev.x, prev.y, prev.z, p0.x, p0.y, p0.z, p0.x + up.x, p0.y + up.y, p0.z + up.z);
        fc.push(0.35, 0.36, 0.2, 0.35, 0.36, 0.2, 0.35, 0.36, 0.2);
        fw.push((k - 1) / n, s, s);
      }
    }
    const frondGeo = new THREE.BufferGeometry();
    frondGeo.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
    frondGeo.setAttribute("color", new THREE.Float32BufferAttribute(fc, 3));
    frondGeo.setAttribute("aWind", new THREE.Float32BufferAttribute(fw.map((x) => 0.5 + x), 1));
    frondGeo.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(fw.length).fill(phase), 1));
    frondGeo.computeVertexNormals();
    const fronds = new THREE.Mesh(frondGeo, frondMat);
    fronds.castShadow = true;
    fronds.receiveShadow = true;

    // ---- a cluster of coconuts under the crown
    const nutGeos: THREE.BufferGeometry[] = [];
    const nNuts = 5 + Math.floor(r() * 5);
    for (let i = 0; i < nNuts; i++) {
      const g = new THREE.SphereGeometry(0.13 + r() * 0.03, 10, 8);
      const a = r() * TAU;
      g.translate(crown.x + Math.cos(a) * 0.22, crown.y - 0.22 - r() * 0.25, crown.z + Math.sin(a) * 0.22);
      nutGeos.push(g);
    }
    const nutGeo = mergeSimple(nutGeos);
    nutGeo.setAttribute("aWind", new THREE.BufferAttribute(new Float32Array(nutGeo.attributes.position.count).fill(0.5), 1));
    nutGeo.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(nutGeo.attributes.position.count).fill(phase), 1));
    const nuts = new THREE.Mesh(nutGeo, nutMat);
    nuts.castShadow = true;

    const palm = new THREE.Group();
    palm.add(trunkMesh, fronds, nuts);
    palm.position.set(d.x, 0, d.z);
    group.add(palm);
  }
  return group;
}

/** Merges non-indexed copies of simple geometries that share the same attributes. */
function mergeSimple(geos: THREE.BufferGeometry[]) {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const total = parts.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  return out;
}
