import { r as React } from "../react.js";
import {
  B as Bloom,
  c as LUT,
  N as Noise,
  V as Vignette,
  T as ToneMapping,
  H as ColorCorrection,
  d as EffectComposer,
  E as Effect,
  R as BloomResolution,
  K as KernelSize,
} from "../react-fiber.js";
import { aH as Uniform } from "../three.js";
import Fluid from "./fluid.js";

const createElement = React.createElement;

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
  return createElement("primitive", { ref, object: effect, dispose: null });
});

export default function HomepageEffects({
  assets,
  settings,
  isIosPhone,
  multisampling,
  sceneId,
}) {
  const lut = assets.get(settings.lut.texture);

  if (!lut) {
    throw new Error("Post-processing color-grading LUT was not loaded.");
  }

  return createElement(
    EffectComposer,
    {
      multisampling,
      disableNormalPass: true,
    },
    // createElement(RGBSplit, {
    //   intensity: settings.rgbSplit.intensity,
    // }),
    // !isIosPhone &&
    //   createElement(Fluid, {
    //     settings: settings.fluid,
    //   }),
    // createElement(Bloom, {
    //   mipmapBlur: true,
    //   width: BloomResolution.AUTO_SIZE,
    //   height: BloomResolution.AUTO_SIZE,
    //   kernelSize: KernelSize.MEDIUM,
    //   intensity:
    //     settings.bloom.intensity + settings.bloom.intensityOffset,
    //   luminanceThreshold: settings.bloom.luminanceThreshold,
    //   luminanceSmoothing: settings.bloom.luminanceSmoothing,
    // }),
    // createElement(Vignette, {
    //   offset: settings.vignette.offset,
    //   darkness: settings.vignette.darkness,
    // }),
    // createElement(ToneMapping, {
    //   resolution: 512,
    //   middleGrey: settings.toneMapping.middleGrey,
    //   adaptive: settings.toneMapping.adaptive,
    // }),
    // createElement(ColorCorrection, {
    //   hue: settings.colorCorrection.hue,
    //   saturation: settings.colorCorrection.saturation,
    // }),
    // createElement(Noise, {
    //   opacity: settings.noise.opacity,
    //   premultiply: settings.noise.premultiply,
    // }),
    // !isIosPhone &&
    //   createElement(LUT, {
    //     lut,
    //   }),
  );
}
