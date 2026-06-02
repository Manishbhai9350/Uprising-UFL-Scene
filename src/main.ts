import * as THREE from "three";
import "./style.css";
import { Pane } from "tweakpane";
import {
  DRACOLoader,
  GLTFLoader,
  OrbitControls,
  Reflector,
} from "three/examples/jsm/Addons.js";
import { Tab } from "three/examples/jsm/inspector/ui/Tab.js";
import {
  EffectComposer,
  RenderPass,
  BloomEffect,
  EffectPass,
  VignetteEffect,
  ToneMappingEffect,
  ToneMappingMode,
  KernelSize,
  NoiseEffect,
  BlendFunction,
} from "postprocessing";

// import {
//   EffectComposer,
//   ShaderPass,
//   BloomEffect,
//   RenderPass,
// } from "postprocessing";

const canvas = document.querySelector("canvas")!;

const pane = new Pane();

canvas.width = innerWidth;
canvas.height = innerHeight;

const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setClearColor(0x000000);
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const camera = new THREE.PerspectiveCamera(
  55,
  innerWidth / innerHeight,
  1,
  1000,
);
camera.position.set(0, 0.2, 5);

scene.add(camera);

const Manager = new THREE.LoadingManager();
const DRACO = new DRACOLoader(Manager);
const Tex = new THREE.TextureLoader(Manager);
const GLB = new GLTFLoader(Manager);

DRACO.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
GLB.setDRACOLoader(DRACO);

const PanelMaterial = new THREE.MeshStandardMaterial({
  color: "#0e9cff",
  emissive: "#69d0ff",
  emissiveIntensity: 6.5,
  roughness: 1,
  metalness: 0,
  toneMapped: false,
  // blending: THREE.AdditiveBlending
});

pane.addBinding(PanelMaterial, "color", {
  label: "Panel Color",
  color: { type: "float" },
});
pane.addBinding(PanelMaterial, "emissive", {
  label: "Panel Emissive",
  color: { type: "float" },
});
pane.addBinding(PanelMaterial, "emissiveIntensity", {
  label: "Panel Emissive Intensity",
  min: 0,
  max: 10,
});

GLB.load("/models/ufl-panels.glb", (glb) => {
  const panels = glb.scene;

  panels.scale.setScalar(1.5);

  panels.traverse((node) => {
    if (node.isMesh) {
      node.material = PanelMaterial;
    }
  });

  scene.add(panels);
});
GLB.load("/models/ufl.glb", (glb) => {
  const ufl = glb.scene;
  scene.add(ufl);
  ufl.traverse((node) => {
    if (node.isMesh) {
      // node.material = new THREE.MeshBasicMaterial({
      //   color: "red",
      // });
    }
  });
});

const NormalMap = Tex.load("/textures/normal-map.jpg");

NormalMap.wrapS = NormalMap.wrapT = THREE.RepeatWrapping;
NormalMap.repeat.set(5, 5);

// Define custom shader
const reflectorShader = {
  uniforms: {
    color: { value: new THREE.Color(0x7f7f7f) },
    tDiffuse: { value: null },
    tDepth: { value: null },
    textureMatrix: { value: new THREE.Matrix4() },
    cameraNear: { value: 0.1 }, // Set actual camera near
    cameraFar: { value: 1000 }, // Set actual camera far
    uNormal: { value: NormalMap },
    uNormalScale: { value: new THREE.Vector2(0.01, 0.01) },
  },
  vertexShader: `
  uniform mat4 textureMatrix;
  varying vec4 vUv;        // projected reflection UV
  varying vec2 vSurfaceUv; // actual surface UV for normal map
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    vUv = textureMatrix * vec4(position, 1.0);
    vSurfaceUv = uv;  // ← actual mesh UV attribute, not projected
    vNormal = normalize(normalMatrix * normal);
    vViewPosition = -mvPosition.xyz;
  }
`,

  fragmentShader: `
  uniform vec3 color;
  uniform sampler2D tDiffuse;
  uniform sampler2D uNormal;
  uniform vec2 uNormalScale;

  varying vec4 vUv;
  varying vec2 vSurfaceUv;  // ← use this for normal map
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  #include <packing>

  vec3 perturbNormal2Arb(vec3 eye_pos, vec3 surf_norm, vec3 mapN, vec2 surfUv) {
    vec3 q0 = vec3(dFdx(eye_pos.x), dFdx(eye_pos.y), dFdx(eye_pos.z));
    vec3 q1 = vec3(dFdy(eye_pos.x), dFdy(eye_pos.y), dFdy(eye_pos.z));
    vec2 st0 = dFdx(surfUv);  // ← screen-space derivatives of SURFACE UV
    vec2 st1 = dFdy(surfUv);  // ← not the projected reflection UV

    float scale = sign(st1.t * st0.s - st0.t * st1.s);
    vec3 S = normalize((q0 * st1.t - q1 * st0.t) * scale);
    vec3 T = normalize((-q0 * st1.s + q1 * st0.s) * scale);
    vec3 N = normalize(surf_norm);

    mat3 tsn = mat3(S, T, N);
    vec3 finalNormal = normalize(tsn * vec3(mapN.xy * uNormalScale, mapN.z));
    return gl_FrontFacing ? finalNormal : -finalNormal;
  }

  void main() {
    // Sample normal map using SURFACE UVs, not projected UVs
    vec3 mapN = texture2D(uNormal, vSurfaceUv).xyz * 2.0 - 1.0;

    vec3 perturbedNormal = perturbNormal2Arb(-vViewPosition, vNormal, mapN, vSurfaceUv);

    // Reflection UV in 2D
    vec2 reflectionUv = vUv.xy / vUv.w;

    // Distort reflection by perturbed normal — only xy, not full projection
    vec2 distortedUv = reflectionUv + normalize(perturbedNormal.xy)  * uNormalScale;

    vec4 base = texture2D(tDiffuse, distortedUv);
    gl_FragColor = vec4(base.rgb * color, 1.0);
  }
`,
};

