import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { KernelSize } from "postprocessing";
import { useControls } from "leva";
import { LuminanceEffect } from "./postprocessing/Luminance";

const Effects = () => {
  const { threshold, smoothing, intensity, kernelSize, mipmapBlur } =
    useControls("Bloom", {
      threshold: { value: 0.21, min: 0, max: 1, step: 0.01 },
      smoothing: { value: 0.23, min: 0, max: 1, step: 0.01 },
      intensity: { value: 1.8, min: 0, max: 5, step: 0.05 },
      mipmapBlur: true,
      kernelSize: {
        value: KernelSize.SMALL,
        options: {
          Small: KernelSize.SMALL,
          Medium: KernelSize.MEDIUM,
          Large: KernelSize.LARGE,
          Huge: KernelSize.HUGE,
        },
      },
    });

  const { LumIntenstiy, LumSmoothing, LumThreshold } = useControls(
    "Lume Props",
    {
      LumThreshold: {
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.001,
      },
      LumSmoothing: {
        value: 0.08,
        min: 0,
        max: 1,
        step: 0.001,
      },
      LumIntenstiy: {
        value: 1,
        min: 0,
        max: 1,
        step: 0.001,
      },
    },
  );

  return (
    <EffectComposer>
      {/* <Bloom
        luminanceThreshold={threshold}
        luminanceSmoothing={smoothing}
        intensity={intensity}
        mipmapBlur={mipmapBlur}
        kernelSize={kernelSize}
      /> */}
        <Bloom
          mipmapBlur
          luminanceThreshold={0.5}
          luminanceSmoothing={0.08}
          intensity={4.0}
        ></Bloom>
      <LuminanceEffect
        threshold={LumThreshold}
        intensity={LumIntenstiy}
        smoothing={LumIntenstiy}
      />
    </EffectComposer>
  );
};

export default Effects;
