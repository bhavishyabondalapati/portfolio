// "bhavishya" standing in the front yard, between the veranda (behind) and the
// compound wall and shrubs (in front). One textured plane per letter, measured
// from the real font, the way ThreeUI's Kage page builds its wordmark.
import * as THREE from "three";
import { canvas, ctx2d, tex } from "./util";

export type Wordmark = {
  group: THREE.Group;
  /** Stands the word on the ground in front of the hero camera, facing it and sized to the frame. */
  layout: (heroCam: THREE.PerspectiveCamera, distance?: number, fill?: number) => void;
  placed: { center: THREE.Vector3; yaw: number; width: number };
  setOpacity: (a: number) => void;
  setGlow: (g: number) => void;
  /** World position of the top of one letter (the kitten sits on the last one). */
  letterTop: (index: number, out: THREE.Vector3) => THREE.Vector3;
};

const SZ = 300;
const PAD = 24;

// a lighter indigo than the page ink, because the letters are lit by the scene and lose some brightness
export function buildWordmark(scene: THREE.Scene, word: string, fontFamily: string, color = "#26315f"): Wordmark {
  const font = `400 ${SZ}px ${fontFamily}`;
  const m = ctx2d(canvas(4, 4));
  m.font = font;
  const track = -0.02 * SZ;
  type G = { ch: string; asc: number; desc: number; l: number; r: number; pen: number };
  const glyphs: G[] = [];
  let pen = 0;
  let xMin = Infinity;
  let xMax = -Infinity;
  let ascMax = 0;
  for (const ch of word) {
    const t = m.measureText(ch);
    const g = {
      ch,
      asc: t.actualBoundingBoxAscent,
      desc: t.actualBoundingBoxDescent,
      l: t.actualBoundingBoxLeft,
      r: t.actualBoundingBoxRight,
      pen,
    };
    glyphs.push(g);
    xMin = Math.min(xMin, pen - g.l);
    xMax = Math.max(xMax, pen + g.r);
    ascMax = Math.max(ascMax, g.asc);
    pen += t.width + track;
  }

  const group = new THREE.Group();
  const materials: THREE.MeshStandardMaterial[] = [];
  const sides: THREE.MeshStandardMaterial[] = [];
  const sideMat = (map: THREE.Texture) => {
    const m = new THREE.MeshStandardMaterial({ map, color: 0x6a6a7a, transparent: true, alphaTest: 0.35, roughness: 0.8, side: THREE.DoubleSide });
    sides.push(m);
    return m;
  };
  for (const g of glyphs) {
    const cw = Math.ceil(g.l + g.r) + PAD * 2;
    const ch = Math.ceil(g.asc + g.desc) + PAD * 2;
    const c = canvas(cw, ch);
    const x = ctx2d(c);
    x.font = font;
    x.fillStyle = color;
    x.fillText(g.ch, PAD + g.l, PAD + g.asc);
    const map = tex(c, { clamp: true, aniso: 16 });
    // lit by the scene's sun so the letters sit in the same light as the house
    // a faint glow in the letter's own colour keeps the name readable in shade and at dusk
    const mat = new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      alphaTest: 0.35,
      roughness: 0.7,
      side: THREE.DoubleSide,
      emissive: 0xffffff,
      emissiveMap: map,
      emissiveIntensity: 0.22,
    });
    materials.push(mat);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), mat);
    mesh.position.set(g.pen - g.l + cw / 2 - PAD, (g.asc - g.desc) / 2, 0);
    // letters cast real shadows onto the yard
    mesh.castShadow = true;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.35 });
    mesh.renderOrder = 10;
    group.add(mesh);
    // a few darker copies stepped back behind each letter read as the letter's thickness from an angle
    for (let k = 1; k <= 4; k++) {
      const side = new THREE.Mesh(mesh.geometry, sideMat(map));
      side.position.copy(mesh.position);
      side.position.z = -k * 7;
      side.renderOrder = 9;
      group.add(side);
    }
  }
  scene.add(group);

  const ink = { cx: (xMin + xMax) / 2, w: xMax - xMin };

  // where the word stands: `distance` metres in front of the hero camera, on the ground, turned to face it
  const placed = { center: new THREE.Vector3(), yaw: 0, width: 0 };

  function layout(heroCam: THREE.PerspectiveCamera, distance = 6, fill = 0.78) {
    heroCam.updateMatrixWorld(true);
    const fwd = new THREE.Vector3();
    heroCam.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    const center = heroCam.position.clone().addScaledVector(fwd, distance);
    center.y = 0.15;
    const yaw = Math.atan2(heroCam.position.x - center.x, heroCam.position.z - center.z);
    const halfW = distance * Math.tan(THREE.MathUtils.degToRad(heroCam.fov / 2)) * heroCam.aspect;
    const width = 2 * halfW * (heroCam.aspect < 1.05 ? 0.92 : fill);
    const s = width / ink.w;
    group.scale.setScalar(s);
    group.rotation.set(0, yaw, 0);
    // put the middle of the inked word (not the origin of the first glyph) on the centre point
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    group.position.copy(center).addScaledVector(right, -ink.cx * s);
    group.updateMatrixWorld(true);
    placed.center.copy(center);
    placed.yaw = yaw;
    placed.width = width;
  }

  function letterTop(index: number, out: THREE.Vector3) {
    const g = glyphs[Math.max(0, Math.min(glyphs.length - 1, index))];
    out.set(g.pen + (g.r - g.l) / 2, g.asc, 0);
    return group.localToWorld(out);
  }

  function setOpacity(a: number) {
    group.visible = a > 0.005;
    for (const mat of [...materials, ...sides]) {
      mat.opacity = a;
      mat.alphaTest = a < 0.99 ? 0.02 : 0.35;
    }
  }

  function setGlow(g: number) {
    for (const mat of materials) mat.emissiveIntensity = g;
  }

  return { group, layout, placed, setOpacity, setGlow, letterTop };
}