const reflector = new Reflector(new THREE.PlaneGeometry(10, 10), {
  color: 0xffffff,
  clipBias: 0.003,
  textureWidth: 1024 * devicePixelRatio,
  textureHeight: 1024 * devicePixelRatio,
  shader: reflectorShader,
});
console.log(reflector.material);

reflector.rotation.x = -Math.PI / 2;
reflector.position.y = -0.4;

const refDebug = {
  repeat: 5,
  scale: 0.01,
};

const refFolder = pane.addFolder({ title: "Reflector Params" });

refFolder
  .addBinding(refDebug, "repeat", {
    min: 1,
    max: 10,
    label: "Normal Repeat",
  })
  .on("change", ({ value }) => {
    NormalMap.repeat.set(value, value);
    NormalMap.needsUpdate = true;
  });
refFolder
  .addBinding(refDebug, "scale", {
    min: 0,
    max: 0.4,
    label: "Normal Scale",
  })
  .on("change", ({ value }) => {
    reflector.material.uniforms.uNormalScale.value.set(value, value);
  });

// reflector.material = new THREE.MeshBasicMaterial({color:'purple'})

pane.addBinding(reflector.position, "y", {
  max: -0.3,
  min: -0.45,
});

scene.add(reflector);

scene.add(new THREE.AmbientLight(0xffffff, 10));

const controls = new OrbitControls(camera, canvas);

// Postprocessing

const composer = new EffectComposer(renderer, {
  frameBufferType: THREE.HalfFloatType,
});
composer.addPass(new RenderPass(scene, camera));

// Dual layer Kawase bloom — same as weareuprising
const bloomCore = new BloomEffect({
  mipmapBlur: true,
  luminanceThreshold: 0.5,
  luminanceSmoothing: 0.08,
  intensity: 1.2,
  kernelSize: KernelSize.LARGE,
});

const bloomHalo = new BloomEffect({
  mipmapBlur: true,
  luminanceThreshold: 0.3,
  luminanceSmoothing: 0.15,
  intensity: 0.6,
  kernelSize: KernelSize.HUGE,
});

const vignette = new VignetteEffect({
  offset: 0.22,
  darkness: 0.85,
});

// const toneMapping = new ToneMappingEffect({
//   mode: ToneMappingMode.ACES_FILMIC,
// });

const grain = new NoiseEffect({
  blendFunction: BlendFunction.ADD, // additive — brightens, especially in glow areas
  premultiply: false,
});
grain.blendMode.opacity.value = 0.08;

pane.addBinding(grain.blendMode.opacity, "value", {
  min: 0,
  max: 0.2,
  label: "Grain Opacity",
});

// ── Tweakpane ──────────────────────────────────────────────────────────────

const pp = pane.addFolder({ title: "Postprocessing", expanded: true });

pp.hidden = true;

// Bloom core
const coreFolder = pp.addFolder({
  title: "Bloom Core (tight)",
  expanded: true,
});
const coreParams = { threshold: 0.9, smoothing: 0.05, intensity: 0.8 };

coreFolder
  .addBinding(coreParams, "threshold", { min: 0, max: 1, step: 0.01 })
  .on("change", ({ value }) => {
    bloomCore.luminanceMaterial.threshold = value;
  });
coreFolder
  .addBinding(coreParams, "smoothing", { min: 0, max: 1, step: 0.01 })
  .on("change", ({ value }) => {
    bloomCore.luminanceMaterial.smoothing = value;
  });
coreFolder
  .addBinding(coreParams, "intensity", { min: 0, max: 2, step: 0.05 })
  .on("change", ({ value }) => {
    bloomCore.intensity = value;
  });

// Bloom halo
const haloFolder = pp.addFolder({ title: "Bloom Halo (wide)", expanded: true });
const haloParams = { threshold: 0.6, smoothing: 0.1, intensity: 0.4 };

haloFolder
  .addBinding(haloParams, "threshold", { min: 0, max: 1, step: 0.01 })
  .on("change", ({ value }) => {
    bloomHalo.luminanceMaterial.threshold = value;
  });
haloFolder
  .addBinding(haloParams, "smoothing", { min: 0, max: 1, step: 0.01 })
  .on("change", ({ value }) => {
    bloomHalo.luminanceMaterial.smoothing = value;
  });
haloFolder
  .addBinding(haloParams, "intensity", { min: 0, max: 5, step: 0.05 })
  .on("change", ({ value }) => {
    bloomHalo.intensity = value;
  });

// Vignette
const vigFolder = pp.addFolder({ title: "Vignette", expanded: false });
const vigParams = { offset: 0.22, darkness: 0.85 };

vigFolder
  .addBinding(vigParams, "offset", { min: 0, max: 1, step: 0.01 })
  .on("change", ({ value }) => {
    vignette.offset = value;
  });
vigFolder
  .addBinding(vigParams, "darkness", { min: 0, max: 1, step: 0.01 })
  .on("change", ({ value }) => {
    vignette.darkness = value;
  });

const timer = new THREE.Timer();

let elt = timer.getElapsed();

function animate() {
  const tm = timer.getElapsed();
  const DT = tm - elt;
  elt = tm;

  composer.render(DT);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

window.addEventListener("resize", resize);
