import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  Noise,
  ToneMapping,
  ColorAverage,
  LUT,
  HueSaturation,
} from "@react-three/postprocessing";
import {
  BlendFunction,
  KernelSize,
  ToneMappingMode,
  LUTEffect,
} from "postprocessing";
import { useControls } from "leva";
import { useLoader } from "@react-three/fiber";
import { LUTCubeLoader } from "three-stdlib";
import { Vector2 } from "three";

// ---------------------------------------------------------------------------
// LUT loader — mirrors main.js lut.cube asset load
// Put your lut.cube file in /public/textures/lut.cube (or adjust path below)
// ---------------------------------------------------------------------------
const LUTPass = () => {
  const lut = useLoader(LUTCubeLoader, "/lut.cube");
  const { enable } = useControls("LUT", {
    enable: true,
  });

  return (
    <LUT
      lut={lut.texture}
      blendFunction={enable ? BlendFunction.NORMAL : BlendFunction.SKIP}
    />
  );
};

// ---------------------------------------------------------------------------
// Full postprocessing pipeline matching weareuprising.com
// Order matters — runs top to bottom through the EffectComposer
// ---------------------------------------------------------------------------
const Effects = () => {

  // Bloom — only emissive panels cross the threshold and bloom
  const bloom = useControls("Bloom", {
    intensity:            { value: 7.7,  min: 0, max: 10,  step: 0.001 },
    luminanceThreshold:   { value: 0.44, min: 0, max: 2,   step: 0.001 },
    luminanceSmoothing:   { value: 0.24,  min: 0, max: 2,   step: 0.001 },
    mipmapBlur:           true,
    enable:               true,
    kernelSize: {
      value: KernelSize.SMALL,
      options: {
        Small:  KernelSize.SMALL,
        Medium: KernelSize.MEDIUM,
        Large:  KernelSize.LARGE,
        Huge:   KernelSize.HUGE,
      },
    },
  });

  // RGB Split — chromatic aberration, driven by scroll velocity in original
  // Animate `intensity` via useFrame to match scroll speed
  const rgbSplit = useControls("RGBSplit", {
    intensity: { value: 0.002, min: 0, max: 0.02, step: 0.0001 },
    enable:    false,
  });

  // Vignette — darkens edges, pushes focus to center portal
  const vignette = useControls("Vignette", {
    offset:   { value: 0.35, min: 0, max: 1, step: 0.01 },
    darkness: { value: 0.7,  min: 0, max: 1, step: 0.01 },
    enable:   false,
  });

  // Tone Mapping — controls overall exposure/midtones
  const toneMapping = useControls("ToneMapping", {
    middleGrey: { value: 0.6,  min: 0, max: 1,    step: 0.01 },
    maxLuminance:{ value: 16.0, min: 1, max: 32.0, step: 0.5 },
    enable:     false,
  });

  // Color Correction — hue shifts everything to teal, saturation boost
  const colorCorrection = useControls("ColorCorrection", {
    hue:        { value: -0.05, min: -Math.PI, max: Math.PI, step: 0.01 },
    saturation: { value: 0.1,   min: -1,       max: 1,       step: 0.01 },
    enable:     false,
  });

  // Noise — film grain layered additively on top
  const noise = useControls("Noise", {
    opacity:    { value: 0.06, min: 0, max: 1,    step: 0.01 },
    premultiply:false,
    enable:     false,
  });

  return (
    <EffectComposer>

      {/* 1. RGB Split — chromatic aberration (diagonal at PI/4 like original) */}
      <ChromaticAberration
        offset={new Vector2(rgbSplit.intensity, rgbSplit.intensity)}
        blendFunction={rgbSplit.enable ? BlendFunction.NORMAL : BlendFunction.SKIP}
      />

      {/* 2. Bloom — high threshold so only emissive panels bloom */}
      <Bloom
        intensity={bloom.intensity}
        luminanceThreshold={bloom.luminanceThreshold}
        luminanceSmoothing={bloom.luminanceSmoothing}
        mipmapBlur={bloom.mipmapBlur}
        kernelSize={bloom.kernelSize}
        blendFunction={bloom.enable ? BlendFunction.ADD : BlendFunction.SKIP}
      />

      {/* 3. Vignette — edge darkening pushes contrast to center */}
      <Vignette
        offset={vignette.offset}
        darkness={vignette.darkness}
        blendFunction={vignette.enable ? BlendFunction.NORMAL : BlendFunction.SKIP}
      />

      {/* 4. Tone Mapping — Reinhard style, controls midtone exposure */}
      <ToneMapping
        mode={ToneMappingMode.REINHARD2}
        middleGrey={toneMapping.middleGrey}
        maxLuminance={toneMapping.maxLuminance}
        blendFunction={toneMapping.enable ? BlendFunction.NORMAL : BlendFunction.SKIP}
      />

      {/* 5. Color Correction — hue toward teal, saturation boost */}
      {/* R3F postprocessing doesn't expose ColorCorrection directly,   */}
      {/* use a custom effect or the HueSaturation effect instead:      */}
      <HueSaturation                                                
        hue={colorCorrection.hue}                                  
        saturation={colorCorrection.saturation}                    
        blendFunction={colorCorrection.enable ? BlendFunction.NORMAL : BlendFunction.SKIP}
      />                                                            

      {/* 6. Noise — film grain, additive blend keeps it subtle */}
      <Noise
        opacity={noise.opacity}
        premultiply={noise.premultiply}
        blendFunction={noise.enable ? BlendFunction.ADD : BlendFunction.SKIP}
      />

      {/* 7. LUT — color grade, locks everything to teal/cyan palette  */}
      {/* Uncomment once you have lut.cube in /public/textures/         */}
      <LUTPass />

    </EffectComposer>
  );
};

export default Effects;

// ---------------------------------------------------------------------------
// HOW TO USE THE LUT FILE
// ---------------------------------------------------------------------------
// 1. Copy lut.cube from the downloaded site assets into your project:
//    /public/textures/lut.cube
//
// 2. Install three-stdlib if not already:
//    npm install three-stdlib
//
// 3. Uncomment <LUTPass /> above and the LUTPass component will handle
//    loading and applying it automatically via useLoader
//
// 4. The LUT is the single biggest visual difference between your scene
//    and theirs — enable it last once everything else looks right
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// HOW TO ANIMATE RGB SPLIT WITH SCROLL (matching original behavior)
// ---------------------------------------------------------------------------
// In your parent component or a separate hook:
//
// import { useFrame } from "@react-three/fiber"
// import { useRef } from "react"
//
// const chromaticRef = useRef()
//
// useFrame(() => {
//   const scrollVelocity = getScrollVelocity()  // your scroll store value
//   const intensity = Math.abs(scrollVelocity) * 0.0001
//   if (chromaticRef.current) {
//     chromaticRef.current.offset.set(intensity, intensity)
//   }
// })
//
// Then pass ref={chromaticRef} to <ChromaticAberration>
// ---------------------------------------------------------------------------