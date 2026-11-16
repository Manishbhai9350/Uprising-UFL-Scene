import * as React from "react";
import {
  Bloom,
  EffectComposer,
  HueSaturation as ColorCorrection,
  LUT,
  Noise,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import {
  Effect,
  KernelSize,
  Resolution as BloomResolution,
} from "postprocessing";
import { Uniform } from "three";
import { useControls, folder } from "leva";
import Fluid from "./fluid";

const rgbSplitShader = `
  uniform float intensity;

  vec4 splitRGB(sampler2D source, vec2 uv, float angle, float amount) {
    vec2 offset = vec2(cos(angle), sin(angle)) * amount;
    vec4 red = texture2D(source, uv + offset);
    vec4 green = texture2D(source, uv);
    vec4 blue = texture2D(source, uv - offset);
    return vec4(red.r, green.g, blue.b, green.a);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    outputColor = splitRGB(inputBuffer, uv, PI / 4.0, intensity);
  }
`;

class RGBSplitEffect extends Effect {
  constructor(intensity) {
    super("RGBSplitEffect", rgbSplitShader, {
      uniforms: new Map([["intensity", new Uniform(intensity * 0.01)]]),
    });
  }
}

const RGBSplit = React.forwardRef(function RGBSplit({ intensity }, ref) {
  const effect = React.useMemo(
    () => new RGBSplitEffect(intensity),
    [intensity],
  );
  return <primitive ref={ref} object={effect} dispose={null} />;
});

export default function HomepageEffects({
  assets,
  settings,
  isIosPhone,
  multisampling,
}) {
  const rawLut = assets.get(settings.lut.texture);

  if (!rawLut) {
    throw new Error("Post-processing color-grading LUT was not loaded.");
  }

  const lutTexture = rawLut.texture || rawLut.texture3D || rawLut;

  // Leva controls with proper foldering for every post-processing effect prop
  const levaProps = useControls("Post-Processing Effects", {
    "RGB Split": folder({
      rgbIntensity: {
        value: settings.rgbSplit.intensity,
        min: 0,
        max: 50,
        step: 0.1,
        label: "Intensity",
      },
    }),
    "Fluid Simulation": folder({
      fluidEnabled: { value: !isIosPhone, label: "Enabled" },
      iterations: {
        value: settings.fluid.iterations,
        min: 1,
        max: 20,
        step: 1,
      },
      densityDissipation: {
        value: settings.fluid.densityDissipation,
        min: 0.9,
        max: 1,
        step: 0.001,
      },
      velocityDissipation: {
        value: settings.fluid.velocityDissipation,
        min: 0.9,
        max: 1,
        step: 0.001,
      },
      curlStrength: {
        value: settings.fluid.curlStrength,
        min: 0,
        max: 100,
        step: 1,
      },
      radius: { value: settings.fluid.radius, min: 0.01, max: 1, step: 0.01 },
    }),
    Bloom: folder({
      bloomIntensity: {
        value: settings.bloom.intensity + settings.bloom.intensityOffset,
        min: 0,
        max: 10,
        step: 0.01,
        label: "Intensity",
      },
      luminanceThreshold: {
        value: settings.bloom.luminanceThreshold,
        min: 0,
        max: 1,
        step: 0.01,
      },
      luminanceSmoothing: {
        value: settings.bloom.luminanceSmoothing,
        min: 0,
        max: 1,
        step: 0.01,
      },
    }),
    Vignette: folder({
      vignetteOffset: {
        value: settings.vignette.offset,
        min: 0,
        max: 1,
        step: 0.01,
        label: "Offset",
      },
      vignetteDarkness: {
        value: settings.vignette.darkness,
        min: 0,
        max: 1,
        step: 0.01,
        label: "Darkness",
      },
    }),
    "Tone Mapping": folder({
      middleGrey: {
        value: settings.toneMapping.middleGrey,
        min: 0,
        max: 2,
        step: 0.01,
      },
      adaptive: { value: settings.toneMapping.adaptive },
    }),
    "Color Correction": folder({
      hue: {
        value: settings.colorCorrection.hue,
        min: -Math.PI,
        max: Math.PI,
        step: 0.01,
      },
      saturation: {
        value: settings.colorCorrection.saturation,
        min: -1,
        max: 1,
        step: 0.01,
      },
    }),
    Noise: folder({
      noiseOpacity: {
        value: settings.noise.opacity,
        min: 0,
        max: 1,
        step: 0.01,
        label: "Opacity",
      },
    }),
  });

  return (
    <EffectComposer multisampling={multisampling} disableNormalPass={true}>
      <RGBSplit intensity={levaProps.rgbIntensity} />
      {levaProps.fluidEnabled && (
        <Fluid
          settings={{
            ...settings.fluid,
            iterations: levaProps.iterations,
            densityDissipation: levaProps.densityDissipation,
            velocityDissipation: levaProps.velocityDissipation,
            curlStrength: levaProps.curlStrength,
            radius: levaProps.radius,
          }}
        />
      )}
      <Bloom
        mipmapBlur={true}
        width={BloomResolution.AUTO_SIZE}
        height={BloomResolution.AUTO_SIZE}
        kernelSize={KernelSize.MEDIUM}
        intensity={levaProps.bloomIntensity}
        luminanceThreshold={levaProps.luminanceThreshold}
        luminanceSmoothing={levaProps.luminanceSmoothing}
      />
      <Vignette
        offset={levaProps.vignetteOffset}
        darkness={levaProps.vignetteDarkness}
      />
      <ToneMapping
        resolution={512}
        middleGrey={levaProps.middleGrey}
        adaptive={levaProps.adaptive}
      />
      <ColorCorrection hue={levaProps.hue} saturation={levaProps.saturation} />
      <Noise
        opacity={levaProps.noiseOpacity}
        premultiply={settings.noise.premultiply}
      />
      {!isIosPhone && <LUT lut={lutTexture} />}
    </EffectComposer>
  );
}
