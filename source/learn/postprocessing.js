/**
 * EffectComposer Pipeline Definition.
 * Each method returns the configuration for a pass in the Z3 pipeline.
 */

export class PostProcessingPipeline {
  /** 1. RGB Split: Chromatic aberration based on motion. */
  getRGBSplit(intensity = 1) {
    return { intensity: intensity * 0.01 };
  }

  /** 2. Fluid: Warps the final image using the fluid simulation grid. */
  getFluidEffect() {
    return {
      curlStrength: 30,
      radius: 0.25,
      pressureDissipation: 0.8
    };
  }

  /** 3. Bloom: High-quality mipmapped blur for emissive glows. */
  getBloom() {
    return {
      intensity: 1.5,
      luminanceThreshold: 0.9,
      luminanceSmoothing: 0.02
    };
  }

  /** 4. Vignette: Soft cinematic framing. */
  getVignette() {
    return { offset: 0.5, darkness: 0.5 };
  }

  /** 5. Tone Mapping: Exposure and HDR-to-LDR mapping. */
  getToneMapping() {
    return { middleGrey: 0.6, adaptive: true };
  }

  /** 6. Color Correction: Final hue/saturation adjustments. */
  getColorCorrection() {
    return { hue: 0, saturation: 0.1 };
  }

  /** 7. Noise: Fine grain to prevent banding. */
  getNoise() {
    return { opacity: 0.04 };
  }

  /** 8. LUT: Color grading via 3D lookup table. */
  getLUT(lutTexture) {
    return { lut: lutTexture };
  }
}
