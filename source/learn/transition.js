/**
 * Transition Shader and Fullscreen Quad.
 * Mirrors g3 and m3 from main.js.
 */

import * as THREE from '../three.js';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    gl_Position = vec4(position, 1.0);
    vUv = uv;
  }
`;

const fragmentShader = `
  uniform sampler2D uScene0;
  uniform sampler2D uScene1;
  uniform sampler2D uNoise;
  uniform sampler2D uPattern;

  uniform float uAspectRatio;
  uniform float uNoiseScale;
  uniform float uNoiseIntensity;
  uniform float uPatternScale;
  uniform float uPatternIntensity;
  uniform float uTransition;
  uniform float uVelocity;
  uniform float uOffset;
  uniform float uXAxis;
  uniform float uYAxis;
  uniform float uTime;

  varying vec2 vUv;

  float mapRange(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
  }

  void main() {
    vec2 aspectRatio = vec2(uAspectRatio, 1.0);
    
    // Create organic distortion using the noise and pattern textures
    vec2 noiseUv = vUv * aspectRatio;
    noiseUv *= uNoiseScale;
    noiseUv += uTime * 0.02; 
    vec2 noise = texture2D(uNoise, noiseUv).xy;
    
    vec2 patternUv = vUv * aspectRatio;
    patternUv *= uPatternScale;
    patternUv += (-1.0 + noise * 2.0) * uNoiseIntensity;
    vec2 pattern = texture2D(uPattern, patternUv).xy;

    // Map the 0-1 transition value to individual scene intensities
    float t0 = mapRange(uTransition, 0.0, 1.0, 0.0, 1.0);
    float t1 = mapRange(uTransition, 0.0, 1.0, 1.0, 0.0);
    
    vec2 uv0 = vUv;
    vec2 uv1 = vUv;

    // Apply X-Axis distortion based on movement velocity
    uv0.x += t1 * uOffset * uXAxis;
    uv0.x += (-1.0 + pattern.x * 2.0) * uPatternIntensity * t1 * uXAxis;

    uv1.x -= t0 * uOffset * uXAxis;
    uv1.x -= (-1.0 + pattern.x * 2.0) * uPatternIntensity * t0 * uXAxis;

    vec4 scene0 = texture2D(uScene0, uv0);
    vec4 scene1 = texture2D(uScene1, uv1);

    // Crossfade using a skewed mask
    float skew = clamp(uVelocity, -2.0, 2.0) * 0.1;
    float mask = smoothstep(uTransition, uTransition + 0.000001, vUv.x + vUv.y * skew);
    
    gl_FragColor = mix(scene0, scene1, mask);
    #include <encodings_fragment>
  }
`;

export function createTransitionMaterial(noiseTex, patternTex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uScene0: { value: null },
      uScene1: { value: null },
      uNoise: { value: noiseTex },
      uPattern: { value: patternTex },
      uAspectRatio: { value: 1.0 },
      uNoiseScale: { value: 1.5 },
      uNoiseIntensity: { value: 0.1 },
      uPatternScale: { value: 2.5 },
      uPatternIntensity: { value: 0.2 },
      uTransition: { value: 0.0 },
      uVelocity: { value: 0.0 },
      uOffset: { value: 0.3 },
      uXAxis: { value: 1.0 },
      uYAxis: { value: 0.0 },
      uTime: { value: 0.0 }
    },
    vertexShader,
    fragmentShader
  });
}
