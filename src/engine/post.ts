// Post-processing, built with pmndrs/postprocessing (merges effects into as few shader passes as it can)
// and N8AO for ambient occlusion. Every effect can be switched off, which is how the benchmark measures
// what each one costs and how the adaptive quality drops the expensive ones on slow machines.
import * as THREE from "three";
import {
  BlendFunction,
  BloomEffect,
  DepthOfFieldEffect,
  Effect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  SMAAEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from "postprocessing";
import { N8AOPostPass } from "n8ao";
import type { Mood } from "./lighting";

export type PostFlags = { post: boolean; smaa: boolean; bloom: boolean; ao: boolean; dof: boolean; grade: boolean };
export const ALL_ON: PostFlags = { post: true, smaa: true, bloom: true, ao: true, dof: true, grade: true };

/** Split-tone colour grade: cool the shadows, warm the highlights, then saturation and contrast. */
class GradeEffect extends Effect {
  constructor() {
    super(
      "GradeEffect",
      /* glsl */ `
      uniform vec3 shadows;
      uniform vec3 highlights;
      uniform float saturation;
      uniform float contrast;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 c = inputColor.rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c *= mix(shadows, highlights, smoothstep(0.05, 0.75, l));
        c = mix(vec3(l), c, saturation);
        c = (c - 0.5) * contrast + 0.5;
        outputColor = vec4(max(c, 0.0), inputColor.a);
      }`,
      {
        uniforms: new Map<string, THREE.Uniform>([
          ["shadows", new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
          ["highlights", new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
          ["saturation", new THREE.Uniform(1)],
          ["contrast", new THREE.Uniform(1)],
        ]),
      }
    );
  }
  set(m: Mood) {
    (this.uniforms.get("shadows")!.value as THREE.Vector3).set(...m.grade.shadows);
    (this.uniforms.get("highlights")!.value as THREE.Vector3).set(...m.grade.highlights);
    this.uniforms.get("saturation")!.value = m.grade.saturation;
    this.uniforms.get("contrast")!.value = m.grade.contrast;
  }
}

/** Exposure, applied before tone mapping (the tone mapping effect does not read the renderer's exposure). */
class ExposureEffect extends Effect {
  constructor() {
    super(
      "ExposureEffect",
      "uniform float exposure;\nvoid mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) { outputColor = vec4(inputColor.rgb * exposure, inputColor.a); }",
      { uniforms: new Map<string, THREE.Uniform>([["exposure", new THREE.Uniform(1)]]) }
    );
  }
}

export type Post = {
  render: (dt: number) => void;
  setSize: (w: number, h: number) => void;
  setFlags: (f: Partial<PostFlags>) => void;
  flags: () => PostFlags;
  setMood: (m: Mood) => void;
  /** Depth of field focuses on this world point (the kitten). */
  focus: THREE.Vector3;
  dispose: () => void;
};

export function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, initial: PostFlags): Post {
  let flags = { ...initial };
  let mood: Mood | null = null;
  const focus = new THREE.Vector3(0, 1, 8);
  const size = new THREE.Vector2();

  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
  const renderPass = new RenderPass(scene, camera);

  const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.82, luminanceSmoothing: 0.25, intensity: 0.85, radius: 0.72 });
  // a wide focus range keeps the house and the kitten sharp; only the sprig at the lens and the far sky soften
  const dof = new DepthOfFieldEffect(camera, { focusDistance: 9, focusRange: 14, bokehScale: 2.8, resolutionScale: 0.5 });
  const exposure = new ExposureEffect();
  dof.target = focus;
  const toneMap = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
  const grade = new GradeEffect();
  const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.5 });
  const grain = new NoiseEffect({ blendFunction: BlendFunction.SOFT_LIGHT, premultiply: false });
  grain.blendMode.opacity.value = 0.12;
  const smaa = new SMAAEffect();
  let ao: N8AOPostPass | null = null;

  function build() {
    composer.removeAllPasses();
    renderer.getSize(size);
    composer.addPass(renderPass);
    if (flags.ao) {
      ao ??= new N8AOPostPass(scene, camera, size.x, size.y);
      ao.configuration.aoRadius = 0.9;
      ao.configuration.distanceFalloff = 1.0;
      ao.configuration.intensity = 2.6;
      ao.configuration.halfRes = true;
      ao.configuration.gammaCorrection = false;
      ao.setQualityMode("Low");
      composer.addPass(ao);
    }
    // depth of field blurs neighbouring pixels, so it needs its own pass before the merged one
    if (flags.dof) composer.addPass(new EffectPass(camera, dof));
    const effects: Effect[] = [];
    if (flags.smaa) effects.push(smaa);
    if (flags.bloom) effects.push(bloom);
    effects.push(exposure, toneMap);
    if (flags.grade) effects.push(grade, vignette, grain);
    composer.addPass(new EffectPass(camera, ...effects));
    renderer.toneMapping = THREE.NoToneMapping;
  }

  function apply() {
    if (flags.post) build();
    else renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }
  apply();

  return {
    render: (dt) => {
      if (flags.post) composer.render(dt);
      else renderer.render(scene, camera);
    },
    setSize: (w, h) => {
      composer.setSize(w, h, false);
    },
    setFlags: (f) => {
      flags = { ...flags, ...f };
      apply();
      if (mood) setMoodInternal(mood);
    },
    flags: () => ({ ...flags }),
    setMood: (m) => setMoodInternal(m),
    focus,
    dispose: () => composer.dispose(),
  };

  function setMoodInternal(m: Mood) {
    mood = m;
    grade.set(m);
    bloom.luminanceMaterial.threshold = m.bloom.threshold;
    bloom.intensity = m.bloom.intensity;
    renderer.toneMappingExposure = m.exposure;
    exposure.uniforms.get("exposure")!.value = m.exposure;
  }
}
