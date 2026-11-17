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
import { Pane } from "tweakpane";

export async function setupComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
) {
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
  });

  composer.addPass(new RenderPass(scene, camera));

  const bloomParams = {
    intensity: 1.5,
    luminanceThreshold: 0.76,
  };

  const grainParams = {
    opacity: 0.6,
  };

  const hsParams = {
    hue: 0,
    saturation: -0.05,
  };

  const bloomHalo = new BloomEffect({
    mipmapBlur: true,
    luminanceThreshold: bloomParams.luminanceThreshold,
    luminanceSmoothing: 0.86,
    intensity: bloomParams.intensity,
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

  const colorCorrection = new HueSaturationEffect({
    hue: hsParams.hue,
    saturation: hsParams.saturation,
  });

  const grain = new NoiseEffect({
    blendFunction: BlendFunction.ADD,
    premultiply: true,
  });
  grain.blendMode.opacity.value = grainParams.opacity;

  const result = await new LUTCubeLoader().loadAsync("/textures/lut.cube");
  const lutTexture = LookupTexture.from(result.texture3D || result.texture);
  const lutEffect = new LUT3DEffect(lutTexture);

  const effects = new EffectPass(
    camera,
    bloomHalo,
    toneMapping,
    colorCorrection,
    grain,
    lutEffect,
  );

  composer.addPass(effects);

  function addPane(pane: Pane) {
    const folder = pane.addFolder({ title: "Postprocessing" });

    const bloomFolder = folder.addFolder({ title: "Bloom",expanded:false });
    bloomFolder
      .addBinding(bloomParams, "intensity", { min: 0, max: 5, step: 0.1 })
      .on("change", (ev) => {
        bloomHalo.intensity = ev.value;
      });
    bloomFolder
      .addBinding(bloomParams, "luminanceThreshold", {
        min: 0,
        max: 1,
        step: 0.01,
      })
      .on("change", (ev) => {
        bloomHalo.luminanceThreshold = ev.value;
      });

    const grainFolder = folder.addFolder({ title: "Film Grain",expanded:false });
    grainFolder
      .addBinding(grainParams, "opacity", { min: 0, max: 1, step: 0.05 })
      .on("change", (ev) => {
        grain.blendMode.opacity.value = ev.value;
      });

    const colorFolder = folder.addFolder({ title: "Color Correction",expanded:false });
    colorFolder
      .addBinding(hsParams, "hue", { min: -Math.PI, max: Math.PI, step: 0.01 })
      .on("change", (ev) => {
        colorCorrection.hue = ev.value;
      });
    colorFolder
      .addBinding(hsParams, "saturation", { min: -1, max: 1, step: 0.01 })
      .on("change", (ev) => {
        colorCorrection.saturation = ev.value;
      });
  }

  return { composer, bloomHalo, vignette, grain, addPane };
}
