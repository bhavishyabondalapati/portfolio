// "bhavishya" standing in the front yard, between the veranda (behind) and the
// compound wall and shrubs (in front). One textured plane per letter, measured
// from the real font, the way ThreeUI's Kage page builds its wordmark.
import * as THREE from "three";
import { canvas, ctx2d, tex } from "./util";

export type Wordmark = {
  group: THREE.Group;
  /** Fits the word to the frame width at its depth, as seen from the hero camera. */
  layout: (heroCam: THREE.PerspectiveCamera) => void;
  setOpacity: (a: number) => void;
  /** World position of the top of one letter (the kitten sits on the last one). */
  letterTop: (index: number, out: THREE.Vector3) => THREE.Vector3;
};

export const WORD_Z = 10.5;
const SZ = 300;
const PAD = 24;

// a lighter indigo than the page ink, because the letters are lit by the scene and lose some brightness
export function buildWordmark(scene: THREE.Scene, word: string, fontFamily: string, color = "#33468f"): Wordmark {
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
    const mat = new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.35, roughness: 0.7, side: THREE.DoubleSide });
    materials.push(mat);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), mat);
    mesh.position.set(g.pen - g.l + cw / 2 - PAD, (g.asc - g.desc) / 2, 0);
    // letters cast real shadows onto the yard
    mesh.castShadow = true;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.35 });
    mesh.renderOrder = 10;
    group.add(mesh);
  }
  group.position.z = WORD_Z;
  scene.add(group);

  const ink = { cx: (xMin + xMax) / 2, w: xMax - xMin };

  function layout(heroCam: THREE.PerspectiveCamera) {
    heroCam.updateMatrixWorld(true);
    heroCam.updateProjectionMatrix();
    const hit = (nx: number, ny: number) => {
      const v = new THREE.Vector3(nx, ny, 0.5).unproject(heroCam).sub(heroCam.position).normalize();
      return heroCam.position.clone().addScaledVector(v, (WORD_Z - heroCam.position.z) / v.z);
    };
    const L = hit(-1, 0);
    const R = hit(1, 0);
    const narrow = heroCam.aspect < 1.05;
    const s = ((R.x - L.x) * (narrow ? 0.94 : 0.84)) / ink.w;
    group.scale.setScalar(s);
    // baseline a little above the ground so the descender of the y sinks into the yard
    group.position.set(-ink.cx * s, 0.18, WORD_Z);
    group.updateMatrixWorld(true);
  }

  function letterTop(index: number, out: THREE.Vector3) {
    const g = glyphs[Math.max(0, Math.min(glyphs.length - 1, index))];
    out.set(g.pen + (g.r - g.l) / 2, g.asc, 0);
    return group.localToWorld(out);
  }

  function setOpacity(a: number) {
    group.visible = a > 0.005;
    for (const mat of materials) {
      mat.opacity = a;
      mat.alphaTest = a < 0.99 ? 0.02 : 0.35;
    }
  }

  return { group, layout, setOpacity, letterTop };
}
