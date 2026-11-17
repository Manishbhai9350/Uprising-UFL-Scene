import * as THREE from "three";
import {
  EffectComposer,
  RenderPass,
  BloomEffect,
  VignetteEffect,
  NoiseEffect,
  BlendFunction,
  KernelSize,
  EffectPass,
  ToneMappingEffect,
  HueSaturationEffect,
  LUT3DEffect,
  LookupTexture,
} from "postprocessing";
import { LUTCubeLoader } from "three-stdlib";

export async function setupComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
) {
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
  });

  composer.addPass(new RenderPass(scene, camera));

  const bloomHalo = new BloomEffect({
    mipmapBlur: true,
    luminanceThreshold: 0.76,
    luminanceSmoothing: 0.86,
    intensity: 1.8,
    kernelSize: KernelSize.MEDIUM,
  });

  const vignette = new VignetteEffect({
    offset: 0.4,
    darkness: 0.6,
  });

  const toneMapping = new ToneMappingEffect({
    adaptive: true,
    middleGrey: 0.4,
  });

  const ColorCorrection = new HueSaturationEffect({
    hue: 0,
    saturation: -0.05,
  });

  const grain = new NoiseEffect({
    blendFunction: BlendFunction.ADD,
    premultiply: true,
  });
  grain.blendMode.opacity.value = 0.6;

  const result = await new LUTCubeLoader().loadAsync("/textures/lut.cube");
  
  // Ensure it is properly formatted as a 3D LookupTexture
  const lutTexture = LookupTexture.from(result.texture3D || result.texture);

  const lutEffect = new LUT3DEffect(lutTexture);

  const effects = new EffectPass(
    camera,
    bloomHalo,
    vignette,
    toneMapping,
    ColorCorrection,
    grain,
    lutEffect,
  );

  composer.addPass(effects);

  // Add passes via EffectPass if needed, or manage via custom workflow
  return { composer, bloomHalo, vignette, grain };
}
