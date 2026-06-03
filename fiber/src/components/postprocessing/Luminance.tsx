import * as THREE from "three";
import { Effect, BlendFunction } from "postprocessing";
import { forwardRef, useMemo, type Ref } from "react";

// ─── Shader ───────────────────────────────────────────────────────────────────

const fragmentShader = /* glsl */ `
  uniform float uThreshold;
  uniform float uSmoothing;
  uniform float uIntensity;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {

    // Perceived luminance — standard weights matching Three.js linearToRelativeLuminance
    float l = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));

    // Soft threshold — smoothstep feathers the edge instead of hard cutoff
    float contribution = smoothstep(uThreshold, uThreshold + uSmoothing, l);

    // Scale contribution by intensity
    vec3 color = inputColor.rgb * contribution * uIntensity;

    l = smoothstep(.8,1.0,l);

    outputColor = vec4(color, inputColor.a);
    outputColor = vec4(vec3(l), inputColor.a);
    // outputColor = vec4(1.0,0.0,0.0,1.0);
  }
`;

// ─── Effect Class ─────────────────────────────────────────────────────────────

type LuminanceEffectOptions = {
  blendFunction?: BlendFunction;
  threshold?: number;
  smoothing?: number;
  intensity?: number;
};

export class LuminanceEffectImpl extends Effect {
  constructor({
    blendFunction = BlendFunction.ADD,
    threshold = 0.5,
    smoothing = 0.08,
    intensity = 1.0,
  }: LuminanceEffectOptions = {}) {
    super("LuminanceEffect", fragmentShader, {
      blendFunction,
      uniforms: new Map<string, THREE.Uniform<any>>([
        ["uThreshold",  new THREE.Uniform(threshold)],
        ["uSmoothing",  new THREE.Uniform(smoothing)],
        ["uIntensity",  new THREE.Uniform(intensity)],
      ]),
    });
  }

  // ── Getters / setters so Tweakpane / Leva can bind directly ──

  get threshold(): number {
    return this.uniforms.get("uThreshold")!.value;
  }
  set threshold(v: number) {
    this.uniforms.get("uThreshold")!.value = v;
  }

  get smoothing(): number {
    return this.uniforms.get("uSmoothing")!.value;
  }
  set smoothing(v: number) {
    this.uniforms.get("uSmoothing")!.value = v;
  }

  get intensity(): number {
    return this.uniforms.get("uIntensity")!.value;
  }
  set intensity(v: number) {
    this.uniforms.get("uIntensity")!.value = v;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type LuminanceProps = {
  threshold?: number;
  smoothing?: number;
  intensity?: number;
  blendFunction?: BlendFunction;
};

// ─── React Component ──────────────────────────────────────────────────────────

export const LuminanceEffect = forwardRef<LuminanceEffectImpl, LuminanceProps>(
  function Luminance(
    {
      threshold  = 0.5,
      smoothing  = 0.08,
      intensity  = 1.0,
      blendFunction = BlendFunction.ADD,
    }: LuminanceProps,
    ref: Ref<LuminanceEffectImpl>,
  ) {
    const effect = useMemo(
      () => new LuminanceEffectImpl({ blendFunction, threshold, smoothing, intensity }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [], // create once
    );

    // Sync props → uniforms imperatively (same pattern as CircularTransition)
    useMemo(() => {
      effect.threshold = threshold;
      effect.smoothing = smoothing;
      effect.intensity = intensity;
    }, [threshold, smoothing, intensity, effect]);

    return <primitive ref={ref} object={effect} dispose={null} />;
  },
);