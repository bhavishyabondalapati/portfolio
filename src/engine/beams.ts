// Sun shafts and the dust that floats in them.
// A shaft is a long quad laid along the sun direction that turns about its own axis to face the
// camera (a cylindrical billboard), with soft edges and a slow shimmer in the shader. Cheap, and with
// bloom on top it reads as light in the air. Dust is a cloud of points kept inside the shafts.
import * as THREE from "three";
import { mulberry32 } from "./util";

export type Beams = {
  group: THREE.Group;
  update: (t: number, cam: THREE.Camera) => void;
  setOpacity: (a: number, color: number) => void;
};

type Shaft = { mesh: THREE.Mesh; center: THREE.Vector3 };

const SHAFT_VS = `
varying vec2 vUv;
varying float vFog;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFog = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const SHAFT_FS = `
uniform float uT;
uniform float uOpacity;
uniform vec3 uColor;
uniform float uSeed;
varying vec2 vUv;
varying float vFog;
void main() {
  // v = 0 at the sun end of the shaft, 1 where it lands
  float v = 1.0 - vUv.y;
  float across = smoothstep(0.0, 0.42, vUv.x) * smoothstep(1.0, 0.58, vUv.x);
  float along = smoothstep(0.0, 0.25, v) * smoothstep(1.0, 0.8, v);
  float shimmer = 0.75 + 0.25 * sin(v * 9.0 - uT * 0.6 + uSeed) * sin(vUv.x * 7.0 + uT * 0.35);
  // fade out when the camera walks into a shaft, so it never smears across the lens
  float nearFade = smoothstep(2.5, 6.0, vFog);
  // brighter than white before tone mapping, so the bloom pass picks the shafts up
  gl_FragColor = vec4(uColor * 1.8, uOpacity * across * along * shimmer * nearFade);
}`;

export function buildBeams(scene: THREE.Scene, sunDir: THREE.Vector3, quality: "high" | "low"): Beams {
  const group = new THREE.Group();
  scene.add(group);
  const uT = { value: 0 };
  const uOpacity = { value: 0.2 };
  const uColor = { value: new THREE.Color(0xffc890) };
  const shafts: Shaft[] = [];
  const toSun = sunDir.clone().normalize();

  // where each shaft lands: between the veranda pillars, across the steps, and two wide ones over the yard
  const landings: [number, number, number, number, number][] = [
    // x, y, z, width, length
    [-3.1, 0.9, 1.6, 0.9, 7],
    [-0.6, 0.9, 1.7, 1.1, 7],
    [2.0, 0.9, 1.5, 0.9, 7],
    [4.6, 0.9, 1.6, 0.8, 7],
    [-6, 0.0, 9, 3.6, 18],
    [-1.5, 0.0, 12, 3.0, 18],
    [1.0, 0.0, 6.5, 2.4, 14],
  ];
  landings.forEach(([x, y, z, w, len], i) => {
    const center = new THREE.Vector3(x, y, z).addScaledVector(toSun, len / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uT, uOpacity, uColor, uSeed: { value: i * 1.7 } },
      vertexShader: SHAFT_VS,
      fragmentShader: SHAFT_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
    mesh.renderOrder = 8;
    mesh.frustumCulled = false;
    group.add(mesh);
    shafts.push({ mesh, center });
  });

  // dust motes, scattered inside the shafts and drifting slowly
  const N = quality === "high" ? 900 : 350;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  const rnd = mulberry32(77);
  for (let i = 0; i < N; i++) {
    const [x, y, z, w, len] = landings[i % landings.length];
    const t = rnd() * len * 0.8;
    const p = new THREE.Vector3(x, y, z).addScaledVector(toSun, t);
    p.x += (rnd() - 0.5) * w;
    p.z += (rnd() - 0.5) * w;
    p.y = Math.max(p.y, y + 0.05);
    pos.set([p.x, p.y, p.z], i * 3);
    seed[i] = rnd();
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  dg.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const dust = new THREE.Points(
    dg,
    new THREE.ShaderMaterial({
      uniforms: { uT, uOpacity, uColor, uSize: { value: 900 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSeed; uniform float uT; uniform float uSize; varying float vA;
        void main(){
          vec3 p = position;
          p.x += sin(uT * 0.21 + aSeed * 40.0) * 0.18;
          p.y += sin(uT * 0.17 + aSeed * 23.0) * 0.12 + aSeed * 0.05;
          p.z += cos(uT * 0.19 + aSeed * 31.0) * 0.18;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vA = (0.35 + 0.65 * fract(aSeed * 7.13)) * (0.6 + 0.4 * sin(uT * 1.3 + aSeed * 50.0));
          gl_PointSize = uSize * (0.004 + aSeed * 0.006) / max(-mv.z, 0.5);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uOpacity; uniform vec3 uColor; varying float vA;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(uColor * 1.6, a * vA * uOpacity * 4.0);
        }`,
    })
  );
  dust.frustumCulled = false;
  dust.renderOrder = 9;
  group.add(dust);

  const axis = new THREE.Vector3();
  const toCam = new THREE.Vector3();
  const side = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const basis = new THREE.Matrix4();

  function update(t: number, cam: THREE.Camera) {
    uT.value = t;
    // the plane's local +y points at the sun; spin it about that axis so its face looks at the camera
    axis.copy(toSun);
    for (const s of shafts) {
      toCam.subVectors(cam.position, s.center);
      side.crossVectors(axis, toCam).normalize();
      normal.crossVectors(side, axis).normalize();
      basis.makeBasis(side, axis, normal);
      s.mesh.quaternion.setFromRotationMatrix(basis);
      s.mesh.position.copy(s.center);
    }
  }

  function setOpacity(a: number, color: number) {
    uOpacity.value = a;
    uColor.value.set(color);
    group.visible = a > 0.001;
  }

  return { group, update, setOpacity };
}
